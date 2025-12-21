import { neon } from '@neondatabase/serverless'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthorCard } from '@/components/AuthorCard'
import { EraBadge } from '@/components/EraBadge'
import { LocationCard } from '@/components/LocationCard'
import { BookmarkButton } from '@/components/BookmarkButton'
import { ArticleVoiceWidget } from '@/components/ArticleVoiceWidget'

interface Article {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  author: string
  publication_date: string
  featured_image_url: string
  categories: string[]
  latitude?: number
  longitude?: number
  location_name?: string
  borough?: string
  historical_era?: string
  year_from?: number
  year_to?: number
  series_id?: number
  series_position?: number
}

async function getArticle(slug: string): Promise<Article | null> {
  const sql = neon(process.env.DATABASE_URL!)
  const articles = await sql`
    SELECT id, title, slug, content, excerpt, author, publication_date, featured_image_url, categories,
           latitude, longitude, location_name, borough, historical_era, year_from, year_to,
           series_id, series_position
    FROM articles
    WHERE slug = ${slug}
    LIMIT 1
  `
  return articles[0] as Article || null
}

async function getRelatedArticles(categories: string[], currentId: number): Promise<Article[]> {
  if (!categories || categories.length === 0) return []

  const sql = neon(process.env.DATABASE_URL!)
  const articles = await sql`
    SELECT id, title, slug, excerpt, featured_image_url, categories
    FROM articles
    WHERE id != ${currentId}
      AND categories && ${categories}::text[]
    ORDER BY RANDOM()
    LIMIT 4
  `
  return articles as Article[]
}

