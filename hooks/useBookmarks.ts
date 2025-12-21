'use client'

import { useState, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth/client'

export function useBookmarks() {
  const { data: session } = authClient.useSession()
  const [bookmarks, setBookmarks] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks()
  }, [session])

  const loadBookmarks = async () => {
    if (session?.user?.id) {
      // Fetch from server for logged-in users
      try {
        const res = await fetch('/api/user/bookmarks')
        const data = await res.json()
        if (data.success) {
          setBookmarks(data.bookmarks || [])
        }
      } catch (error) {
        console.error('Failed to load bookmarks:', error)
      }
    } else {
      // Use localStorage for anonymous users
      const stored = localStorage.getItem('bookmarks')
      if (stored) {
        try {
          setBookmarks(JSON.parse(stored))
        } catch {
          setBookmarks([])
        }
      }
    }
    setLoading(false)
  }

  const addBookmark = useCallback(async (articleId: number) => {
    const newBookmarks = [...bookmarks, articleId]
    setBookmarks(newBookmarks)

    if (session?.user?.id) {
      // Save to server
      try {
        await fetch('/api/user/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, action: 'add' })
        })
      } catch (error) {
        console.error('Failed to save bookmark:', error)
      }
    } else {
      // Save to localStorage
      localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
    }
  }, [bookmarks, session])

  const removeBookmark = useCallback(async (articleId: number) => {
    const newBookmarks = bookmarks.filter(id => id !== articleId)
    setBookmarks(newBookmarks)

    if (session?.user?.id) {
      // Remove from server
      try {
        await fetch('/api/user/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId, action: 'remove' })
        })
      } catch (error) {
        console.error('Failed to remove bookmark:', error)
      }
    } else {
      // Save to localStorage
      localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
    }
  }, [bookmarks, session])

  const toggleBookmark = useCallback(async (articleId: number) => {
    if (bookmarks.includes(articleId)) {
      await removeBookmark(articleId)
    } else {
      await addBookmark(articleId)
    }
  }, [bookmarks, addBookmark, removeBookmark])

  const isBookmarked = useCallback((articleId: number) => {
    return bookmarks.includes(articleId)
  }, [bookmarks])

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    isLoggedIn: !!session?.user
  }
}
