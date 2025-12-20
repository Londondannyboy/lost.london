import { NextResponse } from 'next/server'
import { getRandomArticle } from '@/lib/db'

export async function POST() {
  try {
    const article = await getRandomArticle()

    if (!article) {
      return NextResponse.json({
        success: false,
        error: 'No articles found',
      })
    }

    return NextResponse.json({
      success: true,
      article: {
        title: article.title,
        author: article.author,
        publication_date: article.publication_date,
        excerpt: article.excerpt,
        content: article.content?.substring(0, 1500) + '...',
        url: article.url,
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
