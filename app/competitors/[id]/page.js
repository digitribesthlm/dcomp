import { ObjectId } from 'mongodb'
import { getDatabase, getCollectionName } from '../../../lib/mongodb'

export const dynamic = 'force-dynamic'

export default async function CompetitorDetail({ params }) {
  const p = await params
  const id = p?.id
  let doc = null
  try {
    const db = await getDatabase()
    const col = db.collection(getCollectionName())
    if (ObjectId.isValid(id)) {
      doc = await col.findOne({ _id: new ObjectId(id) })
    } else {
      // try to find by slug fields if provided (e.g., market_name)
      const [market, name] = String(id || '').split('_')
      doc = await col.findOne({
        $or: [
          { slug: id },
          { name: { $regex: name || '', $options: 'i' }, market: { $regex: market || '', $options: 'i' } },
        ],
      })
    }
  } catch (e) {
    console.error('Failed to load competitor', e)
  }

  if (!doc) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="text-gray-600">Not found.</div>
      </div>
    )
  }

  const entries = Object.entries(doc).filter(([k]) => k !== '_id')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white border rounded-lg overflow-hidden">
        <div className="border-b px-6 py-4 bg-hubspotGray">
          <h2 className="font-semibold">{doc.name || 'Competitor'}</h2>
        </div>
        <div className="p-6 space-y-4">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="text-xs uppercase text-gray-500">{k}</div>
              <div className="text-sm break-words">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <div className="text-sm text-gray-600">ID</div>
        <div className="font-mono text-sm">{String(doc._id)}</div>
        {doc.website && (
          <a className="mt-4 inline-block text-hubspotTeal" href={doc.website} target="_blank" rel="noreferrer">Visit website</a>
        )}
      </div>
    </div>
  )
}


