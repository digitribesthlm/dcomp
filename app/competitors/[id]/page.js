import { getDatabase } from '../../../lib/mongodb'
import Link from 'next/link'

async function getCompetitor(id) {
  try {
    const db = await getDatabase()
    const collection = db.collection(process.env.COLLECTION_NAME || 'dcor_competitors')
    const competitor = await collection.findOne({ _id: id })
    return competitor
  } catch (error) {
    console.error('Error fetching competitor:', error)
    return null
  }
}

export default async function CompetitorDetailPage({ params }) {
  const competitor = await getCompetitor(params.id)

  if (!competitor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Competitor Not Found</h1>
          <Link href="/competitors" className="text-hubspotTeal hover:text-hubspotBlue">
            ← Back to Competitors
          </Link>
        </div>
      </div>
    )
  }

  const formatRating = (rating) => {
    const colors = {
      'EXCELLENT': 'bg-green-100 text-green-800 border-green-200',
      'VERY ACTIVE': 'bg-green-100 text-green-800 border-green-200',
      'GOOD': 'bg-blue-100 text-blue-800 border-blue-200',
      'ACTIVE': 'bg-blue-100 text-blue-800 border-blue-200',
      'MODERATE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'LIMITED': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[rating] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-hubspotTeal to-hubspotBlue text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/competitors" className="text-white/80 hover:text-white transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {competitor.company_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h1 className="text-4xl font-bold">{competitor.company_name}</h1>
                  <div className="flex items-center space-x-4 mt-2 text-white/90">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {competitor.market}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Rank #{competitor.rank}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6" />
                      </svg>
                      {competitor.business_model}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {competitor.website && (
                <a 
                  href={competitor.website} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website
                </a>
              )}
              {competitor.content_marketing?.blog_url && (
                <a 
                  href={competitor.content_marketing.blog_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  View Blog
                </a>
              )}
              {competitor.social_media?.facebook?.url && (
                <a 
                  href={competitor.social_media.facebook.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Business Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-hubspotTeal/10 to-hubspotTeal/5 px-8 py-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="w-3 h-8 bg-hubspotTeal rounded-full mr-4"></div>
                  Business Overview
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Model & Focus</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Model:</span>
                        <span className="text-sm text-gray-900">{competitor.business_model}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Products:</span>
                        <span className="text-sm text-gray-900">{competitor.product_focus}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-500 w-24 flex-shrink-0">Position:</span>
                        <span className="text-sm text-gray-900">{competitor.positioning}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Audience</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{competitor.target_audience}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Marketing Analysis */}
            {competitor.content_marketing && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-green-100 px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <div className="w-3 h-8 bg-green-500 rounded-full mr-4"></div>
                      Content Marketing Analysis
                    </h2>
                    <div className="flex space-x-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${formatRating(competitor.content_marketing.overall_rating)}`}>
                        {competitor.content_marketing.overall_rating}
                      </span>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${formatRating(competitor.content_marketing.activity_level)}`}>
                        {competitor.content_marketing.activity_level}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Blog Strategy</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500">Update Frequency:</span>
                          <span className="text-sm font-semibold text-gray-900">{competitor.content_marketing.update_frequency}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500">Content Volume:</span>
                          <span className="text-sm font-semibold text-gray-900">{competitor.content_marketing.content_volume}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500">Latest Post:</span>
                          <span className="text-sm font-semibold text-gray-900">{competitor.content_marketing.latest_post_date}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-500 w-20 flex-shrink-0">Status:</span>
                          <span className="text-sm text-gray-700">{competitor.content_marketing.blog_status}</span>
                        </div>
                      </div>
                      
                      {competitor.content_marketing.blog_categories && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">Blog Categories</h4>
                          <div className="space-y-2">
                            {competitor.content_marketing.blog_categories.map((cat, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                <div className="font-medium text-gray-900 capitalize">{cat.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{cat.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {competitor.content_marketing.recent_blog_posts && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Blog Posts</h3>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {competitor.content_marketing.recent_blog_posts.slice(0, 8).map((post, idx) => (
                              <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 text-sm">{post.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{post.date} • {post.type}</div>
                                    {post.description && (
                                      <div className="text-xs text-gray-600 mt-2">{post.description}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {competitor.content_marketing.content_types && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-900 mb-3">Content Types</h4>
                          <div className="space-y-2">
                            {competitor.content_marketing.content_types.slice(0, 4).map((type, idx) => (
                              <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 text-sm">{type.type}</span>
                                  <span className="text-xs text-blue-600 font-medium">{type.frequency}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">{type.quality}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social Media Analysis */}
            {competitor.social_media && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <div className="w-3 h-8 bg-purple-500 rounded-full mr-4"></div>
                      Social Media Presence
                    </h2>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${formatRating(competitor.social_media.overall_presence)}`}>
                      {competitor.social_media.overall_presence}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {competitor.social_media.facebook && (
                      <div className="p-6 bg-blue-50 rounded-xl">
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Facebook</h3>
                            <p className="text-sm text-gray-600">{competitor.social_media.facebook.followers}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Activity:</span>
                            <span className="font-medium text-gray-900">{competitor.social_media.facebook.activity_level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Frequency:</span>
                            <span className="font-medium text-gray-900">{competitor.social_media.facebook.post_frequency}</span>
                          </div>
                          <div className="mt-3">
                            <span className="text-gray-600 text-xs">Strategy:</span>
                            <p className="text-xs text-gray-700 mt-1">{competitor.social_media.facebook.content_strategy}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {competitor.social_media.instagram && (
                      <div className="p-6 bg-pink-50 rounded-xl">
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297L3.323 17.49c-.49-.49-.49-1.297 0-1.787l1.803-1.803c-.807-.875-1.297-2.026-1.297-3.323c0-2.594 2.103-4.697 4.697-4.697s4.697 2.103 4.697 4.697c0 1.297-.49 2.448-1.297 3.323l1.803 1.803c.49.49.49 1.297 0 1.787l-1.803-1.803c-.875.807-2.026 1.297-3.323 1.297z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                            <p className="text-sm text-gray-600">{competitor.social_media.instagram.handle}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {competitor.social_media.instagram.features && (
                            <div>
                              <span className="text-gray-600 text-xs">Features:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {competitor.social_media.instagram.features.slice(0, 3).map((feature, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3">
                            <span className="text-gray-600 text-xs">Strategy:</span>
                            <p className="text-xs text-gray-700 mt-1">{competitor.social_media.instagram.strategy}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {competitor.social_media.strategy && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Overall Strategy</h4>
                      <p className="text-sm text-gray-700">{competitor.social_media.strategy}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEO & Technical Analysis */}
            {(competitor.content_marketing?.sitemap || competitor.seo_analysis || competitor.content_marketing?.blog_structure) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-3 h-8 bg-indigo-500 rounded-full mr-4"></div>
                    SEO & Technical Analysis
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {competitor.content_marketing?.sitemap && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sitemap Structure</h3>
                        <div className="space-y-3">
                          <div className="p-4 bg-indigo-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">Main Sitemap</span>
                              <a 
                                href={competitor.content_marketing.sitemap.main_sitemap} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 text-sm"
                              >
                                View →
                              </a>
                            </div>
                            <div className="text-sm text-gray-600">{competitor.content_marketing.sitemap.main_sitemap}</div>
                          </div>
                          
                          {competitor.content_marketing.sitemap.blog_sitemap && (
                            <div className="p-4 bg-green-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">Blog Sitemap</span>
                                <a 
                                  href={competitor.content_marketing.sitemap.blog_sitemap} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  View →
                                </a>
                              </div>
                              <div className="text-sm text-gray-600">{competitor.content_marketing.sitemap.blog_sitemap}</div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-500">Change Frequency</div>
                              <div className="text-lg font-bold text-gray-900 capitalize">{competitor.content_marketing.sitemap.changefreq}</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-500">Priority</div>
                              <div className="text-lg font-bold text-gray-900">{competitor.content_marketing.sitemap.priority}</div>
                            </div>
                          </div>
                          
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-900 mb-1">Structure Quality</div>
                            <div className="text-sm text-gray-700">{competitor.content_marketing.sitemap.structure}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      {competitor.content_marketing?.blog_structure && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Blog Structure</h3>
                          <div className="space-y-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-900 mb-1">Organization</div>
                              <div className="text-sm text-gray-700">{competitor.content_marketing.blog_structure.content_organization}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-900 mb-1">Post Format</div>
                              <div className="text-sm text-gray-700">{competitor.content_marketing.blog_structure.post_format}</div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm font-medium text-gray-900 mb-1">SEO Optimization</div>
                              <div className="text-sm text-gray-700">{competitor.content_marketing.blog_structure.seo_optimization}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {competitor.seo_analysis && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Analysis</h3>
                          <div className="space-y-3">
                            {Object.entries(competitor.seo_analysis).map(([key, value], idx) => (
                              <div key={idx} className="p-3 bg-yellow-50 rounded-lg">
                                <div className="text-sm font-medium text-gray-900 capitalize mb-1">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-gray-700">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Examples */}
            {competitor.content_examples && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-3 h-8 bg-orange-500 rounded-full mr-4"></div>
                    Content Examples
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 gap-6">
                    {competitor.content_examples.map((example, idx) => (
                      <div key={idx} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{example.title}</h3>
                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full mt-2">
                              {example.type}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-500">Target Audience</div>
                            <div className="text-sm text-gray-900">{example.target_audience}</div>
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{example.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Content Quality:</span>
                          <span className="text-sm font-medium text-green-600">{example.content_quality}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Competitive Analysis */}
            {(competitor.competitive_strengths || competitor.competitive_weaknesses) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-3 h-8 bg-yellow-500 rounded-full mr-4"></div>
                    Competitive Analysis
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {competitor.competitive_strengths && (
                      <div>
                        <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Strengths
                        </h3>
                        <div className="space-y-3">
                          {competitor.competitive_strengths.map((strength, idx) => (
                            <div key={idx} className="flex items-start p-3 bg-green-50 rounded-lg">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700">{strength}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {competitor.competitive_weaknesses && (
                      <div>
                        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Weaknesses
                        </h3>
                        <div className="space-y-3">
                          {competitor.competitive_weaknesses.map((weakness, idx) => (
                            <div key={idx} className="flex items-start p-3 bg-red-50 rounded-lg">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700">{weakness}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-hubspotTeal/10 to-hubspotTeal/5 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Quick Facts</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Domain</span>
                  <span className="text-sm font-semibold text-gray-900">{competitor.domain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Market</span>
                  <span className="text-sm font-semibold text-gray-900">{competitor.market}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Country</span>
                  <span className="text-sm font-semibold text-gray-900">{competitor.country_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Rank</span>
                  <span className="text-sm font-semibold text-gray-900">#{competitor.rank}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-hubspotBlue/10 to-hubspotBlue/5 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                {competitor.website && (
                  <a 
                    href={competitor.website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center px-4 py-3 bg-hubspotTeal text-white rounded-lg hover:bg-hubspotTeal/90 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Website
                  </a>
                )}
                {competitor.content_marketing?.blog_url && (
                  <a 
                    href={competitor.content_marketing.blog_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    View Blog
                  </a>
                )}
                {competitor.social_media?.facebook?.url && (
                  <a 
                    href={competitor.social_media.facebook.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook Page
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Business Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Business Model</h3>
                  <p className="text-gray-600">{competitor.business_model}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Product Focus</h3>
                  <p className="text-gray-600">{competitor.product_focus}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Positioning</h3>
                  <p className="text-gray-600">{competitor.positioning}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Target Audience</h3>
                  <p className="text-gray-600">{competitor.target_audience}</p>
                </div>
              </div>
            </div>

            {/* Content Marketing Analysis */}
            {competitor.content_marketing && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Content Marketing</h2>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      competitor.content_marketing.overall_rating === 'EXCELLENT' 
                        ? 'bg-green-100 text-green-800'
                        : competitor.content_marketing.overall_rating === 'GOOD'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {competitor.content_marketing.overall_rating}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      competitor.content_marketing.activity_level === 'VERY ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {competitor.content_marketing.activity_level}
                    </span>
                  </div>
                </div>

                {/* Blog Analysis */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Blog Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Update Frequency</div>
                      <div className="font-semibold">{competitor.content_marketing.update_frequency}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Content Volume</div>
                      <div className="font-semibold">{competitor.content_marketing.content_volume}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Latest Post</div>
                      <div className="font-semibold">{competitor.content_marketing.latest_post_date}</div>
                    </div>
                  </div>
                  
                  {competitor.content_marketing.blog_categories && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Blog Categories</h4>
                      <div className="space-y-2">
                        {competitor.content_marketing.blog_categories.map((category, index) => (
                          <div key={index} className="border-l-4 border-hubspotTeal pl-4">
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-gray-600">{category.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Blog Posts */}
                {competitor.content_marketing.recent_blog_posts && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Recent Blog Posts</h4>
                    <div className="space-y-3">
                      {competitor.content_marketing.recent_blog_posts.slice(0, 5).map((post, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-2 h-2 bg-hubspotTeal rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{post.title}</div>
                            <div className="text-sm text-gray-600">{post.date} • {post.type}</div>
                            {post.description && (
                              <div className="text-sm text-gray-500 mt-1">{post.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Types */}
                {competitor.content_marketing.content_types && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Content Types</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {competitor.content_marketing.content_types.map((type, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="font-medium text-gray-900">{type.type}</div>
                          <div className="text-sm text-gray-600 mb-2">Frequency: {type.frequency}</div>
                          <div className="text-sm text-gray-500">{type.quality}</div>
                          {type.examples && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500">Examples:</div>
                              <div className="text-xs text-gray-600">{type.examples.join(', ')}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Social Media Analysis */}
            {competitor.social_media && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Social Media Presence</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    competitor.social_media.overall_presence === 'EXCELLENT'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {competitor.social_media.overall_presence}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {competitor.social_media.facebook && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">f</span>
                        </div>
                        <div>
                          <div className="font-medium">Facebook</div>
                          <div className="text-sm text-gray-600">{competitor.social_media.facebook.followers}</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Activity:</span> {competitor.social_media.facebook.activity_level}</div>
                        <div><span className="font-medium">Frequency:</span> {competitor.social_media.facebook.post_frequency}</div>
                        <div><span className="font-medium">Strategy:</span> {competitor.social_media.facebook.content_strategy}</div>
                      </div>
                    </div>
                  )}

                  {competitor.social_media.instagram && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
                          <span className="text-white text-sm font-bold">ig</span>
                        </div>
                        <div>
                          <div className="font-medium">Instagram</div>
                          <div className="text-sm text-gray-600">{competitor.social_media.instagram.handle}</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Strategy:</span> {competitor.social_media.instagram.strategy}</div>
                        {competitor.social_media.instagram.features && (
                          <div>
                            <span className="font-medium">Features:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {competitor.social_media.instagram.features.map((feature, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">{feature}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitive Analysis */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Competitive Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {competitor.competitive_strengths && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {competitor.competitive_strengths.map((strength, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {competitor.competitive_weaknesses && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Weaknesses
                    </h3>
                    <ul className="space-y-2">
                      {competitor.competitive_weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Facts */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Facts</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">Domain</div>
                  <div className="font-medium">{competitor.domain}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Market</div>
                  <div className="font-medium">{competitor.market}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Country</div>
                  <div className="font-medium">{competitor.country_code}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Rank</div>
                  <div className="font-medium">#{competitor.rank}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">dCor Site</div>
                  <div className="font-medium">{competitor.dcor_site}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <a 
                  href={competitor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-hubspotTeal text-white px-4 py-2 rounded-lg hover:bg-hubspotBlue transition-colors text-center block"
                >
                  Visit Website
                </a>
                {competitor.content_marketing?.blog_url && (
                  <a 
                    href={competitor.website + competitor.content_marketing.blog_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-center block"
                  >
                    View Blog
                  </a>
                )}
                {competitor.social_media?.facebook?.url && (
                  <a 
                    href={competitor.social_media.facebook.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                  >
                    Facebook Page
                  </a>
                )}
              </div>
            </div>

            {/* SEO Analysis */}
            {competitor.content_marketing?.seo_analysis && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">SEO Analysis</h3>
                <div className="space-y-3 text-sm">
                  {Object.entries(competitor.content_marketing.seo_analysis).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                      <div className="font-medium text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


