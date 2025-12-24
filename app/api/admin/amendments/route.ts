import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const amendments = await sql`
      SELECT
        id,
        amendment_type,
        original_text,
        amended_text,
        article_title,
        reason,
        created_at,
        applied_to_zep,
        applied_to_cache,
        COALESCE(status, 'pending') as status,
        COALESCE(source, 'admin_correction') as source
      FROM vic_amendments
      ORDER BY created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ amendments })
  } catch (error) {
    console.error('Admin amendments GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch amendments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()

    const {
      amendment_type,
      original_text,
      amended_text,
      article_title,
      reason,
      user_query
    } = body

    // Insert amendment
    const result = await sql`
      INSERT INTO vic_amendments
        (amendment_type, original_text, amended_text, article_title, reason)
      VALUES
        (${amendment_type}, ${original_text}, ${amended_text}, ${article_title}, ${reason})
      RETURNING *
    `

    // Also update the cache with the corrected response
    if (user_query && amended_text) {
      await sql`
        INSERT INTO vic_response_cache (normalized_query, variations, response_text, article_titles)
        VALUES (${user_query.toLowerCase()}, ARRAY[${user_query.toLowerCase()}], ${amended_text}, ARRAY[${article_title}])
        ON CONFLICT (normalized_query) DO UPDATE
        SET response_text = ${amended_text}, article_titles = ARRAY[${article_title}]
      `
    }

    return NextResponse.json({ amendment: result[0], cached: true })
  } catch (error) {
    console.error('Admin amendments POST error:', error)
    return NextResponse.json({ error: 'Failed to save amendment' }, { status: 500 })
  }
}
