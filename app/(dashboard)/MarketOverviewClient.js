'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const QuadrantChart = dynamic(() => import('../../components/charts/QuadrantChart'), { ssr: false })

const SCORE_CARD_STYLES = {
  red:   { badge: 'bg-red-50 text-red-500 border-red-200',   dot: 'bg-red-500',   ring: 'ring-red-100' },
  blue:  { badge: 'bg-blue-50 text-blue-500 border-blue-200', dot: 'bg-blue-500',  ring: 'ring-blue-100' },
  green: { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-100' },
  gray:  { badge: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400', ring: 'ring-gray-100' },
}

const PERIODS = ['Last 4 Weeks', 'Last 10 Weeks', 'Last 6 Months']
const MARKET_TABS = ['DK', 'NO', 'FI', 'SE', 'DE', 'FR', 'IT', 'ES']

export default function MarketOverviewClient({ chartDomains, scoreCardDomains, stats, hasRealData, activeMarket }) {
  const [period, setPeriod] = useState('Last 10 Weeks')
  const [highlighted, setHighlighted] = useState(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setMarket(code) {
    const params = new URLSearchParams(searchParams.toString())
    const current = params.get('market')?.toUpperCase()
    if (current === code) {
      params.delete('market')
    } else {
      params.set('market', code.toLowerCase())
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const visibleDomains = highlighted
    ? chartDomains.filter(d => d.domain === highlighted)
    : chartDomains

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Market Dynamics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Comparative intelligence and relative strength analysis
            {activeMarket ? ` — ${activeMarket} market` : ' across all markets'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasRealData && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Demo data
            </span>
          )}
          <div className="relative">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
            >
              {PERIODS.map(p => <option key={p}>{p}</option>)}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Market filter — prominent pills above the chart */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">Market</span>
        {MARKET_TABS.map(code => {
          const isActive = activeMarket === code
          return (
            <button
              key={code}
              onClick={() => setMarket(code)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold font-mono transition-all border ${
                isActive
                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c] shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a3a5c] hover:text-[#1a3a5c]'
              }`}
            >
              .{code.toLowerCase()}
            </button>
          )
        })}
        {activeMarket && (
          <button
            onClick={() => setMarket(activeMarket)}
            className="ml-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main chart + score cards */}
      <div className="grid grid-cols-[1fr_280px] gap-5">

        {/* Quadrant chart */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <span className="font-semibold text-[14px] text-gray-900">Market Infiltration Momentum</span>
              <span className="ml-2 text-xs text-gray-400">4-quadrant relative strength</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px border-t-2 border-dashed border-gray-400 inline-block" />
                Trailing path
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
                Current position
              </span>
            </div>
          </div>
          <div className="h-[400px] p-2">
            <QuadrantChart domains={visibleDomains} />
          </div>

          {/* Domain legend / filter */}
          {chartDomains.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2">
              {chartDomains.slice(0, 12).map(d => (
                <button
                  key={d.domain}
                  onClick={() => setHighlighted(h => h === d.domain ? null : d.domain)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-all border ${
                    highlighted === d.domain
                      ? 'bg-white shadow-sm border-gray-300 font-medium'
                      : highlighted
                      ? 'opacity-40 border-transparent'
                      : 'border-transparent hover:border-gray-200 hover:bg-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600 truncate max-w-[120px]">{d.domain}</span>
                </button>
              ))}
              {highlighted && (
                <button
                  onClick={() => setHighlighted(null)}
                  className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-0.5"
                >
                  Show all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Score cards column */}
        <div className="space-y-3">
          {scoreCardDomains.map(({ label, color, items }) => {
            const s = SCORE_CARD_STYLES[color]
            const top = items[0]
            return (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.badge}`}>
                    {label}
                  </span>
                  <span className="text-[11px] text-gray-400">{items.length} domains</span>
                </div>
                {top ? (
                  <>
                    <div className="font-semibold text-[13px] text-gray-900 truncate">{top.domain}</div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 3).map(d => (
                        <div key={d.domain} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                          <span className="text-[11px] text-gray-500 truncate">{d.domain}</span>
                          {d.market && (
                            <span className="shrink-0 text-[9px] font-mono font-bold text-gray-400 ml-auto">{d.market}</span>
                          )}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-3.5">+{items.length - 3} more</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] text-gray-400 mt-1">No domains in this quadrant</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#1a3a5c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total domains tracked</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{stats.newThisWeek}</div>
            <div className="text-xs text-gray-500">New entrants this week</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{chartDomains.length}</div>
            <div className="text-xs text-gray-500">Domains in quadrant view</div>
          </div>
        </div>
      </div>

    </div>
  )
}
