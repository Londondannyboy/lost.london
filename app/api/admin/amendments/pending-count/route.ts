import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

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
