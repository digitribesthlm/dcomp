import { getDatabase } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'

const COLLECTION = 'dcomp_blocklist'

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
    const domains = await col.find({}).sort({ domain: 1 }).toArray()
    return res.status(200).json({ data: domains })
  }

  if (req.method === 'POST') {
    const { domain: raw, reason } = req.body

    if (!raw) {
      return res.status(400).json({ error: 'domain is required' })
    }

    const domain = normalizeDomain(raw)
    const existing = await col.findOne({ domain })
    if (existing) {
      return res.status(409).json({ error: 'Domain already on blocklist' })
    }

    const doc = {
      domain,
      reason: reason || 'irrelevant',
      created_at: new Date(),
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
