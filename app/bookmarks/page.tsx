'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { useBookmarks } from '@/hooks/useBookmarks'
import Link from 'next/link'

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  author: string
}

export default function BookmarksPage() {
  const { bookmarks, loading: bookmarksLoading, removeBookmark, isLoggedIn } = useBookmarks()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookmarksLoading && bookmarks.length > 0) {
      fetchArticles()
    } else if (!bookmarksLoading) {
      setLoading(false)
    }
  }, [bookmarks, bookmarksLoading])

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/london-tools/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bookmarks })
      })
      const data = await res.json()
      if (data.success) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error('Failed to fetch bookmarked articles:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif text-gradient-london mb-2">
            My Bookmarks
          </h1>
          <p className="text-gray-400">
            {isLoggedIn ? (
              'Your saved articles, synced across all your devices.'
            ) : (
              'Your saved articles. Sign in to sync across devices.'
            )}
          </p>
        </div>

        {loading || bookmarksLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="article-card p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-london-800 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-london-800 rounded w-3/4" />
                    <div className="h-4 bg-london-800 rounded w-1/4" />
                    <div className="h-4 bg-london-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map(article => (
              <div key={article.id} className="article-card p-4 flex gap-4 items-start">
                <Link href={`/article/${article.slug}`} className="flex-shrink-0">
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-london-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📜</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/article/${article.slug}`}>
                    <h2 className="font-serif text-white hover:text-gold-400 transition-colors">
                      {article.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">By {article.author}</p>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
                <button
                  onClick={() => removeBookmark(article.id)}
                  className="text-red-500 hover:text-red-400 p-2"
                  title="Remove from bookmarks"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-serif text-white mb-2">No bookmarks yet</h2>
            <p className="text-gray-400 mb-6">
              Start exploring and save articles you want to read later.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/surprise" className="btn-london">
                Surprise Me
              </Link>
              <Link href="/map" className="text-london-400 hover:text-london-300 py-2">
                Explore Map
              </Link>
            </div>
          </div>
        )}

        {!isLoggedIn && articles.length > 0 && (
          <div className="mt-8 p-4 bg-london-900/50 border border-london-700 rounded-lg text-center">
            <p className="text-gray-400 mb-3">
              Sign in to sync your bookmarks across all your devices
            </p>
            <Link href="/auth/sign-in" className="text-london-400 hover:text-london-300 font-medium">
              Sign in →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
