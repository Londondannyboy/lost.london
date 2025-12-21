'use client'

import Link from 'next/link'
import { UserButton } from '@neondatabase/neon-js/auth/react/ui'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const navLinks = [
    { href: '/', label: 'Talk to VIC' },
    { href: '/series/lost-london', label: 'Articles' },
    { href: '/map', label: 'Map' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/routes', label: 'Routes' },
    { href: '/surprise', label: 'Surprise Me' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-serif font-bold">Lost London</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm transition-colors ${
                  pathname === link.href
                    ? 'text-white bg-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/bookmarks"
              className={`px-3 py-2 text-sm transition-colors ${
                pathname === '/bookmarks'
                  ? 'text-white bg-white/10'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Bookmarks
            </Link>
          </nav>

          {/* Auth & Mobile menu */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <UserButton />
            </div>

            {/* Mobile menu button - hamburger */}
            <button
              className="md:hidden p-2 text-white hover:bg-white/10 rounded"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <nav className="md:hidden py-4 border-t border-white/20">
            <div className="flex flex-col">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 text-base ${
                    pathname === link.href
                      ? 'text-white bg-white/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/bookmarks"
                className={`px-4 py-3 text-base ${
                  pathname === '/bookmarks'
                    ? 'text-white bg-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Bookmarks
              </Link>
              <div className="px-4 py-3 border-t border-white/20 mt-2">
                <UserButton />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
