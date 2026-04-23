'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CopyUrlButton from '../../../components/CopyUrlButton'

function timeAgo(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export default function UnclassifiedPanel({ initialDomains = [] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialDomains)
  const [busy, setBusy] = useState({})
  const [expanded, setExpanded] = useState(false)

  async function act(domain, action) {
    if (busy[domain]) return
    setBusy(b => ({ ...b, [domain]: action }))
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, domain }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Request failed')
      }
      setRows(prev => prev.filter(r => r.domain !== domain))
      router.refresh()
    } catch (e) {
      alert(`Failed to ${action}: ${e.message}`)
    } finally {
      setBusy(b => {
        const next = { ...b }
        delete next[domain]
        return next
      })
    }
  }

  if (!rows || rows.length === 0) {
    return null
  }

  const visible = expanded ? rows : rows.slice(0, 8)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 text-[15px]">Unclassified Signals</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
              {rows.length} to triage
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Domains appearing in SERPs that aren&apos;t known competitors or blocked yet. Triage to keep the matrix clean.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50" style={{ gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 1.2fr 1.4fr' }}>
        {['DOMAIN', 'SENSORS', 'AVG POS', 'BEST', 'LAST SEEN', 'ACTIONS'].map(h => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</div>
        ))}
      </div>

      {visible.map(row => {
        const isBusy = !!busy[row.domain]
        return (
          <div
            key={row.domain}
            className="grid gap-4 px-5 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 items-center"
            style={{ gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 1.2fr 1.4fr' }}
          >
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-[13px] text-gray-900 truncate font-mono">
                  {row.domain}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {row.sample_keywords?.slice(0, 3).join(' · ') || '—'}
                </div>
              </div>
              <CopyUrlButton
                value={`https://${row.domain}`}
                label=""
                className="shrink-0 p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              />
            </div>

            <div className="text-sm font-bold text-gray-900">{row.keyword_count}</div>
            <div className="text-sm text-gray-700">{Math.round(row.avg_position || 0)}</div>
            <div className="text-sm text-gray-700">{row.best_position || '—'}</div>
            <div className="text-[12px] text-gray-500">{timeAgo(row.last_seen)}</div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => act(row.domain, 'competitor')}
                disabled={isBusy}
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {busy[row.domain] === 'competitor' ? 'Adding…' : '+ Competitor'}
              </button>
              <button
                onClick={() => act(row.domain, 'block')}
                disabled={isBusy}
                className="px-2.5 py-1.5 text-[11px] font-semibold rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-wait transition-colors"
              >
                {busy[row.domain] === 'block' ? 'Blocking…' : 'Block'}
              </button>
            </div>
          </div>
        )
      })}

      {rows.length > 8 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs font-medium text-[#1a3a5c] hover:underline"
          >
            {expanded ? 'Show less' : `Show all ${rows.length}`}
          </button>
        </div>
      )}
    </div>
  )
}
