import Link from 'next/link'
import { getDatabase, getCollectionName } from '../../../lib/mongodb'
import { ObjectId } from 'mongodb'
import CompetitorUpload from './CompetitorUpload'
import UnclassifiedPanel from './UnclassifiedPanel'

export const dynamic = 'force-dynamic'

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  const mo = Math.floor(d / 30)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  if (d < 30) return `${d}d ago`
  return `${mo}mo ago`
}

function getRiskLevel(doc) {
  const rating = doc.content_overall_rating || doc.content_marketing?.overall_rating
  if (rating === 'EXCELLENT') return 'HIGH'
  if (rating === 'GOOD') return 'MEDIUM'
  if (rating === 'MODERATE') return 'MEDIUM'
  return 'LOW'
}


const RISK_STYLES = {
  HIGH: 'bg-red-50 text-red-600 border border-red-200',
  MEDIUM: 'bg-blue-50 text-blue-600 border border-blue-200',
  LOW: 'bg-gray-100 text-gray-500 border border-gray-200',
}


export default async function CompetitorMatrixPage({ searchParams }) {
  const sp = await searchParams
  const market = sp?.market?.toUpperCase() || ''
  const q = (sp?.q || '').trim()
  const page = Math.max(1, parseInt(sp?.page || '1'))
  const limit = 10

  const db = await getDatabase()
  const col = db.collection(getCollectionName())

  // Base filter: only real competitor docs (exclude meta/analysis records).
  // Some docs in dcor_competitors are report headers (e.g. analysis_metadata,
  // comprehensive_summary_analysis) — they have no `domain` field.
  const baseFilter = {
    domain: { $exists: true, $nin: [null, ''] },
  }

  // Search filter (combined with base filter before grouping)
  const searchFilter = q
    ? {
        ...baseFilter,
        $or: [
          { company_name: { $regex: q, $options: 'i' } },
          { website: { $regex: q, $options: 'i' } },
          { domain: { $regex: q, $options: 'i' } },
        ],
      }
    : baseFilter

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000)
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const dayMinId = ObjectId.createFromTime(Math.floor(dayAgo.getTime() / 1000))

  const trackingCol = db.collection('dcomp_domain_tracking')
  const blocklistCol = db.collection('dcomp_blocklist')
  const seedsCol = db.collection('dcomp_seeds')

  // Group by domain so a single domain across multiple markets shows as one row.
  const groupPipeline = [
    { $match: searchFilter },
    {
      $group: {
        _id: '$domain',
        primary_id: { $first: '$_id' },
        domain: { $first: '$domain' },
        website: { $first: '$website' },
        company_name: { $first: '$company_name' },
        country_codes: { $addToSet: '$country_code' },
        markets: { $addToSet: '$market' },
        best_rank: { $min: '$rank' },
        avg_rank: { $avg: '$rank' },
        latest_id: { $max: '$_id' },
        content_overall_rating: { $first: '$content_marketing.overall_rating' },
        content_activity_level: { $first: '$content_marketing.activity_level' },
        record_count: { $sum: 1 },
      }
    },
    ...(market ? [{ $match: { country_codes: market } }] : []),
    { $sort: { best_rank: 1, company_name: 1 } },
  ]

  const [groupedTotalAgg, groupedItems, newTodayAgg, keywordCount, topMarketAgg, blockedDomains, seedDomains, competitorDomains] = await Promise.all([
    col.aggregate([...groupPipeline, { $count: 'n' }]).toArray(),
    col.aggregate([...groupPipeline, { $skip: (page - 1) * limit }, { $limit: limit }]).toArray(),
    // new-today: domains that have ANY record created in the last 24h
    col.aggregate([
      { $match: { ...baseFilter, _id: { $gte: dayMinId } } },
      { $group: { _id: '$domain' } },
      { $count: 'n' },
    ]).toArray().catch(() => []),
    db.collection('dcomp_keywords').countDocuments({ status: 'active' }).catch(() => 0),
    col.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$country_code', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).toArray(),
    blocklistCol.distinct('domain').catch(() => []),
    seedsCol.distinct('domain').catch(() => []),
    col.distinct('domain', baseFilter).catch(() => []),
  ])

  const total = groupedTotalAgg[0]?.n || 0
  const items = groupedItems
  const newToday = newTodayAgg[0]?.n || 0
  const avgDA = Math.round(
    items.length ? items.reduce((s, it) => s + (it.avg_rank || 0), 0) / items.length : 0
  )

  const excluded = Array.from(new Set([...blockedDomains, ...seedDomains, ...competitorDomains]))

  const unclassifiedDomains = await trackingCol.aggregate([
    { $match: { domain: { $nin: excluded } } },
    { $sort: { last_seen: -1, _id: -1 } },
    {
      $group: {
        _id: { domain: '$domain', keyword: '$keyword', market: '$market' },
        domain: { $first: '$domain' },
        keyword: { $first: '$keyword' },
        market: { $first: '$market' },
        latest_position: { $first: '$current_position' },
        last_seen: { $max: '$last_seen' },
        is_known: { $first: '$is_known' },
      }
    },
    {
      $group: {
        _id: '$domain',
        domain: { $first: '$domain' },
        keyword_count: { $sum: 1 },
        avg_position: { $avg: '$latest_position' },
        best_position: { $min: '$latest_position' },
        markets: { $addToSet: '$market' },
        last_seen: { $max: '$last_seen' },
        sample_keywords: { $addToSet: '$keyword' },
        is_known: { $max: '$is_known' },
      }
    },
    { $match: { is_known: { $ne: true } } },
    { $sort: { keyword_count: -1, avg_position: 1 } },
    { $limit: 100 },
  ]).toArray().catch(() => [])

  const unclassifiedSerialized = unclassifiedDomains.map(d => ({
    domain: d.domain,
    keyword_count: d.keyword_count,
    avg_position: d.avg_position,
    best_position: d.best_position,
    markets: d.markets,
    last_seen: d.last_seen ? new Date(d.last_seen).toISOString() : null,
    sample_keywords: d.sample_keywords,
  }))

  const topMarket = topMarketAgg[0]?._id || 'SE'
  const totalPages = Math.ceil(total / limit)
  const maxRank = items.reduce((m, d) => Math.max(m, d.best_rank || 0), 1)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Competitor Intelligence Matrix</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time entrant detection and authority momentum across EMEA clusters.</p>
        </div>
        <div className="flex items-center gap-8 text-right">
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Total Tracked</div>
            <div className="text-2xl font-bold text-gray-900 leading-tight">
              {total.toLocaleString()} <span className="text-sm font-normal text-gray-400">Domains</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">New Entrants (24h)</div>
            <div className="text-2xl font-bold text-gray-900 leading-tight flex items-baseline gap-1.5">
              {newToday}
              {newToday > 0 && (
                <span className="text-sm font-semibold text-emerald-600">+{Math.round(newToday / Math.max(total, 1) * 100)}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">STABLE</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{avgDA || '—'}</div>
          <div className="text-xs text-gray-500 mt-1">Avg Domain Authority</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500">HIGH RISK</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{String(newToday).padStart(2, '0')}</div>
          <div className="text-xs text-gray-500 mt-1">High Velocity Entrants</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">EXPANDING</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 font-mono">.{topMarket.toLowerCase()}</div>
          <div className="text-xs text-gray-500 mt-1">Top Target Market</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">SENSORS</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{keywordCount}</div>
          <div className="text-xs text-gray-500 mt-1">Active Sensor Nodes</div>
        </div>
      </div>

      {/* Unclassified signals triage */}
      <UnclassifiedPanel initialDomains={unclassifiedSerialized} />

      {/* Intelligence Matrix table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-[15px]">Intelligence Matrix</h2>
          <div className="flex items-center gap-2">
            <form method="GET" className="relative">
              {market && <input type="hidden" name="market" value={market.toLowerCase()} />}
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="q"
                defaultValue={q}
                placeholder="Filter domains…"
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
              />
            </form>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort
            </button>
            <CompetitorUpload />
          </div>
        </div>

        {/* Column headers */}
        <div className="grid gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50" style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.5fr' }}>
          {['COMPETITOR DOMAIN', 'MARKET PENETRATION', 'DA SCORE', 'RISK LEVEL', 'ACTIONS'].map(h => (
            <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</div>
          ))}
        </div>

        {/* Rows */}
        {items.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">No domains found</div>
        ) : (
          items.map(doc => {
            const primaryId = doc.primary_id || doc.latest_id || doc._id
            const latestId = doc.latest_id || doc.primary_id
            const latestIdStr = String(latestId)
            const isRealObjectId = /^[a-f0-9]{24}$/.test(latestIdStr)
            const createdAt = isRealObjectId ? new ObjectId(latestIdStr).getTimestamp() : null
            const isNew = createdAt ? createdAt > weekAgo : false
            const risk = getRiskLevel(doc)
            const da = Math.round(doc.best_rank || 0)
            const countryCodes = (doc.country_codes || []).filter(Boolean).sort()
            const detailId = String(primaryId)

            return (
              <div
                key={String(doc._id)}
                className="grid gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors items-center"
                style={{ gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.5fr' }}
              >
                {/* Domain */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/competitors/${detailId}`}
                        className="font-semibold text-[13px] text-gray-900 hover:text-[#1a3a5c] truncate"
                      >
                        {doc.domain || doc.website || doc.company_name || 'Unknown'}
                      </Link>
                      {isNew && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
                          NEW
                        </span>
                      )}
                      {doc.record_count > 1 && (
                        <span
                          title={`${doc.record_count} records merged across ${countryCodes.length} markets`}
                          className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200"
                        >
                          ×{doc.record_count}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {doc.company_name && doc.company_name !== doc.domain
                        ? doc.company_name
                        : (createdAt ? `First detected: ${timeAgo(createdAt)}` : '—')}
                    </div>
                  </div>
                </div>

                {/* Market penetration — all countries as pills */}
                <div className="flex flex-wrap gap-1">
                  {countryCodes.length === 0 ? (
                    <span className="text-[10px] text-gray-300">—</span>
                  ) : (
                    countryCodes.map(m => (
                      <span
                        key={m}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border font-mono uppercase ${
                          market && m === market
                            ? 'border-[#1a3a5c] text-white bg-[#1a3a5c]'
                            : 'border-teal-200 text-teal-600 bg-teal-50'
                        }`}
                      >
                        .{m.toLowerCase()}
                      </span>
                    ))
                  )}
                </div>

                {/* DA Score */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 w-7 shrink-0">{da}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1a3a5c]"
                        style={{ width: `${Math.round((da / Math.max(maxRank, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Risk level */}
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${RISK_STYLES[risk]}`}>
                    {risk}
                  </span>
                </div>

                {/* Actions */}
                <div>
                  <Link
                    href={`/competitors/${detailId}`}
                    className="text-[11px] text-[#1a3a5c] font-medium hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
            )
          })
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400">
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total.toLocaleString()} domains
          </span>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...(q && { q }), ...(market && { market: market.toLowerCase() }), page: String(page - 1) })}`}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-800 transition-colors text-sm"
              >
                ‹
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...(q && { q }), ...(market && { market: market.toLowerCase() }), page: String(page + 1) })}`}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-800 transition-colors text-sm"
              >
                ›
              </Link>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
