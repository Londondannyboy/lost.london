'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 text-white backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-300 text-center sm:text-left">
          <span className="text-amber-400 font-semibold">BETA:</span>{' '}
          This is a demo product. User data may be periodically cleared.{' '}
          We use cookies to improve your experience.{' '}
          <Link href="/privacy" className="underline hover:text-white">
            Privacy Policy & Terms
          </Link>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-600 hover:border-white rounded transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-white text-black hover:bg-gray-200 rounded font-medium transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
