import { getDatabase, getCollectionName } from '../../lib/mongodb'

function normalizeDomain(input) {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, '')
  }
}

function domainToName(domain) {
  const base = domain.split('.')[0]
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = await getDatabase()
      const competitors = await db
        .collection(getCollectionName())
        .find({})
        .limit(50)
        .toArray()
      return res.status(200).json({ data: competitors })
    } catch (e) {
      console.error('API /competitors error', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const db = await getDatabase()
      const col = db.collection(getCollectionName())
      const rows = Array.isArray(req.body) ? req.body : [req.body]

      let added = 0, skipped = 0, failed = 0
      const duplicates = []

      for (const row of rows) {
        if (!row.domain) { failed++; continue }
        const domain = normalizeDomain(row.domain)
        const country_code = (row.country_code || 'SE').toUpperCase()
        const existing = await col.findOne({ domain, country_code })
        if (existing) {
          skipped++
          duplicates.push(domain)
          continue
        }
        await col.insertOne({
          domain,
          website: `https://${domain}`,
          company_name: row.company_name || domainToName(domain),
          country_code,
          rank: 0,
          created_at: new Date(),
        })
        added++
      }

      return res.status(200).json({ added, skipped, failed, duplicates })
    } catch (e) {
      console.error('API /competitors POST error', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}


