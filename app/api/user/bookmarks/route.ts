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
      SELECT bookmarks FROM user_data WHERE user_id = ${user.id}
    ` as { bookmarks: number[] }[]

    return NextResponse.json({
      success: true,
      bookmarks: result[0]?.bookmarks || []
    })
  } catch (error) {
    console.error('Failed to fetch bookmarks:', error)
    return NextResponse.json({ success: true, bookmarks: [] })
  }
}

export async function POST(request: Request) {
  const { user } = await neonAuth()

  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { articleId, action } = await request.json()

    if (!articleId || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    // Ensure user_data record exists
    await sql`
      INSERT INTO user_data (user_id, bookmarks)
      VALUES (${user.id}, '{}')
      ON CONFLICT (user_id) DO NOTHING
    `

    if (action === 'add') {
      await sql`
        UPDATE user_data
        SET bookmarks = array_append(bookmarks, ${articleId}),
            updated_at = NOW()
        WHERE user_id = ${user.id}
          AND NOT (${articleId} = ANY(bookmarks))
      `
    } else {
      await sql`
        UPDATE user_data
        SET bookmarks = array_remove(bookmarks, ${articleId}),
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `
    }

    // Get updated bookmarks
    const result = await sql`
      SELECT bookmarks FROM user_data WHERE user_id = ${user.id}
    ` as { bookmarks: number[] }[]

    return NextResponse.json({
      success: true,
      bookmarks: result[0]?.bookmarks || []
    })
  } catch (error) {
    console.error('Failed to update bookmarks:', error)
    return NextResponse.json({ success: false, error: 'Failed to update bookmarks' }, { status: 500 })
  }
}
