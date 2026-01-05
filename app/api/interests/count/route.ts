import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/**
 * Pending Interests Count API
 * Returns count of pending interests for a user (no auth required for CLM to call)
 */

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const result = await sql`
      SELECT COUNT(*) as count
      FROM pending_interests
      WHERE user_id = ${userId} AND status = 'pending'
    ` as Array<{ count: string }>

    const count = parseInt(result[0]?.count || '0')

    return NextResponse.json({
      pending: count,
    })
  } catch (error) {
    console.error('[Interests Count] Error:', error)
    return NextResponse.json({ pending: 0 })
  }
}
