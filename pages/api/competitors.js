import { getDatabase, getCollectionName } from '../../lib/mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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


