import { getDatabase, getCollectionName } from '../../lib/mongodb'
import { ObjectId } from 'mongodb'
import Link from 'next/link'

export default async function Home() {
  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  let total = 0
  let newThisWeek = []
  let newThisMonth = 0
  let marketData = []
  let topSeoPerformers = []
  let recentActivity = []

  try {
    // Total competitors
    total = await col.countDocuments()

    // New this week (for alerts)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weekTs = Math.floor(weekAgo.getTime() / 1000)
    const weekMinId = ObjectId.createFromTime(weekTs)
    newThisWeek = await col
      .find({ _id: { $gte: weekMinId } })
      .project({ company_name: 1, market: 1, country_code: 1, website: 1, business_model: 1 })
      .sort({ _id: -1 })
      .limit(10)
      .toArray()

    // New this month count
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const monthTs = Math.floor(monthAgo.getTime() / 1000)
    const monthMinId = ObjectId.createFromTime(monthTs)
    newThisMonth = await col.countDocuments({ _id: { $gte: monthMinId } })

    // Market data with counts and new indicators
    const marketAgg = await col
      .aggregate([
        { $match: { country_code: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$country_code',
            count: { $sum: 1 },
            hasExcellentSeo: { 
              $sum: { $cond: [{ $eq: ['$content_marketing.overall_rating', 'EXCELLENT'] }, 1, 0] }
            },
            hasActiveBlog: {
              $sum: { $cond: [{ $eq: ['$content_marketing.activity_level', 'VERY ACTIVE'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray()
    
    // Check for new competitors per market this week
    const newPerMarket = await col
      .aggregate([
        { $match: { _id: { $gte: weekMinId }, country_code: { $exists: true } } },
        { $group: { _id: '$country_code', newCount: { $sum: 1 } } }
      ])
      .toArray()
    const newMarketMap = Object.fromEntries(newPerMarket.map(m => [m._id, m.newCount]))
    
    marketData = marketAgg.map(m => ({
      code: m._id,
      count: m.count,
      newThisWeek: newMarketMap[m._id] || 0,
      excellentSeo: m.hasExcellentSeo,
      activeBlog: m.hasActiveBlog
    }))

    // Top SEO performers (excellent content marketing)
    topSeoPerformers = await col
      .find({ 
        'content_marketing.overall_rating': { $in: ['EXCELLENT', 'GOOD'] },
        'content_marketing.activity_level': 'VERY ACTIVE'
      })
      .project({ 
        company_name: 1, 
        country_code: 1, 
        website: 1,
        'content_marketing.overall_rating': 1,
        'content_marketing.activity_level': 1,
        'content_marketing.update_frequency': 1
      })
      .sort({ _id: -1 })
      .limit(5)
      .toArray()

    // Recent activity - mix of new and high performers
    recentActivity = await col
      .find({})
      .project({ 
        company_name: 1, 
        country_code: 1, 
        business_model: 1,
        'content_marketing.overall_rating': 1,
        'social_media.overall_presence': 1
      })
      .sort({ _id: -1 })
      .limit(8)
      .toArray()

  } catch (e) {
    console.error('Failed to load dashboard metrics', e)
  }

  const hasNewCompetitors = newThisWeek.length > 0

  return (
    <div className="space-y-6">
      
      {/* Alert Banner - New Competitors */}
      {hasNewCompetitors && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="font-bold">New Competitors Detected</div>
                <div className="text-sm text-white/80">{newThisWeek.length} new entrants this week</div>
              </div>
            </div>
            <Link href="/competitors" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              View All →
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Tracked</div>
              <div className="text-3xl font-bold">{total}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-hubspotTeal/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-hubspotTeal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">New This Week</div>
              <div className="text-3xl font-bold text-amber-600">{newThisWeek.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">New This Month</div>
              <div className="text-3xl font-bold">{newThisMonth}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Markets</div>
              <div className="text-3xl font-bold">{marketData.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Markets Overview with Indicators */}
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="font-semibold">Markets Overview</h2>
            <p className="text-xs text-gray-500 mt-0.5">Activity indicators per market</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {marketData.map((m) => (
                <Link 
                  key={m.code} 
                  href={`/competitors?market=${m.code.toLowerCase()}`}
                  className="relative rounded-lg border p-4 hover:border-hubspotTeal hover:shadow-md transition-all group"
                >
                  {/* New indicator badge */}
                  {m.newThisWeek > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {m.newThisWeek}
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 group-hover:text-hubspotTeal">{m.code}</div>
                    <div className="text-2xl font-bold mt-1">{m.count}</div>
                    <div className="text-xs text-gray-500">competitors</div>
                    
                    {/* SEO indicators */}
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {m.excellentSeo > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700" title={`${m.excellentSeo} with excellent SEO`}>
                          <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          {m.excellentSeo}
                        </span>
                      )}
                      {m.activeBlog > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700" title={`${m.activeBlog} with active blogs`}>
                          <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                          </svg>
                          {m.activeBlog}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {marketData.length === 0 && (
              <div className="text-center py-8 text-gray-500">No market data available</div>
            )}
          </div>
        </div>

        {/* Right Column - Stacked Boxes */}
        <div className="space-y-4">
          {/* New Comp */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-amber-50">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Comp
              </h2>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {newThisWeek.slice(0, 5).map((c) => (
                <Link key={String(c._id)} href={`/competitors/${c._id}`} className="block px-4 py-2.5 hover:bg-hubspotTeal/5 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm truncate block">{c.company_name || 'Unknown'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 shrink-0 ml-2">
                      {c.country_code || '—'}
                    </span>
                  </div>
                </Link>
              ))}
              {newThisWeek.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No new competitors</div>
              )}
            </div>
          </div>

          {/* Movers */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-green-50">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Movers
              </h2>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {topSeoPerformers.slice(0, 5).map((c) => (
                <Link key={String(c._id)} href={`/competitors/${c._id}`} className="block px-4 py-2.5 hover:bg-hubspotTeal/5 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-sm truncate">{c.company_name || 'Unknown'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 shrink-0 ml-2">
                      {c.country_code || '—'}
                    </span>
                  </div>
                </Link>
              ))}
              {topSeoPerformers.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No movers detected</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Competitors This Week */}
      {newThisWeek.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-amber-50">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-amber-500 rounded-full">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              New Competitors This Week
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">Recently detected in your markets</p>
          </div>
          <div className="divide-y">
            <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-gray-50 text-gray-600 text-xs uppercase font-medium">
              <div>Company</div>
              <div>Market</div>
              <div>Type</div>
              <div></div>
            </div>
            {newThisWeek.map((c) => (
              <Link key={String(c._id)} href={`/competitors/${c._id}`} className="grid grid-cols-4 gap-4 px-5 py-3 hover:bg-hubspotTeal/5 cursor-pointer items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                    {(c.company_name || 'N').charAt(0)}
                  </div>
                  <div className="font-medium text-sm">{c.company_name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium">
                    {c.country_code || c.market || '—'}
                  </span>
                </div>
                <div className="text-gray-600 text-sm">{c.business_model || '—'}</div>
                <div className="text-hubspotTeal text-sm">View →</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Recent Activity</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest competitor updates</p>
          </div>
          <Link href="/competitors" className="text-sm text-hubspotTeal hover:underline">View all →</Link>
        </div>
        <div className="divide-y">
          {recentActivity.map((c) => (
            <Link key={String(c._id)} href={`/competitors/${c._id}`} className="block px-5 py-3 flex items-center justify-between hover:bg-hubspotTeal/5 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-hubspotTeal to-hubspotBlue flex items-center justify-center text-white font-medium text-sm">
                  {(c.company_name || 'U').charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-sm">{c.company_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{c.business_model || 'Uncategorized'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.country_code && (
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{c.country_code}</span>
                )}
                {c.content_marketing?.overall_rating === 'EXCELLENT' && (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">SEO ★</span>
                )}
                {c.social_media?.overall_presence === 'EXCELLENT' && (
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">Social ★</span>
                )}
              </div>
            </Link>
          ))}
          {recentActivity.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  )
}
