'use client'

import { useState, useEffect, useCallback } from 'react'
import { MARKETS } from '../../../lib/markets'

const BLOCKLIST_REASONS = ['aggregator', 'government', 'own', 'directory', 'irrelevant']
const SEED_TYPES = ['competitor', 'suspect', 'own']
const FREQUENCIES = ['daily', 'weekly']

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    teal: 'bg-teal-100 text-teal-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function DeleteButton({ onDelete, label = 'Remove' }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={onDelete}
          className="text-xs text-red-600 font-medium hover:underline"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:underline ml-1"
        >
          Cancel
        </button>
      </span>
    )
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
    >
      {label}
    </button>
  )
}

// ─── Keywords Tab ────────────────────────────────────────────────────────────

function KeywordsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterMarket, setFilterMarket] = useState('')

  const [form, setForm] = useState({
    keyword: '',
    market: 'SE',
    checkFrequency: 'weekly',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const params = filterMarket ? `?market=${filterMarket}` : ''
    const r = await fetch(`/api/keywords${params}`)
    const j = await r.json()
    setItems(j.data || [])
    setLoading(false)
  }, [filterMarket])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const marketObj = MARKETS.find(m => m.code === form.market)
    const r = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: form.keyword,
        market: form.market,
        language: marketObj?.language,
        googleDomain: marketObj?.googleDomain,
        checkFrequency: form.checkFrequency,
        notes: form.notes,
      }),
    })
    const j = await r.json()

    if (!r.ok) {
      setError(j.error || 'Failed to save')
    } else {
      setForm({ keyword: '', market: form.market, checkFrequency: form.checkFrequency, notes: '' })
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(k => String(k._id) !== id))
  }

  const grouped = items.reduce((acc, k) => {
    const m = k.market || 'Unknown'
    if (!acc[m]) acc[m] = []
    acc[m].push(k)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4 text-sm">Add keyword</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Keyword</label>
            <input
              required
              value={form.keyword}
              onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
              placeholder="e.g. insurance broker"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Market</label>
            <select
              value={form.market}
              onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            >
              {MARKETS.map(m => (
                <option key={m.code} value={m.code}>{m.code} — {m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Frequency</label>
            <select
              value={form.checkFrequency}
              onChange={e => setForm(f => ({ ...f, checkFrequency: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            >
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional context"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : '+ Add'}
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Filter + list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="font-medium text-sm">{items.length} keywords</span>
          <select
            value={filterMarket}
            onChange={e => setFilterMarket(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-hubspotTeal"
          >
            <option value="">All markets</option>
            {MARKETS.map(m => <option key={m.code} value={m.code}>{m.code} — {m.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No keywords yet. Add your first one above.</div>
        ) : (
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([market, kws]) => (
            <div key={market}>
              <div className="px-5 py-2 bg-gray-50 border-b border-t text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {market} — {MARKETS.find(m => m.code === market)?.label || ''}
              </div>
              {kws.map(k => (
                <div key={String(k._id)} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{k.keyword}</span>
                    {k.google_domain && <span className="text-xs text-gray-400">{k.google_domain}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={k.check_frequency === 'daily' ? 'amber' : 'blue'}>{k.check_frequency}</Badge>
                    <Badge color={k.status === 'active' ? 'green' : 'gray'}>{k.status}</Badge>
                    {k.last_checked && (
                      <span className="text-xs text-gray-400">
                        Last: {new Date(k.last_checked).toLocaleDateString()}
                      </span>
                    )}
                    <DeleteButton onDelete={() => handleDelete(String(k._id))} />
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Seeds Tab ───────────────────────────────────────────────────────────────

function SeedsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkMarket, setBulkMarket] = useState('SE')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)

  const [form, setForm] = useState({
    url: '',
    companyName: '',
    markets: ['SE'],
    type: 'competitor',
    notes: '',
  })

  async function load() {
    setLoading(true)
    const r = await fetch('/api/seeds')
    const j = await r.json()
    setItems(j.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggleMarket(code) {
    setForm(f => ({
      ...f,
      markets: f.markets.includes(code)
        ? f.markets.filter(m => m !== code)
        : [...f.markets, code],
    }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (form.markets.length === 0) {
      setError('Select at least one market')
      return
    }
    setSaving(true)
    setError('')
    const r = await fetch('/api/seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const j = await r.json()
    if (!r.ok) {
      setError(j.error || 'Failed to save')
    } else {
      setForm({ url: '', companyName: '', markets: form.markets, type: 'competitor', notes: '' })
      await load()
    }
    setSaving(false)
  }

  async function handleBulkImport() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    setBulkSaving(true)
    setBulkResult(null)

    let added = 0, merged = 0, failed = 0
    for (const line of lines) {
      const parts = line.split('\t')
      const url = parts[0]?.trim()
      const companyName = parts[1]?.trim() || ''
      if (!url) { failed++; continue }

      const r = await fetch('/api/seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, companyName, markets: [bulkMarket], type: 'competitor' }),
      })
      const j = await r.json()
      if (!r.ok) failed++
      else if (j.merged) merged++
      else added++
    }

    setBulkResult({ added, merged, failed, total: lines.length })
    setBulkSaving(false)
    setBulkText('')
    await load()
  }

  async function handleDelete(id) {
    await fetch(`/api/seeds?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(s => String(s._id) !== id))
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setBulkMode(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!bulkMode ? 'bg-hubspotTeal text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Single add
        </button>
        <button
          onClick={() => setBulkMode(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bulkMode ? 'bg-hubspotTeal text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Bulk import
        </button>
      </div>

      {!bulkMode ? (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4 text-sm">Add competitor seed</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">URL / Domain</label>
                <input
                  required
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://competitor.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
                />
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-gray-500 mb-1">Company name (optional)</label>
                <input
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
                >
                  {SEED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Markets</label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map(m => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => toggleMarket(m.code)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.markets.includes(m.code)
                        ? 'bg-hubspotTeal text-white border-hubspotTeal'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-hubspotTeal'
                    }`}
                  >
                    {m.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : '+ Add'}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-1 text-sm">Bulk import</h3>
          <p className="text-xs text-gray-500 mb-4">One URL per line. Optionally add a tab + company name on the same line.</p>
          <div className="flex gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Apply market to all</label>
              <select
                value={bulkMarket}
                onChange={e => setBulkMarket(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {MARKETS.map(m => <option key={m.code} value={m.code}>{m.code} — {m.label}</option>)}
              </select>
            </div>
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={8}
            placeholder={'competitor.com\nhttps://another.com\tAnother Corp\nthird.se'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleBulkImport}
              disabled={bulkSaving || !bulkText.trim()}
              className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
            >
              {bulkSaving ? 'Importing…' : `Import ${bulkText.split('\n').filter(l => l.trim()).length} URLs`}
            </button>
            {bulkResult && (
              <span className="text-xs text-gray-600">
                Done — {bulkResult.added} added, {bulkResult.merged} merged, {bulkResult.failed} failed (of {bulkResult.total})
              </span>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <span className="font-medium text-sm">{items.length} seeds</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No seeds yet.</div>
        ) : (
          items.map(s => (
            <div key={String(s._id)} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{s.company_name || s.domain}</div>
                  <div className="text-xs text-gray-400">{s.domain}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {s.markets?.map(m => <Badge key={m} color="blue">{m}</Badge>)}
                <Badge color={s.type === 'competitor' ? 'teal' : s.type === 'own' ? 'gray' : 'amber'}>{s.type}</Badge>
                <DeleteButton onDelete={() => handleDelete(String(s._id))} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Blocklist Tab ────────────────────────────────────────────────────────────

function BlocklistTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ domain: '', reason: 'irrelevant' })

  async function load() {
    setLoading(true)
    const r = await fetch('/api/blocklist')
    const j = await r.json()
    setItems(j.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const r = await fetch('/api/blocklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const j = await r.json()
    if (!r.ok) {
      setError(j.error || 'Failed to save')
    } else {
      setForm({ domain: '', reason: form.reason })
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await fetch(`/api/blocklist?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(b => String(b._id) !== id))
  }

  const reasonColor = { aggregator: 'amber', government: 'blue', own: 'gray', directory: 'teal', irrelevant: 'red' }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4 text-sm">Add domain to blocklist</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Domain</label>
            <input
              required
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="wikipedia.org"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason</label>
            <select
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
            >
              {BLOCKLIST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : '+ Add'}
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <span className="font-medium text-sm">{items.length} blocked domains</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No blocked domains yet.</div>
        ) : (
          items.map(b => (
            <div key={String(b._id)} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50">
              <span className="font-mono text-sm">{b.domain}</span>
              <div className="flex items-center gap-3">
                <Badge color={reasonColor[b.reason] || 'gray'}>{b.reason}</Badge>
                <DeleteButton onDelete={() => handleDelete(String(b._id))} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keywords', label: 'Keywords' },
  { id: 'seeds', label: 'Competitor seeds' },
  { id: 'blocklist', label: 'Blocklist' },
]

export default function SetupPage() {
  const [tab, setTab] = useState('keywords')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Configure the keywords, known competitors, and blocklist that drive the SERP monitoring workflow.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-hubspotTeal text-hubspotTeal'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'seeds' && <SeedsTab />}
      {tab === 'blocklist' && <BlocklistTab />}
    </div>
  )
}
