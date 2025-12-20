import { NextRequest, NextResponse } from 'next/server'
import { searchArticles } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', articles: [] },
        { status: 400 }
      )
    }

    const articles = await searchArticles(query, limit)

    return NextResponse.json({
      success: true,
      query,
      count: articles.length,
      articles: articles.map(a => ({
        title: a.title,
        author: a.author,
        excerpt: a.excerpt?.substring(0, 300) + '...',
        url: a.url,
        publication_date: a.publication_date,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', articles: [] },
      { status: 500 }
    )
  }
}
