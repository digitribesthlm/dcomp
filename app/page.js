import { getDatabase, getCollectionName } from '../lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function Home() {
  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  let total = 0
  let newThisWeek = 0
  let topCategories = []
  let recent = []
  let marketFacets = []

  try {
    // Totals
    total = await col.countDocuments()

    // New this week using ObjectId timestamp
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const ts = Math.floor(weekAgo.getTime() / 1000)
    const minId = ObjectId.createFromTime(ts)
    newThisWeek = await col.countDocuments({ _id: { $gte: minId } })

    // Top categories facet (if field exists)
    const catAgg = await col
      .aggregate([
        { $match: { category: { $exists: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray()
    topCategories = catAgg.map((c) => ({ name: c._id ?? 'Uncategorized', count: c.count }))

    // Recent items
    recent = await col
      .find({})
      .project({ name: 1, website: 1, category: 1 })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()

    // Market facets (common field fallbacks)
    const mAgg = await col
      .aggregate([
        {
          $project: {
            market: {
              $toLower: {
                $ifNull: [
                  '$market',
                  { $ifNull: ['$country', { $ifNull: ['$locale', { $ifNull: ['$region', null] }] }] },
                ],
              },
            },
          },
        },
        { $match: { market: { $in: ['fi','no','dk','se','de','fr','it','es'] } } },
        { $group: { _id: '$market', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray()
    marketFacets = mAgg.map(m => ({ code: m._id, count: m.count }))
  } catch (e) {
    console.error('Failed to load dashboard metrics', e)
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
          <div className="mt-2 text-4xl font-bold">{total}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">New this week</div>
          <div className="mt-2 text-4xl font-bold">{newThisWeek}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Top category</div>
          <div className="mt-2 text-xl font-semibold">
            {topCategories[0] ? `${topCategories[0].name}` : '—'}
          </div>
          <div className="text-xs text-gray-500">{topCategories[0]?.count ?? ''}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3 bg-hubspotGray/60">
            <h3 className="text-sm font-semibold">Top categories</h3>
          </div>
          <ul className="p-4 divide-y divide-gray-100 text-sm">
            {topCategories.map((c) => (
              <li key={String(c.name)} className="py-2 flex items-center justify-between">
                <span>{String(c.name)}</span>
                <span className="text-gray-600">{c.count}</span>
              </li>
            ))}
            {topCategories.length === 0 && (
              <li className="py-4 text-gray-500">No categories found.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3 bg-hubspotGray/60">
            <h3 className="text-sm font-semibold">Markets</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2 text-xs">
            {marketFacets.map((m) => (
              <span key={m.code} className="px-2 py-1 rounded border border-gray-200 bg-white">
                {m.code.toUpperCase()} {m.count}
              </span>
            ))}
            {marketFacets.length === 0 && (
              <span className="text-gray-500">No market data.</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-gray-100 px-6 py-3 bg-hubspotGray/60">
          <h3 className="text-sm font-semibold">Recent items</h3>
        </div>
        <ul className="p-4 space-y-3 text-sm">
          {recent.map((r) => (
            <li key={String(r._id)} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name || 'Unnamed'}</div>
                <div className="text-gray-600">{r.category || '—'}</div>
              </div>
              <div className="text-hubspotTeal truncate max-w-[220px]">
                {r.website ? (
                  <a href={r.website} target="_blank" rel="noreferrer">{r.website}</a>
                ) : (
                  '—'
                )}
              </div>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="text-gray-500">No recent items.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
