import { getDatabase, getCollectionName } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'

const COLLECTION = 'dcomp_seeds'

async function mirrorToCompetitors({ db, domain, url, companyName, markets }) {
  const col = db.collection(getCollectionName())
  const now = new Date()
  const rows = markets.length > 0 ? markets : [null]
  const inserted = []
  for (const cc of rows) {
    const filter = cc ? { domain, country_code: cc } : { domain, country_code: { $in: [null, undefined] } }
    const exists = await col.findOne(filter)
    if (exists) continue
    await col.insertOne({
      domain,
      company_name: companyName || domain,
      website: url || `https://${domain}`,
      country_code: cc,
      market: cc,
      source: 'setup',
      is_known: true,
      added_via: 'setup-seeds',
      created_at: now,
    })
    inserted.push(cc || '—')
  }
  return inserted
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
  const col = db.collection(COLLECTION)

  if (req.method === 'GET') {
    const { market, type } = req.query
    const filter = {}
    if (market) filter.markets = market.toUpperCase()
    if (type) filter.type = type

    const seeds = await col
      .find(filter)
      .sort({ domain: 1 })
      .toArray()
    return res.status(200).json({ data: seeds })
  }

  if (req.method === 'POST') {
    const { url, companyName, markets, type, notes } = req.body

    if (!url) {
      return res.status(400).json({ error: 'url is required' })
    }

    const domain = normalizeDomain(url)
    const marketsArr = Array.isArray(markets)
      ? markets.map(m => m.toUpperCase())
      : markets
      ? [markets.toUpperCase()]
      : []

    const existing = await col.findOne({ domain })
    if (existing) {
      const merged = [...new Set([...(existing.markets || []), ...marketsArr])]
      await col.updateOne({ _id: existing._id }, { $set: { markets: merged, updated_at: new Date() } })
      const mirrored = await mirrorToCompetitors({
        db,
        domain,
        url: existing.url || url,
        companyName: existing.company_name || companyName,
        markets: merged,
      })
      return res.status(200).json({ data: { ...existing, markets: merged }, merged: true, mirrored_to_competitors: mirrored })
    }

    const doc = {
      domain,
      url: url.trim(),
      company_name: companyName || domain,
      markets: marketsArr,
      type: type || 'competitor',
      status: 'active',
      notes: notes || '',
      created_at: new Date(),
    }

    const result = await col.insertOne(doc)
    const mirrored = await mirrorToCompetitors({
      db,
      domain,
      url: doc.url,
      companyName: doc.company_name,
      markets: marketsArr,
    })
    return res.status(201).json({ data: { ...doc, _id: result.insertedId }, mirrored_to_competitors: mirrored })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    await col.deleteOne({ _id: new ObjectId(id) })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
