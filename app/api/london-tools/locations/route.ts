import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, locations: [] })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Fetch articles with location data
    const locations = await sql`
      SELECT id, title, slug, location_name, latitude, longitude, borough
      FROM articles
      WHERE id = ANY(${ids})
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY location_name
    `

    return NextResponse.json({
      success: true,
      locations
    })
  } catch (error) {
    console.error('Failed to fetch locations:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch locations' }, { status: 500 })
  }
}
