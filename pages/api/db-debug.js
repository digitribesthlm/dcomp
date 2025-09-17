import { getDatabase, getCollectionName } from '../../lib/mongodb'

export default async function handler(req, res) {
  try {
    const db = await getDatabase()
    const client = db.client || db.s?.client
    const admin = client?.db().admin?.() || db.admin?.()
    const info = await admin.serverStatus().catch(() => null)
    const collections = await db.listCollections().toArray()
    res.status(200).json({
      uriDbDefault: client?.s?.options?.dbName || null,
      usingDb: db.databaseName,
      envDb: process.env.MONGODB_DB || null,
      collectionEnv: getCollectionName(),
      collections: collections.map(c => c.name),
      serverOk: Boolean(info),
    })
  } catch (e) {
    console.error('db-debug error', e)
    res.status(500).json({ error: e.message })
  }
}


