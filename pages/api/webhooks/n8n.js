import { getDatabase } from '../../../lib/mongodb'

// Shared secret set in N8N_WEBHOOK_SECRET env var
function authorize(req) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return true // allow if not configured (dev)
  return req.headers['x-webhook-secret'] === secret
}

function normalizeDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.trim().toLowerCase().replace(/^www\./, '')
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!authorize(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { keyword_id, keyword, market, run_at, results } = req.body

  if (!keyword || !market || !Array.isArray(results)) {
    return res.status(400).json({ error: 'keyword, market, and results[] are required' })
  }

  const db = await getDatabase()
  const runDate = run_at ? new Date(run_at) : new Date()

  // Load blocklist and seeds for this market
  const [blocklist, seeds] = await Promise.all([
    db.collection('dcomp_blocklist').find({}).project({ domain: 1 }).toArray(),
    db.collection('dcomp_seeds').find({ markets: market }).project({ domain: 1 }).toArray(),
  ])

  const blockedSet = new Set(blocklist.map(b => b.domain))
  const seedSet = new Set(seeds.map(s => s.domain))

  // Enrich results
  const enriched = results.map(r => ({
    ...r,
    domain: r.domain || normalizeDomain(r.url || ''),
    is_blocked: blockedSet.has(r.domain || normalizeDomain(r.url || '')),
    is_seed: seedSet.has(r.domain || normalizeDomain(r.url || '')),
  }))

  // Save the run snapshot
  const snapshot = {
    keyword_id: keyword_id || null,
    keyword,
    market: market.toUpperCase(),
    run_at: runDate,
    results: enriched,
    status: 'success',
  }
  await db.collection('dcomp_serp_runs').insertOne(snapshot)

  // Update domain tracking — upsert per (domain × keyword × market)
  const newDomains = []

  for (const r of enriched) {
    if (r.is_blocked) continue

    const domain = r.domain
    const trackingKey = { domain, keyword, market: market.toUpperCase() }

    const existing = await db.collection('dcomp_domain_tracking').findOne(trackingKey)
    const posEntry = { date: runDate, position: r.position, url: r.url, title: r.title }

    if (!existing) {
      newDomains.push(domain)
      await db.collection('dcomp_domain_tracking').insertOne({
        ...trackingKey,
        first_seen: runDate,
        last_seen: runDate,
        current_position: r.position,
        prev_position: null,
        position_delta: null,
        appearances: 1,
        history: [posEntry],
        status: 'new',
        is_seed: r.is_seed,
        alert_sent: false,
      })
    } else {
      const delta = r.position - existing.current_position
      let status = 'stable'
      if (delta < -2) status = 'rising'
      else if (delta > 2) status = 'dropping'

      await db.collection('dcomp_domain_tracking').updateOne(
        { _id: existing._id },
        {
          $set: {
            last_seen: runDate,
            prev_position: existing.current_position,
            current_position: r.position,
            position_delta: delta,
            status,
            is_seed: r.is_seed,
          },
          $inc: { appearances: 1 },
          $push: { history: { $each: [posEntry], $slice: -52 } }, // keep last 52 entries (~1 year weekly)
        }
      )
    }
  }

  return res.status(200).json({ success: true, new_domains: newDomains, processed: enriched.length })
}
