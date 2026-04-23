import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { getDatabase, getCollectionName } from '../../../../lib/mongodb'
import CopyUrlButton from '../../../../components/CopyUrlButton'
import CompetitorActions from './CompetitorActions'
import MarketBreakdown from './MarketBreakdown'
import QuadrantChart from '../../../../components/charts/QuadrantChart'

export const dynamic = 'force-dynamic'

const EMEA_MARKETS = ['DK', 'NO', 'FI', 'SE', 'DE', 'FR', 'IT', 'ES']
const MARKET_COLORS = {
  DK: '#ef4444', NO: '#3b82f6', FI: '#06b6d4', SE: '#10b981',
  DE: '#f59e0b', FR: '#8b5cf6', IT: '#ec4899', ES: '#f97316',
}

async function getCompetitor(id) {
  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  const orFilters = [{ _id: id }]
  if (/^[a-f0-9]{24}$/.test(id)) {
    try { orFilters.push({ _id: new ObjectId(id) }) } catch {}
  }

  return col.findOne({ $or: orFilters })
}

async function getMarketStats(domain) {
  if (!domain) return []
  const db = await getDatabase()
  const tracking = db.collection('dcomp_domain_tracking')

  return tracking.aggregate([
    { $match: { domain } },
    { $sort: { last_seen: -1, _id: -1 } },
    // Deduplicate by (keyword, market) — keep latest observation per signal
    {
      $group: {
        _id: { keyword: '$keyword', market: '$market' },
        market: { $first: '$market' },
        latest_position: { $first: '$current_position' },
        oldest_position: { $last: '$current_position' },
        best_position: { $min: '$current_position' },
        first_seen: { $min: '$first_seen' },
        last_seen: { $max: '$last_seen' },
        is_known: { $first: '$is_known' },
      }
    },
    // Roll up per market
    {
      $group: {
        _id: '$market',
        market: { $first: '$market' },
        signal_count: { $sum: 1 },
        avg_position: { $avg: '$latest_position' },
        best_position: { $min: '$best_position' },
        position_delta: { $avg: { $subtract: ['$latest_position', '$oldest_position'] } },
        first_seen: { $min: '$first_seen' },
        last_seen: { $max: '$last_seen' },
        has_new_signal: { $max: { $cond: [{ $eq: ['$is_known', false] }, 1, 0] } },
      }
    },
    { $sort: { signal_count: -1 } },
  ]).toArray().catch(() => [])
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '—' }
}

