import { NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'
import { sql } from '@/lib/db'

export async function GET() {
  const { user } = await neonAuth()

  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const result = await sql`
      SELECT visited_locations FROM user_data WHERE user_id = ${user.id}
    ` as { visited_locations: number[] }[]

    return NextResponse.json({
      success: true,
      visited: result[0]?.visited_locations || []
    })
  } catch (error) {
    console.error('Failed to fetch visited locations:', error)
    return NextResponse.json({ success: true, visited: [] })
  }
}

export async function POST(request: Request) {
  const { user } = await neonAuth()

  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { locationId, action } = await request.json()

    if (!locationId || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    // Ensure user_data record exists
    await sql`
      INSERT INTO user_data (user_id, bookmarks, visited_locations)
      VALUES (${user.id}, '{}', '{}')
      ON CONFLICT (user_id) DO NOTHING
    `

    if (action === 'add') {
      await sql`
        UPDATE user_data
        SET visited_locations = array_append(visited_locations, ${locationId}),
            updated_at = NOW()
        WHERE user_id = ${user.id}
          AND NOT (${locationId} = ANY(visited_locations))
      `
    } else {
      await sql`
        UPDATE user_data
        SET visited_locations = array_remove(visited_locations, ${locationId}),
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `
    }

    const result = await sql`
      SELECT visited_locations FROM user_data WHERE user_id = ${user.id}
    ` as { visited_locations: number[] }[]

    return NextResponse.json({
      success: true,
      visited: result[0]?.visited_locations || []
    })
  } catch (error) {
    console.error('Failed to update visited locations:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}
