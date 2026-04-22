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

function downloadKeywordsCsvTemplate() {
  const rows = [
    'keyword,market,frequency,notes',
    'insurance broker,SE,weekly,Primary target keyword',
    'buy wallpaper,NO,daily,High volume',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'keywords_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function KeywordsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterMarket, setFilterMarket] = useState('')
  const [mode, setMode] = useState('single') // 'single' | 'csv'
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [csvRows, setCsvRows] = useState(null)
  const [csvSaving, setCsvSaving] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

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
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    setBulkDeleting(true)
    await Promise.all([...selected].map(id => fetch(`/api/keywords?id=${id}`, { method: 'DELETE' })))
    setItems(prev => prev.filter(k => !selected.has(String(k._id))))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    const visibleIds = items.map(k => String(k._id))
    const allSelected = visibleIds.every(id => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(visibleIds))
  }

  function handleKeywordFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split('\n')
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const existingKeys = new Set(items.map(k => `${k.keyword}|${k.market}`))
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const get = (key) => values[headers.indexOf(key)] || ''
        const keyword = get('keyword').toLowerCase()
        const market = (get('market') || 'SE').toUpperCase()
        return {
          keyword,
          market,
          frequency: get('frequency') || 'weekly',
          notes: get('notes'),
          duplicate: existingKeys.has(`${keyword}|${market}`),
        }
      }).filter(r => r.keyword)
      setCsvRows(rows)
      setCsvResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleCsvImport() {
    const newRows = csvRows.filter(r => !r.duplicate)
    if (!newRows.length) return
    setCsvSaving(true)

    let added = 0, failed = 0
    for (const row of newRows) {
      const marketObj = MARKETS.find(m => m.code === row.market)
      const r = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: row.keyword,
          market: row.market,
          language: marketObj?.language,
          googleDomain: marketObj?.googleDomain,
          checkFrequency: row.frequency,
          notes: row.notes,
        }),
      })
      if (r.ok) added++; else failed++
    }

    setCsvResult({ added, skipped: csvRows.filter(r => r.duplicate).length, failed })
    setCsvSaving(false)
    setCsvRows(null)
    await load()
  }

  const grouped = items.reduce((acc, k) => {
    const m = k.market || 'Unknown'
    if (!acc[m]) acc[m] = []
    acc[m].push(k)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('single'); setCsvRows(null); setCsvResult(null) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'single' ? 'bg-hubspotTeal text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Single add
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'csv' ? 'bg-hubspotTeal text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Upload CSV
        </button>
      </div>

      {mode === 'single' ? (
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
      ) : (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Upload keywords CSV</h3>
            <button
              onClick={downloadKeywordsCsvTemplate}
              className="text-xs text-hubspotTeal hover:underline"
            >
              ↓ Download CSV template
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Columns: <span className="font-mono">keyword, market, frequency, notes</span>. Frequency is <span className="font-mono">daily</span> or <span className="font-mono">weekly</span>. Duplicates (same keyword + market) are skipped.
          </p>

          {!csvRows ? (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-hubspotTeal transition-colors">
              <span className="text-sm text-gray-500">Click to select a CSV file</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleKeywordFile} />
            </label>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">{csvRows.length} rows parsed</span>
                  {csvRows.filter(r => r.duplicate).length > 0 && (
                    <span className="text-xs text-amber-600">
                      {csvRows.filter(r => r.duplicate).length} already exist — will be skipped
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {csvRows.map((row, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.duplicate ? 'bg-amber-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{row.keyword}</span>
                        {row.notes && <span className="text-xs text-gray-400">{row.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color="blue">{row.market}</Badge>
                        <Badge color={row.frequency === 'daily' ? 'amber' : 'blue'}>{row.frequency}</Badge>
                        {row.duplicate
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">Already exists</span>
                          : <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">New</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCsvImport}
                  disabled={csvSaving || csvRows.filter(r => !r.duplicate).length === 0}
                  className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
                >
                  {csvSaving ? 'Importing…' : `Import ${csvRows.filter(r => !r.duplicate).length} keywords`}
                </button>
                <button onClick={() => setCsvRows(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Clear
                </button>
              </div>
            </>
          )}

          {csvResult && (
            <p className="text-xs text-gray-600">
              Done — {csvResult.added} added, {csvResult.skipped} skipped (duplicates), {csvResult.failed} failed
            </p>
          )}
        </div>
      )}

      {/* Filter + list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every(k => selected.has(String(k._id)))}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="font-medium text-sm">{items.length} keywords</span>
            {selected.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {bulkDeleting ? 'Deleting…' : `Delete ${selected.size} selected`}
              </button>
            )}
          </div>
          <select
            value={filterMarket}
            onChange={e => { setFilterMarket(e.target.value); setSelected(new Set()) }}
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
              {kws.map(k => {
                const id = String(k._id)
                return (
                  <div key={id} className={`flex items-center justify-between px-5 py-3 border-b last:border-b-0 hover:bg-gray-50 ${selected.has(id) ? 'bg-red-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleSelect(id)}
                        className="rounded border-gray-300"
                      />
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
                      <DeleteButton onDelete={() => handleDelete(id)} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Seeds Tab ───────────────────────────────────────────────────────────────

function normalizeDomainClient(input) {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, '')
  }
}

function parseCsvLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

function downloadCsvTemplate() {
  const rows = [
    'domain,company_name,type,markets,notes',
    'competitor.com,Acme Corp,competitor,SE|NO,Main competitor in Nordics',
    'another.se,Another AB,suspect,SE,Flagged for monitoring',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'seeds_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function SeedsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSubMode, setBulkSubMode] = useState('paste') // 'paste' | 'csv'
  const [bulkText, setBulkText] = useState('')
  const [bulkMarket, setBulkMarket] = useState('SE')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)
  const [csvRows, setCsvRows] = useState(null) // parsed CSV preview rows

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

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.trim().split('\n')
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const existingDomains = new Set(items.map(s => s.domain))
      const rows = lines.slice(1).map(line => {
        const values = parseCsvLine(line)
        const get = (key) => (values[headers.indexOf(key)] || '').trim().replace(/^"|"$/g, '')
        const domain = normalizeDomainClient(get('domain'))
        return {
          domain,
          companyName: get('company_name'),
          type: get('type') || 'competitor',
          markets: get('markets') ? get('markets').split('|').map(m => m.trim().toUpperCase()).filter(Boolean) : [bulkMarket],
          notes: get('notes'),
          duplicate: existingDomains.has(domain),
        }
      }).filter(r => r.domain)
      setCsvRows(rows)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleCsvImport() {
    if (!csvRows?.length) return
    setBulkSaving(true)
    setBulkResult(null)

    let added = 0, merged = 0, failed = 0, skipped = 0
    for (const row of csvRows) {
      if (row.duplicate && row.skip) { skipped++; continue }
      const r = await fetch('/api/seeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: row.domain, companyName: row.companyName, markets: row.markets, type: row.type, notes: row.notes }),
      })
      const j = await r.json()
      if (!r.ok) failed++
      else if (j.merged) merged++
      else added++
    }

    setBulkResult({ added, merged, failed, skipped, total: csvRows.length })
    setBulkSaving(false)
    setCsvRows(null)
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
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Bulk import</h3>
            <button
              onClick={downloadCsvTemplate}
              className="text-xs text-hubspotTeal hover:underline flex items-center gap-1"
            >
              ↓ Download CSV template
            </button>
          </div>

          {/* Sub-mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setBulkSubMode('paste'); setCsvRows(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bulkSubMode === 'paste' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Paste text
            </button>
            <button
              onClick={() => { setBulkSubMode('csv'); setBulkResult(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bulkSubMode === 'csv' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Upload CSV
            </button>
          </div>

          {bulkSubMode === 'paste' ? (
            <>
              <p className="text-xs text-gray-500">One URL per line. Optionally add a tab + company name on the same line.</p>
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
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={8}
                placeholder={'competitor.com\nhttps://another.com\tAnother Corp\nthird.se'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              />
              <div className="flex items-center gap-3">
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
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">Upload a CSV using the template above. Duplicates are flagged before import.</p>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-hubspotTeal transition-colors">
                <span className="text-sm text-gray-500">Click to select a CSV file</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>

              {csvRows && csvRows.length > 0 && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">{csvRows.length} rows parsed</span>
                      <span className="text-xs text-amber-600">{csvRows.filter(r => r.duplicate).length} already in system</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y">
                      {csvRows.map((row, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.duplicate ? 'bg-amber-50' : ''}`}>
                          <div>
                            <span className="text-sm font-medium">{row.domain}</span>
                            {row.companyName && <span className="text-xs text-gray-400 ml-2">{row.companyName}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {row.markets.map(m => <Badge key={m} color="blue">{m}</Badge>)}
                            <Badge color={row.type === 'competitor' ? 'teal' : row.type === 'own' ? 'gray' : 'amber'}>{row.type}</Badge>
                            {row.duplicate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                Already exists
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCsvImport}
                      disabled={bulkSaving}
                      className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 disabled:opacity-50 transition-colors"
                    >
                      {bulkSaving ? 'Importing…' : `Import ${csvRows.filter(r => !r.duplicate).length} new + ${csvRows.filter(r => r.duplicate).length} merge`}
                    </button>
                    <button
                      onClick={() => setCsvRows(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                    {bulkResult && (
                      <span className="text-xs text-gray-600">
                        Done — {bulkResult.added} added, {bulkResult.merged} merged, {bulkResult.failed} failed
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}
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