async function getSeriesArticles(seriesId: number, currentPosition: number): Promise<{ prev: Article | null; next: Article | null }> {
  const sql = neon(process.env.DATABASE_URL!)

  const [prev] = await sql`
    SELECT id, title, slug, series_position
    FROM articles
    WHERE series_id = ${seriesId} AND series_position < ${currentPosition}
    ORDER BY series_position DESC
    LIMIT 1
  `

  const [next] = await sql`
    SELECT id, title, slug, series_position
    FROM articles
    WHERE series_id = ${seriesId} AND series_position > ${currentPosition}
    ORDER BY series_position ASC
    LIMIT 1
  `

  return { prev: prev as Article || null, next: next as Article || null }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return { title: 'Article Not Found' }
  }

  return {
    title: `${article.title} | Lost London`,
    description: article.excerpt || `Read about ${article.title} by Vic Keegan`,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: article.featured_image_url ? [article.featured_image_url] : [],
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  const relatedArticles = await getRelatedArticles(article.categories, article.id)

  let seriesNav = { prev: null as Article | null, next: null as Article | null }
  if (article.series_id && article.series_position) {
    seriesNav = await getSeriesArticles(article.series_id, article.series_position)
  }

  const formattedDate = article.publication_date
    ? new Date(article.publication_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

  // Extract first sentence for lead paragraph styling
  const sentences = article.content.split(/(?<=[.!?])\s+/)
  const leadSentence = sentences[0] || ''
  const restContent = sentences.slice(1).join(' ')

  return (
    <div className="min-h-screen bg-stone-50 text-black">
      {/* Masthead */}
      <header className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-tight">
            Lost London
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/map" className="hover:text-gray-300">Map</Link>
            <Link href="/timeline" className="hover:text-gray-300">Timeline</Link>
            <Link href="/series" className="hover:text-gray-300">Series</Link>
            <Link href="/routes" className="hover:text-gray-300">Routes</Link>
          </nav>
        </div>
      </header>

      {/* Article Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Categories & Era */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {article.historical_era && (
              <EraBadge
                era={article.historical_era}
                yearFrom={article.year_from}
                yearTo={article.year_to}
              />
            )}
            {article.categories?.slice(0, 3).map((cat) => (
              <span key={cat} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                {cat}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-black leading-tight mb-4">
            {article.title}
          </h1>

          {/* Excerpt as standfirst */}
          {article.excerpt && (
            <p className="text-xl text-gray-700 font-serif leading-relaxed border-l-4 border-red-700 pl-4">
              {article.excerpt}
            </p>
          )}

          {/* Bookmark button */}
          <div className="mt-4 flex items-center gap-4">
            <BookmarkButton articleId={article.id} showLabel />
            {article.series_position && (
              <span className="text-sm text-gray-500">
                Lost London #{article.series_position}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero Image */}
      {article.featured_image_url && (
        <div className="max-w-5xl mx-auto px-4 -mt-4 mb-8">
          <figure className="relative">
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="w-full h-[50vh] object-cover rounded-lg shadow-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
              <figcaption className="text-white text-sm opacity-90">
                {article.location_name || article.title}
              </figcaption>
            </div>
          </figure>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Author & Meta - Above Content */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-gray-200">
          <AuthorCard name={article.author} date={formattedDate} />

          {(article.location_name || article.latitude) && (
            <LocationCard
              name={article.location_name}
              borough={article.borough}
              latitude={article.latitude}
              longitude={article.longitude}
            />
          )}
        </div>

        {/* Ask VIC about this article */}
        <div className="mb-8">
          <ArticleVoiceWidget
            article={{
              title: article.title,
              author: article.author,
              content: article.content,
              excerpt: article.excerpt,
              categories: article.categories,
              location_name: article.location_name,
              historical_era: article.historical_era,
            }}
          />
        </div>

        {/* Series Navigation - Compact */}
        {(seriesNav.prev || seriesNav.next) && (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-8">
            <div className="text-sm">
              {seriesNav.prev ? (
                <Link
                  href={`/article/${seriesNav.prev.slug}`}
                  className="text-gray-600 hover:text-red-700"
                >
                  ← Previous
                </Link>
              ) : <span />}
            </div>
            <span className="text-xs text-gray-500 font-medium">Lost London Series</span>
            <div className="text-sm">
              {seriesNav.next ? (
                <Link
                  href={`/article/${seriesNav.next.slug}`}
                  className="text-gray-600 hover:text-red-700"
                >
                  Next →
                </Link>
              ) : <span />}
            </div>
          </div>
        )}

        {/* Main Article Content */}
        <article className="mb-12">
          {/* Lead paragraph - larger with drop cap */}
          {leadSentence && (
            <p className="text-xl md:text-2xl font-serif text-gray-900 leading-relaxed mb-8">
              <span className="text-6xl md:text-7xl font-bold float-left mr-3 mt-1 text-red-700 leading-none">
                {leadSentence.charAt(0)}
              </span>
              {leadSentence.slice(1)}
            </p>
          )}

          {/* Rest of content */}
          <div
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(restContent) }}
          />
        </article>

        {/* Related Articles - Below Content */}
        {relatedArticles.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <h3 className="font-serif font-bold text-xl text-black mb-6 pb-2 border-b-2 border-black inline-block">
              Related Stories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/article/${related.slug}`}
                  className="block group"
                >
                  {related.featured_image_url && (
                    <div className="aspect-video overflow-hidden rounded mb-2">
                      <img
                        src={related.featured_image_url}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <h4 className="font-serif text-sm font-medium text-gray-900 group-hover:text-red-700 transition-colors leading-tight">
                    {related.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black text-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="font-serif text-xl">
              Lost London
            </Link>
            <nav className="flex gap-6 text-sm text-gray-400">
              <Link href="/map" className="hover:text-white">Map</Link>
              <Link href="/timeline" className="hover:text-white">Timeline</Link>
              <Link href="/series" className="hover:text-white">Series</Link>
              <Link href="/routes" className="hover:text-white">Routes</Link>
              <Link href="/bookmarks" className="hover:text-white">Bookmarks</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}

function formatContent(content: string): string {
  if (!content) return ''

  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g

  // Convert URLs to anchor tags
  const contentWithLinks = content.replace(urlPattern, (url) => {
    // Clean up trailing punctuation that might be part of sentence
    let cleanUrl = url
    let trailing = ''
    if (/[.,;:!?)]$/.test(url)) {
      trailing = url.slice(-1)
      cleanUrl = url.slice(0, -1)
    }
    // Create readable link text (domain + shortened path)
    const displayText = cleanUrl.length > 50
      ? cleanUrl.substring(0, 47) + '...'
      : cleanUrl
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-700 hover:text-blue-900 underline">${displayText}</a>${trailing}`
  })

  // Split into paragraphs
  const paragraphs = contentWithLinks
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => {
      // Replace single newlines with proper spacing
      const formatted = p.replace(/\n/g, '<br class="mb-2">')
      return `<p class="mb-6 text-gray-800 leading-loose">${formatted}</p>`
    })
    .join('')

  return paragraphs
}