function timeAgo(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function positionColor(pos) {
  if (!pos) return 'text-gray-400'
  if (pos <= 3) return 'text-emerald-600'
  if (pos <= 10) return 'text-blue-600'
  if (pos <= 20) return 'text-amber-600'
  return 'text-gray-500'
}

const ACTIVITY_STYLES = {
  'VERY ACTIVE': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ACTIVE BLOGGER': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ACTIVE': 'bg-blue-50 text-blue-700 border-blue-200',
  'MODERATE': 'bg-amber-50 text-amber-700 border-amber-200',
  'LIMITED': 'bg-gray-100 text-gray-500 border-gray-200',
  'MINIMAL': 'bg-gray-100 text-gray-500 border-gray-200',
}

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900 text-[14px]">{title}</h2>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-4 py-2 border-b border-gray-50 last:border-b-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-32 shrink-0 pt-1">{label}</div>
      <div className={`text-[13px] text-gray-800 flex-1 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

export default async function CompetitorDetailPage({ params }) {
  const { id } = await params
  const competitor = await getCompetitor(id)

  if (!competitor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Competitor not found</h1>
        <p className="text-sm text-gray-500 mb-4">No record matches <span className="font-mono text-gray-700">{id}</span>.</p>
        <Link href="/competitors" className="text-sm text-[#1a3a5c] font-medium hover:underline">
          ← Back to Intelligence Matrix
        </Link>
      </div>
    )
  }

  const domain = competitor.domain || competitor.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]

  const rawMarketStats = await getMarketStats(domain)
  const marketStats = rawMarketStats.map(m => ({
    market: m.market,
    color: MARKET_COLORS[m.market] || '#64748b',
    signal_count: m.signal_count,
    avg_position: m.avg_position,
    best_position: m.best_position,
    position_delta: m.position_delta,
    first_seen: m.first_seen,
    last_seen: m.last_seen ? new Date(m.last_seen).toISOString() : null,
    has_new_signal: m.has_new_signal > 0,
  }))

  // Snapshot metrics
  const totalSignals = marketStats.reduce((s, m) => s + m.signal_count, 0)
  const marketsPresent = marketStats.length
  const weightedAvgPosition = totalSignals > 0
    ? marketStats.reduce((s, m) => s + (m.avg_position || 0) * m.signal_count, 0) / totalSignals
    : 0
  const bestPosition = marketStats.length ? Math.min(...marketStats.map(m => m.best_position || 999)) : null
  const lastSeenMs = marketStats.reduce((max, m) => {
    const d = m.last_seen ? new Date(m.last_seen).getTime() : 0
    return d > max ? d : max
  }, 0)

  // Build quadrant data — one dot per market
  const maxSignals = Math.max(1, ...marketStats.map(m => m.signal_count))
  const quadrantDomains = marketStats.map(m => {
    const x = Math.min(98, Math.max(2, Math.round((m.signal_count / maxSignals) * 100)))
    const avgPos = m.avg_position || 50
    const y = Math.min(98, Math.max(2, Math.round(100 - ((avgPos - 1) / 19) * 100)))
    return {
      domain: `.${m.market.toLowerCase()}`,
      market: m.market,
      x,
      y,
      color: m.color,
      isNew: m.has_new_signal,
      keywordCount: m.signal_count,
      avgPosition: Math.round(avgPos * 10) / 10,
      positionDelta: Math.round((m.position_delta || 0) * 10) / 10,
      history: [],
    }
  })

  const cm = competitor.content_marketing || {}
  const social = competitor.social_media || {}
  const strengths = competitor.competitive_strengths || []
  const weaknesses = competitor.competitive_weaknesses || []
  const recentPosts = cm.recent_blog_posts || []
  const uniquePositioning = competitor.unique_positioning || {}

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500">
        <Link href="/competitors" className="hover:text-[#1a3a5c]">Competitors</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{competitor.company_name || domain}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8a] text-white flex items-center justify-center text-xl font-bold shrink-0">
              {(competitor.company_name || domain || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 truncate">{competitor.company_name || domain}</h1>
                {competitor.country_code && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-teal-200 text-teal-600 bg-teal-50 font-mono">
                    .{competitor.country_code.toLowerCase()}
                  </span>
                )}
                {typeof competitor.rank === 'number' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50">
                    Rank #{competitor.rank}
                  </span>
                )}
                {competitor.type && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200 text-blue-600 bg-blue-50">
                    {competitor.type}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[13px] text-gray-500 font-mono">{domain || '—'}</span>
                {domain && (
                  <CopyUrlButton
                    value={`https://${domain}`}
                    label=""
                    className="p-1 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  />
                )}
              </div>
              {competitor.positioning && (
                <p className="text-[13px] text-gray-600 mt-2 max-w-2xl">{competitor.positioning}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <CompetitorActions domain={domain} />
            {competitor.dcor_site && (
              <div className="text-[11px] text-gray-400">
                Paired with <span className="font-mono text-gray-600">{competitor.dcor_site}</span>
              </div>
            )}
          </div>
        </div>

        {/* Snapshot strip */}
        <div className="grid grid-cols-5 border-t border-gray-100 divide-x divide-gray-100 bg-gray-50">
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Markets present</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">
              {marketsPresent}
              <span className="text-sm font-normal text-gray-400"> / {EMEA_MARKETS.length}</span>
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Signal density</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{totalSignals}</div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Avg position</div>
            <div className={`text-xl font-bold mt-0.5 ${positionColor(Math.round(weightedAvgPosition))}`}>
              {totalSignals ? weightedAvgPosition.toFixed(1) : '—'}
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Best rank</div>
            <div className={`text-xl font-bold mt-0.5 ${positionColor(bestPosition)}`}>
              {bestPosition ? `#${bestPosition}` : '—'}
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Last sensor ping</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{lastSeenMs ? timeAgo(lastSeenMs) : '—'}</div>
          </div>
        </div>
      </div>

      {/* Market Reach illustration */}
      <SectionCard
        title="Market Reach"
        subtitle={marketsPresent > 0
          ? `Active in ${marketsPresent} of ${EMEA_MARKETS.length} EMEA markets`
          : 'No market presence detected yet'}
      >
        <div className="grid grid-cols-8 gap-2">
          {EMEA_MARKETS.map(code => {
            const stat = marketStats.find(m => m.market === code)
            const present = !!stat
            return (
              <div
                key={code}
                className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                  present
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-dashed border-gray-200 bg-gray-50 text-gray-300'
                }`}
                style={present ? { backgroundColor: MARKET_COLORS[code] } : {}}
              >
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                  .{code.toLowerCase()}
                </div>
                <div className={`text-lg font-bold mt-0.5 ${present ? '' : 'text-gray-300'}`}>
                  {present ? stat.signal_count : '–'}
                </div>
                <div className={`text-[9px] uppercase tracking-wider font-semibold ${present ? 'opacity-80' : ''}`}>
                  {present ? 'signals' : 'absent'}
                </div>
                {present && stat.has_new_signal && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-orange-400 ring-2 ring-white" title="New signal detected" />
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* LEFT */}
        <div className="space-y-5 min-w-0">
          {/* Per-market quadrant */}
          <SectionCard
            title="Market Infiltration by Country"
            subtitle="Each dot represents a country — position = average SERP rank · reach = signal density"
          >
            {quadrantDomains.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                No sensor data yet for this domain.<br />
                <span className="text-[11px] text-gray-400">Run the n8n collector to populate this.</span>
              </div>
            ) : (
              <div className="h-[360px] -mx-2">
                <QuadrantChart domains={quadrantDomains} />
              </div>
            )}
          </SectionCard>

          {/* Country breakdown — sortable */}
          <SectionCard
            title="Country Breakdown"
            subtitle="Per-country performance • sortable"
          >
            <MarketBreakdown markets={marketStats} />
          </SectionCard>

          {/* Positioning */}
          {(competitor.business_model || competitor.product_focus || competitor.positioning || competitor.brand_positioning || competitor.target_audience) && (
            <SectionCard title="Positioning" subtitle="Market position and value proposition">
              <InfoRow label="Business model" value={competitor.business_model} />
              <InfoRow label="Product focus" value={competitor.product_focus} />
              <InfoRow label="Positioning" value={competitor.positioning} />
              <InfoRow
                label="Brand positioning"
                value={typeof competitor.brand_positioning === 'string'
                  ? competitor.brand_positioning
                  : competitor.brand_positioning?.statement || competitor.brand_positioning?.description}
              />
              <InfoRow
                label="Target audience"
                value={typeof competitor.target_audience === 'string'
                  ? competitor.target_audience
                  : Array.isArray(competitor.target_audience)
                    ? competitor.target_audience.join(', ')
                    : competitor.target_audience?.primary}
              />
            </SectionCard>
          )}

          {/* Strengths & Weaknesses */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid grid-cols-2 gap-5">
              {strengths.length > 0 && (
                <SectionCard title="Competitive Strengths">
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
              {weaknesses.length > 0 && (
                <SectionCard title="Weaknesses">
                  <ul className="space-y-2">
                    {weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>
          )}

          {/* Content Marketing */}
          {Object.keys(cm).length > 0 && (
            <SectionCard
              title="Content Marketing"
              subtitle={cm.blog_status || cm.content_strategy}
              actions={cm.activity_level && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${ACTIVITY_STYLES[cm.activity_level] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {cm.activity_level}
                </span>
              )}
            >
              <div className="space-y-0">
                <InfoRow label="Blog status" value={cm.blog_status} />
                <InfoRow label="Blog URL" value={cm.blog_url && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-gray-600 truncate">{cm.blog_url}</span>
                    <CopyUrlButton
                      value={cm.blog_url}
                      label=""
                      className="shrink-0 p-1 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    />
                  </div>
                )} />
                <InfoRow label="Update frequency" value={cm.update_frequency} />
                <InfoRow label="Latest post" value={cm.latest_post_date ? formatDate(cm.latest_post_date) : null} />
                <InfoRow label="Content volume" value={cm.content_volume} />
                <InfoRow label="Consistency" value={cm.content_consistency} />
              </div>

              {recentPosts.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent posts</div>
                  <div className="space-y-2">
                    {recentPosts.slice(0, 6).map((p, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-b-0">
                        <div className="text-[11px] font-mono text-gray-400 w-20 shrink-0 pt-0.5">{formatDate(p.date)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-gray-800">{p.title}</div>
                          {p.description && <div className="text-[11px] text-gray-500 mt-0.5">{p.description}</div>}
                        </div>
                        {p.type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                            {p.type}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Unique Positioning */}
          {Object.keys(uniquePositioning).length > 0 && (
            <SectionCard title="Unique Positioning">
              <div className="space-y-0">
                {Object.entries(uniquePositioning).map(([k, v]) => (
                  <InfoRow
                    key={k}
                    label={k.replace(/_/g, ' ')}
                    value={typeof v === 'string' ? v : JSON.stringify(v)}
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-5">
          <SectionCard title="Quick Links" subtitle="Copy-only — direct links disabled for privacy">
            <div className="space-y-2">
              {competitor.website && (
                <CopyUrlButton
                  value={competitor.website}
                  label="Website URL"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                />
              )}
              {cm.blog_url && (
                <CopyUrlButton
                  value={cm.blog_url}
                  label="Blog URL"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                />
              )}
              {social.facebook?.page_url && (
                <CopyUrlButton
                  value={social.facebook.page_url}
                  label="Facebook page"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                />
              )}
              {social.facebook?.url && !social.facebook?.page_url && (
                <CopyUrlButton
                  value={social.facebook.url}
                  label="Facebook"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                />
              )}
              {social.instagram?.handle && (
                <CopyUrlButton
                  value={`https://instagram.com/${String(social.instagram.handle).replace(/^@/, '')}`}
                  label={`Instagram ${social.instagram.handle}`}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                />
              )}
            </div>
          </SectionCard>

          {Object.keys(social).length > 0 && (
            <SectionCard title="Social Presence">
              <div className="space-y-0">
                {social.facebook && (
                  <InfoRow
                    label="Facebook"
                    value={<span className="text-[12px]">{social.facebook.presence || 'Active'}{social.facebook.community_group?.members && ` • ${social.facebook.community_group.members}`}</span>}
                  />
                )}
                {social.instagram && (
                  <InfoRow label="Instagram" value={social.instagram.handle || social.instagram.presence} />
                )}
                {social.presence && !social.facebook && !social.instagram && (
                  <InfoRow label="Presence" value={social.presence} />
                )}
                {social.strategy && <InfoRow label="Strategy" value={social.strategy} />}
                {social.engagement && <InfoRow label="Engagement" value={social.engagement} />}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Metadata">
            <div className="space-y-0">
              <InfoRow label="Record ID" value={<span className="font-mono text-[11px] break-all">{String(competitor._id)}</span>} />
              <InfoRow label="Market" value={competitor.market} />
              <InfoRow label="Country" value={competitor.country_code} />
              <InfoRow label="Paired dCor" value={competitor.dcor_site} />
              <InfoRow label="Analyst" value={competitor.analyst} />
              <InfoRow label="Analysis date" value={formatDate(competitor.analysis_date)} />
              <InfoRow label="Created" value={formatDate(competitor.created_at)} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
