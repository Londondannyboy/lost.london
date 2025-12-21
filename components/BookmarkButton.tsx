'use client'

import { useBookmarks } from '@/hooks/useBookmarks'

interface BookmarkButtonProps {
  articleId: number
  className?: string
  showLabel?: boolean
}

export function BookmarkButton({ articleId, className = '', showLabel = false }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, loading } = useBookmarks()
  const bookmarked = isBookmarked(articleId)

  if (loading) {
    return (
      <button
        disabled
        className={`opacity-50 ${className}`}
      >
        <span className="text-gray-500">♡</span>
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleBookmark(articleId)
      }}
      className={`transition-colors hover:scale-110 active:scale-95 ${className}`}
      title={bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      <span className={bookmarked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}>
        {bookmarked ? '♥' : '♡'}
      </span>
      {showLabel && (
        <span className="ml-1 text-sm">
          {bookmarked ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  )
}
