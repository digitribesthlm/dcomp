import { getDatabase } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'

const COLLECTION = 'dcomp_keywords'

export default async function handler(req, res) {
  const db = await getDatabase()
  const col = db.collection(COLLECTION)

  if (req.method === 'GET') {
    const { market, status } = req.query
    const filter = {}
    if (market) filter.market = market.toUpperCase()
    if (status) filter.status = status

    const keywords = await col
      .find(filter)
      .sort({ market: 1, keyword: 1 })
      .toArray()
    return res.status(200).json({ data: keywords })
  }

  if (req.method === 'POST') {
    const { keyword, market, language, googleDomain, checkFrequency, notes } = req.body

    if (!keyword || !market) {
      return res.status(400).json({ error: 'keyword and market are required' })
    }

    const existing = await col.findOne({
      keyword: keyword.trim().toLowerCase(),
      market: market.toUpperCase(),
    })
    if (existing) {
      return res.status(409).json({ error: 'Keyword already exists for this market' })
    }

    const doc = {
      keyword: keyword.trim().toLowerCase(),
      market: market.toUpperCase(),
      language: language || null,
      google_domain: googleDomain || null,
      check_frequency: checkFrequency || 'weekly',
      status: 'active',
      notes: notes || '',
      created_at: new Date(),
      last_checked: null,
    }

    const result = await col.insertOne(doc)
    return res.status(201).json({ data: { ...doc, _id: result.insertedId } })
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
