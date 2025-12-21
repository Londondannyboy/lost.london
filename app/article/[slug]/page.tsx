import { neon } from '@neondatabase/serverless'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

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
}

async function getArticle(slug: string): Promise<Article | null> {
  const sql = neon(process.env.DATABASE_URL!)
  const articles = await sql`
    SELECT id, title, slug, content, excerpt, author, publication_date, featured_image_url, categories
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
    LIMIT 3
  `
  return articles as Article[]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return { title: 'Article Not Found' }
  }

  return {
    title: `${article.title} | VIC - London History`,
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

  // Format the publication date
  const formattedDate = article.publication_date
    ? new Date(article.publication_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to VIC
          </Link>
        </div>
      </header>

      {/* Hero Image */}
      {article.featured_image_url && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Categories */}
        {article.categories && article.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.categories.map((cat) => (
              <span key={cat} className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-black leading-tight mb-6">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-gray-600 mb-8 pb-8 border-b border-gray-200">
          <span className="font-medium">{article.author}</span>
          {formattedDate && (
            <>
              <span className="text-gray-300">|</span>
              <span>{formattedDate}</span>
            </>
          )}
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xl text-gray-700 leading-relaxed mb-8 font-serif italic">
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-black prose-p:text-gray-800 prose-p:leading-relaxed prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
        />
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <h2 className="text-2xl font-serif font-bold text-black mb-8">More from Vic Keegan</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/article/${related.slug}`}
                  className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  {related.featured_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={related.featured_image_url}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-black group-hover:text-blue-700 transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link href="/" className="text-gray-600 hover:text-black transition-colors">
            ← Back to VIC - Your London History Guide
          </Link>
        </div>
      </footer>
    </div>
  )
}

function formatContent(content: string): string {
  if (!content) return ''

  // Convert plain text to paragraphs
  // Split by double newlines and wrap in <p> tags
  const paragraphs = content
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return paragraphs
}
