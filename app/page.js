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

    // Top categories facet - use business_model field
    const catAgg = await col
      .aggregate([
        { $match: { business_model: { $exists: true, $ne: null } } },
        { $group: { _id: '$business_model', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray()
    topCategories = catAgg.map((c) => ({ name: c._id ?? 'Uncategorized', count: c.count }))

    // Recent items - use company_name and actual fields
    recent = await col
      .find({ type: 'competitor' })
      .project({ company_name: 1, website: 1, business_model: 1, market: 1 })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()

    // Market facets using country_code field
    const mAgg = await col
      .aggregate([
        { $match: { country_code: { $exists: true, $ne: null } } },
        { $group: { _id: '$country_code', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray()
    marketFacets = mAgg.map((m) => ({ code: m._id, count: m.count }))
  } catch (e) {
    console.error('Failed to load dashboard metrics', e)
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-hubspotTeal/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="text-sm font-medium uppercase tracking-wider text-hubspotTeal mb-2">Total Competitors</div>
            <div className="text-5xl font-bold text-gray-900 mb-1">{total.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Active in database</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-orange-50 p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-hubspotOrange/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="text-sm font-medium uppercase tracking-wider text-hubspotOrange mb-2">New This Week</div>
            <div className="text-5xl font-bold text-gray-900 mb-1">{newThisWeek}</div>
            <div className="text-sm text-gray-600">Recently added</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-hubspotBlue/10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="text-sm font-medium uppercase tracking-wider text-hubspotBlue mb-2">Top Category</div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {topCategories[0] ? `${topCategories[0].name}` : 'No data'}
            </div>
            <div className="text-sm text-gray-600">{topCategories[0]?.count ?? 0} competitors</div>
          </div>
        </div>
      </div>

      {/* Enhanced Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg">
          <div className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-hubspotTeal/5 to-hubspotTeal/10">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-2 h-8 bg-hubspotTeal rounded-full mr-3"></div>
              Top Categories
            </h3>
            <p className="text-sm text-gray-600 mt-1">Competitor distribution by category</p>
          </div>
          <div className="p-8">
            {topCategories.length > 0 ? (
              <div className="space-y-4">
                {topCategories.map((c, index) => (
                  <div key={String(c.name)} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-4 ${index === 0 ? 'bg-hubspotTeal' : index === 1 ? 'bg-hubspotOrange' : 'bg-hubspotBlue'}`}></div>
                      <span className="font-medium text-gray-900">{String(c.name)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-gray-900 mr-2">{c.count}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${index === 0 ? 'bg-hubspotTeal' : index === 1 ? 'bg-hubspotOrange' : 'bg-hubspotBlue'}`}
                          style={{ width: `${(c.count / (topCategories[0]?.count || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-500 font-medium">No categories found</p>
                <p className="text-sm text-gray-400">Add competitors to see category distribution</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg">
          <div className="border-b border-gray-200 px-6 py-6 bg-gradient-to-r from-hubspotOrange/5 to-hubspotOrange/10">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-2 h-8 bg-hubspotOrange rounded-full mr-3"></div>
              Markets
            </h3>
            <p className="text-sm text-gray-600 mt-1">Geographic distribution</p>
          </div>
          <div className="p-6">
            {marketFacets.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {marketFacets.map((m) => (
                  <div key={m.code} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 hover:shadow-md transition-all duration-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-hubspotOrange mb-1">{m.code.toUpperCase()}</div>
                      <div className="text-2xl font-bold text-gray-900">{m.count}</div>
                      <div className="text-xs text-gray-500">competitors</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                </div>
                <p className="text-gray-500 text-sm">No market data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Recent Items */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg">
        <div className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-hubspotBlue/5 to-hubspotBlue/10">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-2 h-8 bg-hubspotBlue rounded-full mr-3"></div>
            Recent Competitors
          </h3>
          <p className="text-sm text-gray-600 mt-1">Latest additions to the database</p>
        </div>
        <div className="p-8">
          {recent.length > 0 ? (
            <div className="space-y-4">
              {recent.map((r, index) => (
                <div key={String(r._id)} className="group flex items-center justify-between p-6 rounded-xl border border-gray-100 bg-gradient-to-r from-white to-gray-50 hover:shadow-md hover:border-hubspotTeal/30 transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-hubspotTeal to-hubspotBlue flex items-center justify-center text-white font-bold text-lg">
                      {(r.company_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg group-hover:text-hubspotTeal transition-colors">
                        {r.company_name || 'Unnamed Competitor'}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <span className="inline-block w-2 h-2 bg-hubspotOrange rounded-full mr-2"></span>
                        {r.business_model || 'Uncategorized'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.website ? (
                      <a 
                        href={r.website} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-hubspotTeal text-white text-sm font-medium hover:bg-hubspotTeal/90 transition-colors"
                      >
                        Visit Site
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">No website</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium text-lg mb-2">No recent competitors</p>
              <p className="text-gray-400">Start adding competitors to see them here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
