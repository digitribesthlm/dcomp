'use client'

import { useState } from 'react'
import { MARKETS } from '../../../lib/markets'

function normalizeDomain(input) {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, '')
  }
}

function domainToName(domain) {
  const base = domain.split('.')[0]
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseCsvLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(cur); cur = '' }
    else { cur += ch }
  }
  result.push(cur)
  return result
}

function downloadTemplate() {
  const rows = [
    'domain,company_name,country_code',
    'competitor.com,Acme Corp,SE',
    'another.dk,Another AB,DK',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'competitors_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function CompetitorUpload({ onImported }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('single') // 'single' | 'csv'

  // Single add
  const [singleForm, setSingleForm] = useState({ domain: '', company_name: '', country_code: '' })
  const [singleSaving, setSingleSaving] = useState(false)
  const [singleError, setSingleError] = useState('')
  const [singleDone, setSingleDone] = useState(false)

  // CSV upload
  const [csvRows, setCsvRows] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [missingCountry, setMissingCountry] = useState(false)

  function close() {
    setOpen(false)
    setCsvRows(null)
    setResult(null)
    setSingleForm({ domain: '', company_name: '', country_code: '' })
    setSingleError('')
    setSingleDone(false)
    setMissingCountry(false)
  }

  async function handleSingleAdd(e) {
    e.preventDefault()
    if (!singleForm.country_code) { setSingleError('Country code is required'); return }
    setSingleSaving(true)
    setSingleError('')
    const domain = normalizeDomain(singleForm.domain)
    const r = await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        domain,
        company_name: singleForm.company_name || domainToName(domain),
        country_code: singleForm.country_code.toUpperCase(),
      }]),
    })
    const j = await r.json()
    setSingleSaving(false)
    if (j.added > 0) {
      setSingleDone(true)
      setSingleForm({ domain: '', company_name: '', country_code: '' })
      if (onImported) onImported()
    } else if (j.skipped > 0) {
      setSingleError('This domain already exists for that market.')
    } else {
      setSingleError('Failed to add.')
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = ev.target.result.trim().split('\n')
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const hasCountryCol = headers.includes('country_code')

      const existing = await fetch('/api/competitors').then(r => r.json())
      const existingDomains = new Set(
        (existing.data || []).map(d => d.domain && d.country_code ? `${d.domain}|${d.country_code}` : d.domain).filter(Boolean)
      )

      const rows = lines.slice(1).map(line => {
        const values = parseCsvLine(line)
        const get = (key) => (values[headers.indexOf(key)] || '').trim().replace(/^"|"$/g, '')
        const domain = normalizeDomain(get('domain'))
        const country_code = get('country_code').toUpperCase()
        return {
          domain,
          company_name: get('company_name') || domainToName(domain),
          country_code: country_code || null,
          missing_country: !country_code,
          duplicate: country_code ? existingDomains.has(`${domain}|${country_code}`) : false,
        }
      }).filter(r => r.domain)

      setMissingCountry(!hasCountryCol || rows.some(r => r.missing_country))
      setCsvRows(rows)
      setResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImport() {
    const newRows = csvRows.filter(r => !r.duplicate && r.country_code)
    if (!newRows.length) return
    setImporting(true)
    const r = await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRows),
    })
    const j = await r.json()
    setResult(j)
    setImporting(false)
    setCsvRows(null)
    if (onImported) onImported()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add competitor
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('single')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'single' ? 'bg-[#1a3a5c] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Single add
            </button>
            <button
              onClick={() => setTab('csv')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'csv' ? 'bg-[#1a3a5c] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Upload CSV
            </button>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">

          {/* ── Single add ── */}
          {tab === 'single' && (
            <form onSubmit={handleSingleAdd} className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-gray-500 mb-1">Domain <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={singleForm.domain}
                    onChange={e => { setSingleForm(f => ({ ...f, domain: e.target.value })); setSingleDone(false) }}
                    placeholder="competitor.dk"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
                  />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs text-gray-500 mb-1">Company name <span className="text-gray-400">(optional)</span></label>
                  <input
                    value={singleForm.company_name}
                    onChange={e => setSingleForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Auto-generated if blank"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Market / Country code <span className="text-red-400">*</span></label>
                <select
                  required
                  value={singleForm.country_code}
                  onChange={e => setSingleForm(f => ({ ...f, country_code: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]"
                >
                  <option value="">— select market —</option>
                  {MARKETS.map(m => <option key={m.code} value={m.code}>{m.code} — {m.label}</option>)}
                </select>
              </div>
              {singleError && <p className="text-xs text-red-500">{singleError}</p>}
              {singleDone && <p className="text-xs text-green-600">Added successfully.</p>}
              <button
                type="submit"
                disabled={singleSaving}
                className="px-4 py-2 bg-[#1a3a5c] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c]/90 disabled:opacity-50 transition-colors"
              >
                {singleSaving ? 'Adding…' : '+ Add competitor'}
              </button>
            </form>
          )}

          {/* ── CSV upload ── */}
          {tab === 'csv' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Columns: <span className="font-mono">domain, company_name, country_code</span>. <span className="text-red-500 font-medium">country_code is required</span> — rows without it are skipped.
                </p>
                <button onClick={downloadTemplate} className="text-xs text-[#1a3a5c] hover:underline shrink-0 ml-3">
                  ↓ Download template
                </button>
              </div>

              {missingCountry && (
                <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-700">Some rows are missing <span className="font-mono">country_code</span> — they are highlighted and will be skipped on import.</p>
                </div>
              )}

              {!csvRows ? (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-10 cursor-pointer hover:border-[#1a3a5c] transition-colors">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">Click to select a CSV file</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
                </label>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">{csvRows.length} rows parsed</span>
                      <div className="flex gap-3">
                        {csvRows.filter(r => r.missing_country).length > 0 && (
                          <span className="text-xs text-red-600">{csvRows.filter(r => r.missing_country).length} missing country — skipped</span>
                        )}
                        {csvRows.filter(r => r.duplicate).length > 0 && (
                          <span className="text-xs text-amber-600">{csvRows.filter(r => r.duplicate).length} already exist — skipped</span>
                        )}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {csvRows.map((row, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.missing_country ? 'bg-red-50' : row.duplicate ? 'bg-amber-50' : ''}`}>
                          <div>
                            <span className="text-sm font-medium text-gray-900">{row.domain}</span>
                            {row.company_name !== row.domain && (
                              <span className="text-xs text-gray-400 ml-2">{row.company_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {row.country_code ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-teal-200 text-teal-600 bg-teal-50 font-mono">{row.country_code}</span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">No country</span>
                            )}
                            {row.missing_country
                              ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">Skipped</span>
                              : row.duplicate
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
                      onClick={handleImport}
                      disabled={importing || csvRows.filter(r => !r.duplicate && r.country_code).length === 0}
                      className="px-4 py-2 bg-[#1a3a5c] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c]/90 disabled:opacity-50 transition-colors"
                    >
                      {importing ? 'Importing…' : `Import ${csvRows.filter(r => !r.duplicate && r.country_code).length} new domains`}
                    </button>
                    <button onClick={() => { setCsvRows(null); setMissingCountry(false) }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                  </div>
                </>
              )}

              {result && (
                <p className="text-xs text-gray-600">
                  Done — {result.added} added, {result.skipped} skipped (duplicates), {result.failed} failed
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
