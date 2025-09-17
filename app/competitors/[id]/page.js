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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/competitors" className="text-hubspotTeal hover:text-hubspotBlue">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{competitor.company_name}</h1>
                <p className="text-gray-600 mt-1">{competitor.market} • Rank #{competitor.rank}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href={competitor.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-hubspotTeal text-white px-6 py-2 rounded-lg hover:bg-hubspotBlue transition-colors"
              >
                Visit Website
              </a>
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


