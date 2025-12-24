import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'

export async function GET() {
  try {
    // Verify admin access
    const { user } = await neonAuth()
    if (!user) {
      return NextResponse.json({ count: 0 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if user is admin
    const [dbUser] = await sql`SELECT role FROM neon_auth.user WHERE id = ${user.id}` as { role: string }[]
    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ count: 0 })
    }

    // Count pending voice corrections
    const result = await sql`
      SELECT COUNT(*) as count
      FROM vic_amendments
      WHERE COALESCE(source, 'admin_correction') = 'voice_feedback'
        AND COALESCE(status, 'pending') = 'pending'
    `

    return NextResponse.json({ count: parseInt(result[0]?.count || '0') })
  } catch (error) {
    console.error('Pending count error:', error)
    return NextResponse.json({ count: 0 })
  }
}
