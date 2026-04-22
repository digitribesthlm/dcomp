'use client'

import { useState } from 'react'

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
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
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

function downloadTemplate() {
  const rows = [
    'domain,company_name,country_code',
    'competitor.com,Acme Corp,SE',
    'another.se,Another AB,SE',
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
  const [csvRows, setCsvRows] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target.result
      const lines = text.trim().split('\n')
      if (lines.length < 2) return

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      // Fetch existing domains for duplicate check
      const existing = await fetch('/api/competitors').then(r => r.json())
      const existingDomains = new Set(
        (existing.data || []).map(d => d.domain && d.country_code ? `${d.domain}|${d.country_code}` : d.domain).filter(Boolean)
      )

      const rows = lines.slice(1).map(line => {
        const values = parseCsvLine(line)
        const get = (key) => (values[headers.indexOf(key)] || '').trim().replace(/^"|"$/g, '')
        const domain = normalizeDomain(get('domain'))
        const country_code = (get('country_code') || 'SE').toUpperCase()
        return {
          domain,
          company_name: get('company_name') || domainToName(domain),
          country_code,
          duplicate: existingDomains.has(domain + '|' + country_code),
        }
      }).filter(r => r.domain)

      setCsvRows(rows)
      setResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImport() {
    const newRows = csvRows.filter(r => !r.duplicate)
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload CSV
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Bulk upload competitors</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="text-xs text-[#1a3a5c] hover:underline"
            >
              ↓ Download CSV template
            </button>
            <button
              onClick={() => { setOpen(false); setCsvRows(null); setResult(null) }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Upload a CSV with columns: <span className="font-mono">domain, company_name, country_code</span>.
            Duplicates are detected automatically and skipped.
          </p>

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
                  {csvRows.filter(r => r.duplicate).length > 0 && (
                    <span className="text-xs text-amber-600">
                      {csvRows.filter(r => r.duplicate).length} already in system — will be skipped
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y">
                  {csvRows.map((row, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.duplicate ? 'bg-amber-50' : ''}`}>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{row.domain}</span>
                        {row.company_name !== row.domain && (
                          <span className="text-xs text-gray-400 ml-2">{row.company_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-teal-200 text-teal-600 bg-teal-50 font-mono">
                          {row.country_code}
                        </span>
                        {row.duplicate ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            Already exists
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || csvRows.filter(r => !r.duplicate).length === 0}
                  className="px-4 py-2 bg-[#1a3a5c] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5c]/90 disabled:opacity-50 transition-colors"
                >
                  {importing
                    ? 'Importing…'
                    : `Import ${csvRows.filter(r => !r.duplicate).length} new domains`}
                </button>
                <button
                  onClick={() => setCsvRows(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
            </>
          )}

          {result && (
            <p className="text-xs text-gray-600">
              Done — {result.added} added, {result.skipped} skipped (duplicates), {result.failed} failed
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
