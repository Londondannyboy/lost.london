'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import Link from 'next/link'

interface Article {
  id: number
  title: string
  slug: string
  author: string
  excerpt: string
  content: string
  featured_image_url?: string
  categories?: string[]
}

export default function SurprisePage() {
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [animating, setAnimating] = useState(false)

  const fetchRandom = async () => {
    setAnimating(true)
    setLoading(true)

    try {
      const res = await fetch('/api/london-tools/random', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        // Add a slight delay for the animation effect
        setTimeout(() => {
          setArticle(data.article)
          setLoading(false)
          setAnimating(false)
        }, 500)
      }
    } catch (error) {
      console.error('Failed to fetch random article:', error)
      setLoading(false)
      setAnimating(false)
    }
  }

  useEffect(() => {
    fetchRandom()
  }, [])

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-gradient-london mb-4">
            Surprise Me
          </h1>
          <p className="text-gray-400">
            Discover a random piece of London&apos;s hidden history
          </p>
        </div>

        {/* Surprise button */}
        <div className="text-center mb-8">
          <button
            onClick={fetchRandom}
            disabled={animating}
            className={`btn-london inline-flex items-center gap-2 ${
              animating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className={animating ? 'animate-spin' : ''}>🎲</span>
            {animating ? 'Discovering...' : 'Surprise Me Again'}
          </button>
        </div>

        {/* Article display */}
        <div className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {loading && !animating ? (
            <div className="article-card p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-london-800 rounded-lg" />
                <div className="h-6 bg-london-800 rounded w-3/4" />
                <div className="h-4 bg-london-800 rounded w-1/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-london-800 rounded" />
                  <div className="h-4 bg-london-800 rounded" />
                  <div className="h-4 bg-london-800 rounded w-5/6" />
                </div>
              </div>
            </div>
          ) : article ? (
            <article className="article-card overflow-hidden">
              {article.featured_image_url && (
                <img
                  src={article.featured_image_url}
                  alt={article.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="p-6">
                <h2 className="text-2xl font-serif text-white mb-2">
                  {article.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  By {article.author}
                </p>

                {article.categories && article.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.categories.slice(0, 3).map(cat => (
                      <span
                        key={cat}
                        className="text-xs bg-london-800 text-gray-300 px-2 py-1 rounded"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-gray-300 mb-6 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-london-400 hover:text-london-300 font-medium"
                  >
                    Read full article →
                  </Link>
                </div>
              </div>
            </article>
          ) : null}
        </div>

        {/* Explore more */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Want to explore more?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/map" className="text-london-400 hover:text-london-300">
              View Map
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/timeline" className="text-london-400 hover:text-london-300">
              Browse Timeline
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/nearby" className="text-london-400 hover:text-london-300">
              What&apos;s Near Me
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
