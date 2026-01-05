'use client'

import Link from 'next/link'

export function BetaBadge() {
  return (
    <Link href="/privacy" className="fixed top-16 right-4 z-40 group">
      <div className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-lg shadow-lg hover:bg-amber-400 transition-colors">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-700 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-700"></span>
        </span>
        <span className="font-bold text-sm">BETA</span>
      </div>
    </Link>
  )
}

// Inline beta notice for use under VIC widget
export function BetaNotice() {
  return (
    <div className="text-center mt-6">
      <Link
        href="/privacy"
        className="inline-flex items-center gap-2 text-amber-400/80 hover:text-amber-300 text-sm transition-colors"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
        </span>
        <span>BETA — Demo product, data may be cleared</span>
      </Link>
    </div>
  )
}
