import { NextRequest, NextResponse } from 'next/server'
import { getCategories, getArticlesByCategory } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { category } = await request.json()

    if (category) {
      // Get articles for specific category
      const articles = await getArticlesByCategory(category, 5)
      return NextResponse.json({
        success: true,
        category,
        count: articles.length,
        articles: articles.map(a => ({
          title: a.title,
          author: a.author,
          excerpt: a.excerpt?.substring(0, 200) + '...',
          url: a.url,
        })),
      })
    } else {
      // List all categories
      const categories = await getCategories()
      return NextResponse.json({
        success: true,
        categories: categories.map((c: any) => ({
          name: c.name,
          article_count: c.article_count,
        })),
      })
    }
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
