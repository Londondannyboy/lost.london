import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const { user } = await neonAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if user is admin
    const [dbUser] = await sql`SELECT role FROM neon_auth.user WHERE id = ${user.id}` as { role: string }[]
    if (dbUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const { id } = await params

    // Update amendment status to rejected
    const result = await sql`
      UPDATE vic_amendments
      SET status = 'rejected'
      WHERE id = ${parseInt(id)}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Amendment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Correction rejected'
    })
  } catch (error) {
    console.error('Reject amendment error:', error)
    return NextResponse.json({ error: 'Failed to reject amendment' }, { status: 500 })
  }
}
