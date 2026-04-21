'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLink({ href, exact = false, children, className }) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`group flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-hubspotTeal/15 text-hubspotTeal'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      } ${className || ''}`}
      data-active={isActive}
    >
      {children}
    </Link>
  )
}
