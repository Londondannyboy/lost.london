'use client'

import { useState, useEffect } from 'react'

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-300">
          We use cookies to improve your experience. By continuing, you agree to our use of cookies.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 text-sm bg-white text-black rounded hover:bg-gray-200 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
