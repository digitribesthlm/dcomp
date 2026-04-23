'use client'

import { useMemo, useState } from 'react'

function timeAgo(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (h < 1) return 'just now'
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

const SORT_OPTIONS = [
  { key: 'reach', label: 'Reach' },
  { key: 'position', label: 'Position' },
  { key: 'best', label: 'Best rank' },
  { key: 'recent', label: 'Recent activity' },
]

export default function MarketBreakdown({ markets = [] }) {
  const [sortKey, setSortKey] = useState('reach')

  const sorted = useMemo(() => {
    const m = [...markets]
    switch (sortKey) {
      case 'position':
        m.sort((a, b) => (a.avg_position || 999) - (b.avg_position || 999))
        break
      case 'best':
        m.sort((a, b) => (a.best_position || 999) - (b.best_position || 999))
        break
      case 'recent':
        m.sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
        break
      case 'reach':
      default:
        m.sort((a, b) => (b.signal_count || 0) - (a.signal_count || 0))
    }
    return m
  }, [markets, sortKey])

  const maxSignals = Math.max(1, ...markets.map(m => m.signal_count || 0))

  if (markets.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        No market presence detected yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Sort by</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
              sortKey === opt.key
                ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#1a3a5c] hover:text-[#1a3a5c]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-t-lg" style={{ gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr' }}>
        {['MARKET', 'REACH', 'AVG POS', 'BEST', 'LAST SEEN'].map(h => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="border-x border-b border-gray-100 rounded-b-lg overflow-hidden -mt-3">
        {sorted.map((m, i) => {
          const reachPct = Math.round(((m.signal_count || 0) / maxSignals) * 100)
          return (
            <div
              key={m.market}
              className={`grid gap-3 px-3 py-3 items-center ${i !== sorted.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50`}
              style={{ gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono text-white"
                  style={{ backgroundColor: m.color, borderColor: m.color }}
                >
                  .{m.market.toLowerCase()}
                </span>
                {m.has_new_signal && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
                    NEW
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${reachPct}%`, backgroundColor: m.color }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-700 font-mono w-6 text-right">{m.signal_count}</span>
              </div>

              <div className={`text-[13px] font-bold ${positionColor(Math.round(m.avg_position))}`}>
                {m.avg_position ? m.avg_position.toFixed(1) : '—'}
              </div>

              <div className={`text-[13px] font-semibold ${positionColor(m.best_position)}`}>
                {m.best_position ? `#${m.best_position}` : '—'}
              </div>

              <div className="text-[11px] text-gray-500">{timeAgo(m.last_seen)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
