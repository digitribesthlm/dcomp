import { getDatabase, getCollectionName } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'
import MarketOverviewClient from './MarketOverviewClient'

export const dynamic = 'force-dynamic'

export default async function MarketOverviewPage({ searchParams }) {
  const sp = await searchParams
  const market = sp?.market?.toUpperCase() || ''

  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const weekMinId = ObjectId.createFromTime(Math.floor(weekAgo.getTime() / 1000))

  const filter = market ? { country_code: market } : {}

  const [total, newThisWeek, trackingDomains] = await Promise.all([
    col.countDocuments(filter),
    col.countDocuments({ ...filter, _id: { $gte: weekMinId } }),
    // Load domain tracking data for the chart — fall back to competitors as proxy
    db.collection('dcomp_domain_tracking')
      .find(market ? { market } : {})
      .sort({ last_seen: -1 })
      .limit(40)
      .toArray()
      .catch(() => []),
  ])

  // If we have real tracking data, use it. Otherwise build chart data from competitors as proxy.
  let chartDomains = []

  if (trackingDomains.length > 0) {
    // Real sensor data — group by domain, pick top 20 by appearances
    const byDomain = {}
    for (const t of trackingDomains) {
      if (!byDomain[t.domain]) byDomain[t.domain] = t
    }
    chartDomains = Object.values(byDomain).slice(0, 20).map((t, i) => {
      const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316']
      const x = Math.min(100, Math.max(0, 100 - (t.current_position || 50) * 2))
      const y = t.position_delta != null
        ? Math.min(100, Math.max(0, 50 - t.position_delta * 5))
        : 50
      return {
        domain: t.domain,
        market: t.market,
        x,
        y,
        color: COLORS[i % COLORS.length],
        isNew: t.status === 'new',
        history: (t.history || []).slice(-6).map((h, hi, arr) => ({
          x: Math.min(100, Math.max(0, 100 - h.position * 2)),
          y: hi > 0 ? Math.min(100, Math.max(0, 50 - (h.position - arr[hi - 1].position) * 5)) : 50,
        })),
      }
    })
  } else {
    // No sensor data yet — use competitors as visual proxy so the chart isn't empty
    const competitors = await col
      .find(filter)
      .sort({ rank: -1 })
      .limit(16)
      .toArray()

    const activityScore = { 'VERY ACTIVE': 80, 'ACTIVE': 65, 'MODERATE': 45, 'LIMITED': 25 }
    const ratingScore = { 'EXCELLENT': 85, 'GOOD': 68, 'MODERATE': 48, 'LIMITED': 28 }
    const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#f43f5e','#0ea5e9','#a855f7','#14b8a6','#fb923c','#6366f1','#22c55e']

    chartDomains = competitors.map((c, i) => {
      const x = Math.min(95, Math.max(5, (c.rank || 50)))
      const yBase = activityScore[c.content_marketing?.activity_level] || ratingScore[c.content_marketing?.overall_rating] || 45
      const y = Math.min(95, Math.max(5, yBase + (Math.random() * 10 - 5)))
      // Build a fake 4-point trail to show movement direction
      const jitter = () => (Math.random() * 12 - 6)
      const history = [
        { x: Math.max(2, x - 15 + jitter()), y: Math.max(2, y - 12 + jitter()) },
        { x: Math.max(2, x - 10 + jitter()), y: Math.max(2, y - 8 + jitter()) },
        { x: Math.max(2, x - 5 + jitter()), y: Math.max(2, y - 4 + jitter()) },
        { x, y },
      ]
      return {
        domain: c.domain || c.website || c.company_name,
        market: c.country_code,
        x,
        y,
        color: COLORS[i % COLORS.length],
        isNew: c._id > weekMinId,
        history,
      }
    })
  }

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
      hasRealData={trackingDomains.length > 0}
      activeMarket={market}
    />
  )
}
