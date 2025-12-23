import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const logs = await sql`
      SELECT
        id,
        created_at,
        user_query,
        normalized_query,
        articles_found,
        article_titles,
        facts_checked,
        validation_passed,
        validation_notes,
        response_text,
        confidence_score,
        session_id
      FROM vic_validation_logs
      WHERE user_query NOT LIKE '%silent%'
        AND user_query NOT LIKE '%greeting%'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({
      logs,
      count: logs.length,
    })
  } catch (error) {
    console.error('Error fetching validation logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validation logs' },
      { status: 500 }
    )
  }
}
