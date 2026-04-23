'use client'

import { useState } from 'react'

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const MARKET_COLORS = {
  SE: 'bg-blue-50 text-blue-600 border-blue-200',
  NO: 'bg-red-50 text-red-600 border-red-200',
  DK: 'bg-amber-50 text-amber-700 border-amber-200',
  FI: 'bg-teal-50 text-teal-600 border-teal-200',
  DE: 'bg-gray-100 text-gray-700 border-gray-300',
  FR: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  IT: 'bg-green-50 text-green-700 border-green-200',
  ES: 'bg-orange-50 text-orange-600 border-orange-200',
}

function MarketPill({ code, highlight }) {
  const base = MARKET_COLORS[code] || 'bg-gray-100 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${base} ${highlight ? 'ring-2 ring-offset-1 ring-orange-400' : ''}`}>
      .{code.toLowerCase()}
    </span>
  )
}

export default function MarketExpansionRadar({ groups = [] }) {
  const [expanded, setExpanded] = useState(false)

  const alerts = groups.filter(g => g.new_market_entries.length > 0)
  const rest = groups.filter(g => g.new_market_entries.length === 0)
  const visible = expanded ? groups : groups.slice(0, 6)
  const hasMore = groups.length > 6

  if (groups.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-[14px] text-gray-900">Market Expansion Radar</span>
            <span className="ml-2 text-xs text-gray-400">Brands detected across multiple markets</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {alerts.length > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {alerts.length} new market {alerts.length === 1 ? 'entry' : 'entries'} detected
            </span>
          )}
          <span className="text-[11px] text-gray-400">{groups.length} brands</span>
        </div>
      </div>

      {/* Grid */}
      <div className="divide-y divide-gray-50">
        {visible.map(g => {
          const hasAlert = g.new_market_entries.length > 0
          const newMarketCodes = new Set(g.new_market_entries.map(e => e.market))

          return (
            <div
              key={g.brand}
              className={`px-5 py-3.5 flex items-start gap-4 ${hasAlert ? 'bg-orange-50/40' : 'hover:bg-gray-50/60'} transition-colors`}
            >
              {/* Status indicator */}
              <div className="shrink-0 mt-0.5">
                {hasAlert ? (
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />
                )}
              </div>

              {/* Brand name + domains */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13px] text-gray-900">{g.brand}</span>
                  {hasAlert && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded">
                      NEW MARKET
                    </span>
                  )}
                  {g.is_known && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[#1a3a5c]/10 text-[#1a3a5c] px-1.5 py-0.5 rounded">
                      Known
                    </span>
                  )}
                </div>

                {/* Domain variants */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {g.domains.map(d => (
                    <span key={d} className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {d}
                    </span>
                  ))}
                </div>

                {/* New market entry callout */}
                {hasAlert && (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-orange-600 font-medium">Entered:</span>
                    {g.new_market_entries.map(e => (
                      <span key={e.market} className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded">
                        <span className="font-mono">.{e.market.toLowerCase()}</span>
                        <span className="opacity-70">· {timeAgo(e.first_seen)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Market pills */}
              <div className="shrink-0 flex flex-wrap gap-1 justify-end max-w-[160px]">
                {g.markets.map(m => (
                  <MarketPill key={m} code={m} highlight={newMarketCodes.has(m)} />
                ))}
              </div>

              {/* Signal count */}
              <div className="shrink-0 text-right min-w-[50px]">
                <div className="text-sm font-bold text-gray-800">{g.total_kw}</div>
                <div className="text-[9px] text-gray-400 uppercase tracking-wide">signals</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[11px] text-[#1a3a5c] font-medium hover:underline"
          >
            {expanded ? 'Show less' : `Show ${groups.length - 6} more brands →`}
          </button>
        </div>
      )}
    </div>
  )
}
