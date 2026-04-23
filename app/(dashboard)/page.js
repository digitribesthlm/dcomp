import { getDatabase, getCollectionName } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'
import MarketOverviewClient from './MarketOverviewClient'

export const dynamic = 'force-dynamic'

// Strip the TLD to get the brand name:  leroymerlin.fr → leroymerlin,  d-cor.se → d-cor
function extractBrand(domain) {
  if (!domain) return ''
  const parts = domain.toLowerCase().split('.')
  if (parts.length < 2) return domain
  // Handle two-part TLDs like .co.uk, .com.au
  const secondToLast = parts[parts.length - 2]
  const shortSlds = new Set(['co','com','net','org','gov','edu','ac'])
  if (parts.length > 2 && shortSlds.has(secondToLast)) {
    return parts.slice(0, -2).join('.')
  }
  return parts.slice(0, -1).join('.')
}

export default async function MarketOverviewPage({ searchParams }) {
  const sp = await searchParams
  const market = sp?.market?.toUpperCase() || ''

  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const weekMinId = ObjectId.createFromTime(Math.floor(weekAgo.getTime() / 1000))

  const filter = market ? { country_code: market } : {}

  const trackingCol = db.collection('dcomp_domain_tracking')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)

  const [total, newThisWeek, aggregatedDomains, expansionRaw] = await Promise.all([
    col.countDocuments(filter),
    col.countDocuments({ ...filter, _id: { $gte: weekMinId } }),
    // Aggregate tracking data per domain — best position, keyword count, is_known flag
    // Append-only tracking: deduplicate by (domain, keyword, market) using latest entry,
    // then roll up per domain.
    trackingCol.aggregate([
      ...(market ? [{ $match: { market } }] : []),
      { $sort: { last_seen: -1, _id: -1 } },
      {
        $group: {
          _id: { domain: '$domain', keyword: '$keyword', market: '$market' },
          domain: { $first: '$domain' },
          market: { $first: '$market' },
          keyword: { $first: '$keyword' },
          latest_position: { $first: '$current_position' },
          oldest_position: { $last: '$current_position' },
          best_position: { $min: '$current_position' },
          first_seen: { $min: '$first_seen' },
          last_seen: { $max: '$last_seen' },
          is_known: { $first: '$is_known' },
          observations: { $sum: 1 },
        }
      },
      {
        $group: {
          _id: '$domain',
          domain: { $first: '$domain' },
          market: { $first: '$market' },
          avg_position: { $avg: '$latest_position' },
          best_position: { $min: '$best_position' },
          keyword_count: { $sum: 1 },
          total_appearances: { $sum: '$observations' },
          position_delta: { $avg: { $subtract: ['$latest_position', '$oldest_position'] } },
          last_seen: { $max: '$last_seen' },
          first_seen: { $min: '$first_seen' },
          is_known: { $max: '$is_known' },
        }
      },
      { $sort: { keyword_count: -1, avg_position: 1 } },
      { $limit: 30 }
    ]).toArray().catch(() => []),

    // Brand expansion: per (domain × market) with first_seen and keyword count
    trackingCol.aggregate([
      { $sort: { _id: 1 } },
      {
        $group: {
          _id: { domain: '$domain', market: '$market' },
          domain: { $first: '$domain' },
          market: { $first: '$market' },
          first_seen: { $min: '$first_seen' },
          last_seen: { $max: '$last_seen' },
          keyword_count: { $sum: 1 },
          avg_position: { $avg: '$current_position' },
          is_known: { $max: '$is_known' },
        }
      },
    ]).toArray().catch(() => []),
  ])

  // --- Brand expansion grouping ---
  // Group domain×market pairs by brand name, find multi-market players,
  // flag recent new-market entries (first_seen within 30 days while brand
  // is already present in other markets).
  const brandMap = new Map()
  for (const row of expansionRaw) {
    if (!row.domain || !row.market) continue
    const brand = extractBrand(row.domain)
    if (!brand) continue
    if (!brandMap.has(brand)) {
      brandMap.set(brand, { brand, entries: [] })
    }
    brandMap.get(brand).entries.push({
      domain: row.domain,
      market: row.market.toUpperCase(),
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      keyword_count: row.keyword_count || 0,
      avg_position: row.avg_position,
      is_known: row.is_known,
    })
  }

  const expansionGroups = Array.from(brandMap.values())
    .filter(g => {
      // must span 2+ distinct markets OR 2+ distinct domain variants
      const markets = new Set(g.entries.map(e => e.market))
      const domains = new Set(g.entries.map(e => e.domain))
      return markets.size >= 2 || domains.size >= 2
    })
    .map(g => {
      const markets = [...new Set(g.entries.map(e => e.market))].sort()
      const domains = [...new Set(g.entries.map(e => e.domain))].sort()
      const totalKw = g.entries.reduce((s, e) => s + e.keyword_count, 0)
      const is_known = g.entries.some(e => e.is_known)

      // Detect entries whose first_seen is within 30 days AND the brand
      // had at least one other entry present before that date.
      const sortedByFirstSeen = [...g.entries].sort(
        (a, b) => new Date(a.first_seen || 0) - new Date(b.first_seen || 0)
      )
      const newMarketEntries = []
      for (const entry of sortedByFirstSeen) {
        if (!entry.first_seen) continue
        const fs = new Date(entry.first_seen)
        if (fs >= thirtyDaysAgo) {
          const hadOthersBefore = sortedByFirstSeen.some(
            e => e !== entry && e.first_seen && new Date(e.first_seen) < fs
          )
          if (hadOthersBefore) {
            newMarketEntries.push({
              domain: entry.domain,
              market: entry.market,
              first_seen: entry.first_seen,
            })
          }
        }
      }

      return {
        brand: g.brand,
        domains,
        markets,
        total_markets: markets.length,
        total_kw: totalKw,
        is_known,
        new_market_entries: newMarketEntries,
        last_seen: g.entries.reduce(
          (max, e) => (!max || new Date(e.last_seen) > new Date(max) ? e.last_seen : max),
          null
        ),
      }
    })
    // Sort: brands with new market entries first, then by total markets desc, then keyword count
    .sort((a, b) => {
      const aDiff = a.new_market_entries.length > 0 ? 1 : 0
      const bDiff = b.new_market_entries.length > 0 ? 1 : 0
      if (bDiff !== aDiff) return bDiff - aDiff
      if (b.total_markets !== a.total_markets) return b.total_markets - a.total_markets
      return b.total_kw - a.total_kw
    })
    .slice(0, 20)

  // Serialize dates for client
  const expansionSerialized = expansionGroups.map(g => ({
    ...g,
    new_market_entries: g.new_market_entries.map(e => ({
      ...e,
      first_seen: e.first_seen ? new Date(e.first_seen).toISOString() : null,
    })),
    last_seen: g.last_seen ? new Date(g.last_seen).toISOString() : null,
  }))

  // Only real sensor data — no proxy/fake fallback.
  const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#f43f5e','#0ea5e9','#a855f7']
  const chartDomains = aggregatedDomains.slice(0, 20).map((t, i) => {
    const maxKw = aggregatedDomains[0]?.keyword_count || 1
    const x = Math.min(98, Math.max(2, Math.round((t.keyword_count / maxKw) * 100)))
    const avgPos = t.avg_position || 50
    const y = Math.min(98, Math.max(2, Math.round(100 - ((avgPos - 1) / 19) * 100)))
    const delta = t.position_delta ?? 0
    return {
      domain: t.domain,
      market: t.market,
      x,
      y,
      color: COLORS[i % COLORS.length],
      isNew: t.is_known === false,
      keywordCount: t.keyword_count,
      avgPosition: Math.round(avgPos * 10) / 10,
      positionDelta: Math.round(delta * 10) / 10,
      history: [],
    }
  })

  // Score cards: classify domains into 4 quadrants
  const leading = chartDomains.filter(d => d.x >= 50 && d.y >= 50)
  const improving = chartDomains.filter(d => d.x < 50 && d.y >= 50)
  const established = chartDomains.filter(d => d.x >= 50 && d.y < 50)
  const noise = chartDomains.filter(d => d.x < 50 && d.y < 50)

  const scoreCardDomains = [
    { label: 'DOMINANT', color: 'red', items: leading },
    { label: 'EMERGING', color: 'blue', items: improving },
    { label: 'ESTABLISHED', color: 'green', items: established },
    { label: 'NOISE', color: 'gray', items: noise },
  ]

  return (
    <MarketOverviewClient
      chartDomains={chartDomains}
      scoreCardDomains={scoreCardDomains}
      stats={{ total, newThisWeek }}
      activeMarket={market}
      expansionGroups={expansionSerialized}
    />
  )
}
