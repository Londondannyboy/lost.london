'use client'

import Link from 'next/link'
import { UserButton } from '@neondatabase/neon-js/auth/react/ui'
import { useState } from 'react'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-london-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-serif text-gradient-london">Lost London</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/map" className="text-gray-400 hover:text-white transition-colors text-sm">
              Map
            </Link>
            <Link href="/timeline" className="text-gray-400 hover:text-white transition-colors text-sm">
              Timeline
            </Link>
            <Link href="/routes" className="text-gray-400 hover:text-white transition-colors text-sm">
              Routes
            </Link>
            <Link href="/series" className="text-gray-400 hover:text-white transition-colors text-sm">
              Series
            </Link>
            <Link href="/surprise" className="text-gray-400 hover:text-white transition-colors text-sm">
              Surprise Me
            </Link>
            <Link href="/bookmarks" className="text-gray-400 hover:text-white transition-colors text-sm">
              Bookmarks
            </Link>
          </nav>

          {/* Auth & Mobile menu */}
          <div className="flex items-center gap-4">
            <UserButton />

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <nav className="md:hidden py-4 border-t border-london-800">
            <div className="flex flex-col gap-2">
              <Link href="/map" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Map
              </Link>
              <Link href="/timeline" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Timeline
              </Link>
              <Link href="/routes" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Routes
              </Link>
              <Link href="/series" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Series
              </Link>
              <Link href="/surprise" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Surprise Me
              </Link>
              <Link href="/bookmarks" className="px-2 py-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                Bookmarks
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
