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
        { company_name: { $regex: q, $options: 'i' } },
        { website: { $regex: q, $options: 'i' } },
        { business_model: { $regex: q, $options: 'i' } },
        { market: { $regex: q, $options: 'i' } },
      ]
    }
    const marketCodes = ['fi','no','dk','se','de','fr','it','es']
    if (market && marketCodes.includes(market)) {
      query.country_code = market.toUpperCase()
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
    if (!docs || docs.length === 0) return ['type', 'market', 'country_code', 'dcor_site', 'rank', 'company_name']
    // Always show company_name first, then other key fields
    return ['company_name', 'market', 'country_code', 'dcor_site', 'rank', 'type']
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
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-hubspotTeal/5 p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center">
              <div className="w-3 h-10 bg-hubspotTeal rounded-full mr-4"></div>
              {collectionName}
            </h2>
            <p className="text-gray-600 mt-2">Comprehensive competitor analysis and insights</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-hubspotTeal">{competitors.length}</div>
            <div className="text-sm text-gray-600">Total Results</div>
          </div>
        </div>
        
        {/* Enhanced Search and Filters */}
        <form className="space-y-4" method="GET">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Competitors</label>
              <div className="relative">
                <input 
                  name="q" 
                  defaultValue={q} 
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal transition-colors" 
                  placeholder="Search by name, website, or category..." 
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Market Filter</label>
              <select 
                name="market" 
                defaultValue={market} 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal transition-colors"
              >
                <option value="">All Markets</option>
                {['fi','no','dk','se','de','fr','it','es'].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="px-8 py-3 bg-hubspotTeal text-white rounded-xl font-medium hover:bg-hubspotTeal/90 transition-colors shadow-lg hover:shadow-xl">
                Apply Filters
              </button>
            </div>
          </div>
        </form>
        
        {/* Market Tags */}
        {facets.markets.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Quick Market Filters:</div>
            <div className="flex flex-wrap gap-2">
              {facets.markets.map(m => (
                <Link 
                  key={m.code} 
                  href={`?market=${m.code}`} 
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    m.code === market 
                      ? 'bg-hubspotTeal text-white shadow-lg' 
                      : 'bg-white text-hubspotTeal border border-hubspotTeal/30 hover:bg-hubspotTeal/10'
                  }`}
                >
                  {m.code.toUpperCase()}
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {m.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Enhanced Data Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-hubspotGray to-hubspotGray/50">
              <tr>
                {displayKeys.map((k) => (
                  <th key={k} className="text-left px-8 py-6 text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200">
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {competitors.map((doc, rowIdx) => (
                <tr key={String(doc._id)} className={`transition-colors hover:bg-hubspotTeal/5 ${rowIdx % 2 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  {displayKeys.map((k, i) => (
                    <td key={k} className="px-8 py-6 text-sm">
                      {i === 0 ? (
                        <Link 
                          className="font-semibold text-hubspotTeal hover:text-hubspotTeal/80 hover:underline transition-colors flex items-center" 
                          href={`/competitors/${String(doc._id)}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hubspotTeal to-hubspotBlue flex items-center justify-center text-white font-bold text-xs mr-3">
                            {(toCell(doc[k]) || 'U').charAt(0).toUpperCase()}
                          </div>
                          {toCell(doc[k])}
                        </Link>
                      ) : k === 'website' && doc[k] ? (
                        <a 
                          href={doc[k]} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-hubspotTeal hover:text-hubspotTeal/80 hover:underline transition-colors inline-flex items-center"
                        >
                          {toCell(doc[k])}
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : k === 'category' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-hubspotOrange/10 text-hubspotOrange">
                          {toCell(doc[k])}
                        </span>
                      ) : (
                        <span className="text-gray-900">{toCell(doc[k])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {competitors.length === 0 && (
                <tr>
                  <td colSpan={Math.max(displayKeys.length, 1)} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium text-lg mb-2">No competitors found</p>
                      <p className="text-gray-400">Try adjusting your search criteria or check your database connection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


