'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'
import LogoutButton from './LogoutButton'

const MARKETS = ['dk', 'no', 'fi', 'se', 'de', 'fr', 'it', 'es']

function TopBarInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const active = searchParams.get('market')?.toLowerCase() || ''

  function setMarket(code) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get('market') === code) {
      params.delete('market')
    } else {
      params.set('market', code)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-6 h-6 rounded bg-[#1a3a5c] flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="font-bold text-[#1a3a5c] text-[15px] tracking-tight">MarketIntel</span>
        <span className="text-[10px] font-semibold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 tracking-widest uppercase">Matrix</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Market tabs */}
      <div className="flex items-center gap-0.5">
        {MARKETS.map(code => (
          <button
            key={code}
            onClick={() => setMarket(code)}
            className={`px-2.5 py-1 text-[13px] rounded font-mono transition-all ${
              active === code
                ? 'bg-[#1a3a5c] text-white font-semibold'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            .{code}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Global view">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </button>
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Settings">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <LogoutButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors" showLabel />
      </div>
    </header>
  )
}

export default function TopBar() {
  return (
    <Suspense fallback={<div className="h-14 bg-white border-b border-gray-200 shrink-0" />}>
      <TopBarInner />
    </Suspense>
  )
}
