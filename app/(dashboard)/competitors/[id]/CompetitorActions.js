'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CompetitorActions({ domain }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')

  async function handleBlock() {
    if (!domain) return
    if (!confirm(`Block ${domain}? This removes it from tracking and adds it to the global blocklist.`)) return
    setBusy('block')
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', domain }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Request failed')
      }
      router.push('/competitors')
      router.refresh()
    } catch (e) {
      alert(`Failed to block: ${e.message}`)
      setBusy('')
    }
  }

  return (
    <button
      onClick={handleBlock}
      disabled={!!busy}
      className="px-3 py-2 text-[12px] font-semibold rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-wait transition-colors flex items-center gap-1.5"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
      {busy === 'block' ? 'Blocking…' : 'Block domain'}
    </button>
  )
}
