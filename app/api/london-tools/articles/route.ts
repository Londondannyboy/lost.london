import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, articles: [] })
    }

    // Fetch articles by IDs
    const articles = await sql`
      SELECT id, title, slug, excerpt, featured_image_url, author, publication_date
      FROM articles
      WHERE id = ANY(${ids})
      ORDER BY title
    `

    return NextResponse.json({
      success: true,
      articles
    })
  } catch (error) {
    console.error('Articles API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}
