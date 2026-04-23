import { getDatabase, getCollectionName } from '../../lib/mongodb'

async function upsertCompetitorDocs({ db, domain }) {
  const competitors = db.collection(getCollectionName())
  const tracking = db.collection('dcomp_domain_tracking')

  // Which markets has this domain been observed in?
  const markets = await tracking.distinct('market', { domain })
  const now = new Date()

  // Always create at least one row, even if we have no market data yet.
  const countryCodes = markets.filter(Boolean).map(m => String(m).toUpperCase())
  const rows = countryCodes.length > 0 ? countryCodes : [null]

  const inserted = []
  for (const cc of rows) {
    const filter = cc ? { domain, country_code: cc } : { domain, country_code: { $in: [null, undefined] } }
    const exists = await competitors.findOne(filter)
    if (exists) continue

    await competitors.insertOne({
      domain,
      company_name: domain,
      website: `https://${domain}`,
      country_code: cc,
      market: cc,
      source: 'triage',
      is_known: true,
      added_via: 'triage',
      created_at: now,
    })
    inserted.push(cc || '—')
  }
  return { markets: countryCodes, inserted }
}

function normalizeDomain(input) {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, '')
  }
}

export default async function handler(req, res) {
  const db = await getDatabase()

  if (req.method === 'GET') {
    const tracking = db.collection('dcomp_domain_tracking')
    const blocklist = db.collection('dcomp_blocklist')
    const seeds = db.collection('dcomp_seeds')
    const competitors = db.collection(getCollectionName())

    const [blockedDomains, seedDomains, competitorDomains] = await Promise.all([
      blocklist.distinct('domain'),
      seeds.distinct('domain'),
      competitors.distinct('domain').catch(() => []),
    ])

    const excluded = new Set([
      ...blockedDomains,
      ...seedDomains,
      ...competitorDomains,
    ])

    const agg = await tracking.aggregate([
      { $match: { domain: { $nin: Array.from(excluded) } } },
      { $sort: { last_seen: -1, _id: -1 } },
      {
        $group: {
          _id: { domain: '$domain', keyword: '$keyword', market: '$market' },
          domain: { $first: '$domain' },
          keyword: { $first: '$keyword' },
          market: { $first: '$market' },
          latest_position: { $first: '$current_position' },
          last_seen: { $max: '$last_seen' },
          is_known: { $first: '$is_known' },
        }
      },
      {
        $group: {
          _id: '$domain',
          domain: { $first: '$domain' },
          keyword_count: { $sum: 1 },
          avg_position: { $avg: '$latest_position' },
          best_position: { $min: '$latest_position' },
          markets: { $addToSet: '$market' },
          last_seen: { $max: '$last_seen' },
          sample_keywords: { $addToSet: '$keyword' },
          is_known: { $max: '$is_known' },
        }
      },
      { $match: { is_known: { $ne: true } } },
      { $sort: { keyword_count: -1, avg_position: 1 } },
      { $limit: 100 },
    ]).toArray()

    return res.status(200).json({ data: agg })
  }

  if (req.method === 'POST') {
    const { action, domain: raw, reason } = req.body || {}
    if (!raw) return res.status(400).json({ error: 'domain is required' })
    const domain = normalizeDomain(raw)

    if (action === 'block') {
      const blocklist = db.collection('dcomp_blocklist')
      const tracking = db.collection('dcomp_domain_tracking')

      await blocklist.updateOne(
        { domain },
        {
          $setOnInsert: {
            domain,
            reason: reason || 'irrelevant',
            created_at: new Date(),
          }
        },
        { upsert: true }
      )

      const del = await tracking.deleteMany({ domain })
      return res.status(200).json({
        success: true,
        action: 'block',
        domain,
        removed_from_tracking: del.deletedCount,
      })
    }

    if (action === 'competitor') {
      const seeds = db.collection('dcomp_seeds')
      const tracking = db.collection('dcomp_domain_tracking')

      // 1. Figure out which markets this domain has been observed in
      const observedMarkets = (await tracking.distinct('market', { domain }))
        .filter(Boolean)
        .map(m => String(m).toUpperCase())

      // 2. Ensure a seed row exists with correct markets (used by n8n for is_known lookup)
      const existingSeed = await seeds.findOne({ domain })
      if (!existingSeed) {
        await seeds.insertOne({
          domain,
          url: `https://${domain}`,
          company_name: domain,
          markets: observedMarkets,
          type: 'competitor',
          status: 'active',
          notes: 'Added via triage',
          created_at: new Date(),
        })
      } else {
        const merged = [...new Set([...(existingSeed.markets || []), ...observedMarkets])]
        await seeds.updateOne(
          { _id: existingSeed._id },
          { $set: { markets: merged, updated_at: new Date() } }
        )
      }

      // 3. Insert rows into dcor_competitors (source of truth for Intelligence Matrix)
      const { markets, inserted } = await upsertCompetitorDocs({ db, domain })

      // 3. Mark existing tracking rows as known (keep history, don't delete)
      const upd = await tracking.updateMany(
        { domain },
        { $set: { is_known: true } }
      )

      return res.status(200).json({
        success: true,
        action: 'competitor',
        domain,
        markets,
        competitor_rows_created: inserted,
        tracking_rows_marked_known: upd.modifiedCount,
      })
    }

    return res.status(400).json({ error: 'Unknown action. Use "block" or "competitor".' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
