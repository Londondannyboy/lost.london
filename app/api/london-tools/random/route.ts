import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const articles = await sql`
      SELECT id, title, slug, url, author, publication_date, content, excerpt, featured_image_url, categories
      FROM articles
      ORDER BY RANDOM()
      LIMIT 1
    `

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No articles found',
      })
    }

    const article = articles[0] as any

    return NextResponse.json({
      success: true,
      article: {
        title: article.title,
        author: article.author,
        publication_date: article.publication_date,
        excerpt: article.excerpt,
        content: article.content?.substring(0, 1500) + (article.content?.length > 1500 ? '...' : ''),
        url: article.url,
        categories: article.categories || [],
        featured_image_url: article.featured_image_url,
      },
    })
  } catch (error) {
    console.error('Random article error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch random article' },
      { status: 500 }
    )
  }
}
