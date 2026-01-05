'use client'

import Image from 'next/image'

export interface ChatArticle {
  id?: number
  title: string
  slug: string
  author?: string
  excerpt?: string
  featuredImageUrl?: string
  categories?: string[]
  score?: number
}

interface ChatArticleCardProps {
  article: ChatArticle
  status?: 'inProgress' | 'executing' | 'complete'
  onConfirm?: () => void
  onReject?: () => void
  showActions?: boolean
}

/**
 * Rich article card component for displaying articles inline in CopilotKit chat
 *
 * Features:
 * - Featured image with fallback
 * - Title, author, excerpt
 * - Category tags
 * - Optional confirm/reject actions for interest tracking
 * - Loading state support
 */
export function ChatArticleCard({
  article,
  status = 'complete',
  onConfirm,
  onReject,
  showActions = false,
}: ChatArticleCardProps) {
  const isLoading = status === 'inProgress' || status === 'executing'

  // Generate article URL
  const articleUrl = `/article/${article.slug}`

  // Fallback image if none provided
  const imageUrl = article.featuredImageUrl || '/Lost London Logo.png'

  if (isLoading) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4 my-3 animate-pulse">
        <div className="flex gap-4">
          <div className="w-24 h-24 bg-stone-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-stone-200 rounded w-3/4" />
            <div className="h-3 bg-stone-100 rounded w-1/4" />
            <div className="h-3 bg-stone-100 rounded w-full" />
            <div className="h-3 bg-stone-100 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden my-3 hover:border-stone-400 transition-colors shadow-sm">
      {/* Main content area */}
      <a href={articleUrl} className="flex gap-4 p-4 group">
        {/* Featured Image */}
        <div className="w-24 h-24 relative flex-shrink-0 rounded-lg overflow-hidden bg-stone-100">
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="96px"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-serif font-bold text-stone-900 text-sm leading-tight group-hover:underline line-clamp-2">
            {article.title}
          </h4>

          {article.author && (
            <p className="text-xs text-stone-500 mt-1">
              By {article.author}
            </p>
          )}

          {article.excerpt && (
            <p className="text-xs text-stone-600 mt-2 line-clamp-2">
              {article.excerpt}
            </p>
          )}

          {/* Categories */}
          {article.categories && article.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.categories.slice(0, 3).map((category, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </a>

      {/* Action buttons for interest confirmation */}
      {showActions && (onConfirm || onReject) && (
        <div className="flex border-t border-stone-100 divide-x divide-stone-100">
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              Yes, interested
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
            >
              Not this one
            </button>
          )}
        </div>
      )}

      {/* Read more link */}
      {!showActions && (
        <a
          href={articleUrl}
          className="block px-4 py-2 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors border-t border-stone-100"
        >
          Read full article &rarr;
        </a>
      )}
    </div>
  )
}

/**
 * Compact article link for inline mentions
 */
export function ChatArticleLink({ article }: { article: ChatArticle }) {
  return (
    <a
      href={`/article/${article.slug}`}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-xs text-stone-700 transition-colors"
    >
      <span className="truncate max-w-[200px]">{article.title}</span>
      <span className="text-stone-400">&rarr;</span>
    </a>
  )
}
