import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const searchTerm = `%${title}%`
    const articles = await sql`
      SELECT id, title, slug, url, author, publication_date, content, excerpt, featured_image_url, categories
      FROM articles
      WHERE LOWER(title) LIKE LOWER(${searchTerm})
      ORDER BY publication_date DESC NULLS LAST
      LIMIT 1
    `

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Article not found',
      })
    }

    const article = articles[0] as any

    return NextResponse.json({
      success: true,
      article: {
        title: article.title,
        author: article.author,
        publication_date: article.publication_date,
        content: article.content?.substring(0, 2000) + (article.content?.length > 2000 ? '...' : ''),
        excerpt: article.excerpt,
        url: article.url,
        categories: article.categories || [],
        featured_image_url: article.featured_image_url,
      },
    })
  } catch (error) {
    console.error('Article fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}
