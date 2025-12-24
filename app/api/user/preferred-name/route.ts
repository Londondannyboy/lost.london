import { NextRequest, NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const result = await sql`
      SELECT preferred_name
      FROM public.user_data
      WHERE user_id = ${user.id}
    ` as { preferred_name: string | null }[]

    return NextResponse.json({
      preferred_name: result[0]?.preferred_name || null
    })
  } catch (error) {
    console.error('Get preferred name error:', error)
    return NextResponse.json({ error: 'Failed to get preferred name' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { preferred_name } = await request.json()

    // Upsert the preferred name
    await sql`
      INSERT INTO public.user_data (user_id, preferred_name, created_at, updated_at)
      VALUES (${user.id}, ${preferred_name}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET preferred_name = ${preferred_name}, updated_at = NOW()
    `

    return NextResponse.json({ success: true, preferred_name })
  } catch (error) {
    console.error('Save preferred name error:', error)
    return NextResponse.json({ error: 'Failed to save preferred name' }, { status: 500 })
  }
}
