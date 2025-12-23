import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get recent validation logs with response text
    const logs = await sql`
      SELECT
        id,
        created_at,
        user_query,
        articles_found,
        article_titles,
        validation_passed,
        confidence_score,
        response_text
      FROM vic_validation_logs
      WHERE user_query NOT LIKE '%silent%'
        AND user_query NOT LIKE '%greeting%'
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Admin responses error:', error)
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
  }
}
