import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const sessionId = searchParams.get('session_id')

    // Filter by session if provided, otherwise show recent (last 10 min)
    const logs = sessionId
      ? await sql`
          SELECT
            id, created_at, user_query, articles_found, article_titles,
            facts_checked, validation_passed, validation_notes, confidence_score
          FROM vic_validation_logs
          WHERE session_id LIKE ${sessionId + '%'}
            AND user_query NOT LIKE '%silent%'
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT
            id, created_at, user_query, articles_found, article_titles,
            facts_checked, validation_passed, validation_notes, confidence_score
          FROM vic_validation_logs
          WHERE created_at > NOW() - INTERVAL '10 minutes'
            AND user_query NOT LIKE '%silent%'
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
