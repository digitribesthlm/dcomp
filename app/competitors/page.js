import Link from 'next/link'
import { getDatabase, getCollectionName } from '../../lib/mongodb'

export const dynamic = 'force-dynamic'

export default async function CompetitorsPage({ searchParams }) {
  let competitors = []
  let facets = { markets: [] }

  const sp = await searchParams
  const q = (sp?.q || '').trim()
  const market = (sp?.market || '').trim().toLowerCase()
  const collectionName = getCollectionName()

  const buildQuery = () => {
    const query = {}
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { website: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ]
    }
    const marketCodes = ['fi','no','dk','se','de','fr','it','es']
    if (market && marketCodes.includes(market)) {
      query.$or = (query.$or || []).concat([
        { market: market },
        { country: market },
        { locale: market },
        { markets: market },
        { region: market },
      ])
    }
    return query
  }

  try {
    const db = await getDatabase()
    const col = db.collection(collectionName)

    const query = buildQuery()

    competitors = await col
      .find(query)
      .sort({ _id: -1 })
      .limit(50)
      .toArray()

    // Market facets across common fields
    const facetAgg = await col.aggregate([
      { $match: {} },
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
    ]).toArray()
    facets.markets = facetAgg.map(f => ({ code: f._id, count: f.count }))
  } catch (e) {
    console.error('Failed to fetch competitors', e)
  }

  const pickDisplayKeys = (docs) => {
    if (!docs || docs.length === 0) return []
    const first = docs[0] || {}
    return Object.keys(first)
      .filter((k) => k !== '_id')
      .slice(0, 6)
  }

  const displayKeys = pickDisplayKeys(competitors)

  const toCell = (value) => {
    if (value == null) return '-'
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (value && typeof value === 'object') {
      if (value.url || value.href) return value.url || value.href
      try { return JSON.stringify(value) } catch (_) { return String(value) }
    }
    return String(value)
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className="border-b px-6 py-4 bg-hubspotGray flex items-center justify-between">
        <h2 className="font-semibold">{collectionName}</h2>
        <span className="text-xs text-gray-500">{competitors.length} items</span>
      </div>
      <div className="p-4">
        <form className="flex flex-wrap gap-3" method="GET">
          <input name="q" defaultValue={q} className="border rounded px-3 py-2 text-sm w-64" placeholder="Search..." />
          <select name="market" defaultValue={market} className="border rounded px-3 py-2 text-sm">
            <option value="">All markets</option>
            {['fi','no','dk','se','de','fr','it','es'].map(m => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
          <button className="bg-hubspotTeal text-white text-sm px-3 py-2 rounded">Apply</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {facets.markets.map(m => (
            <a key={m.code} href={`?market=${m.code}`} className={`px-2 py-1 rounded border ${m.code===market ? 'bg-hubspotTeal text-white border-hubspotTeal' : 'bg-white text-hubspotBlue'}`}>
              {m.code.toUpperCase()} {m.count}
            </a>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-hubspotGray/60 text-gray-700 sticky top-0">
            <tr>
              {displayKeys.map((k) => (
                <th key={k} className="text-left px-6 py-3 capitalize font-medium">{k.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {competitors.map((doc, rowIdx) => (
              <tr key={String(doc._id)} className={rowIdx % 2 ? 'bg-white' : 'bg-hubspotGray/30'}>
                {displayKeys.map((k, i) => (
                  <td key={k} className="px-6 py-3">
                    {i === 0 ? (
                      <Link className="text-hubspotTeal hover:underline" href={`/competitors/${String(doc._id)}`}>
                        {toCell(doc[k])}
                      </Link>
                    ) : toCell(doc[k])}
                  </td>
                ))}
              </tr>
            ))}
            {competitors.length === 0 && (
              <tr>
                <td colSpan={Math.max(displayKeys.length, 1)} className="px-6 py-6 text-gray-500">No data. Configure database connection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


