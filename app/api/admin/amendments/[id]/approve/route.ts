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

    // Get the amendment
    const [amendment] = await sql`
      SELECT id, amended_text, article_title, original_text
      FROM vic_amendments
      WHERE id = ${parseInt(id)}
    `

    if (!amendment) {
      return NextResponse.json({ error: 'Amendment not found' }, { status: 404 })
    }

    // Update amendment status
    await sql`
      UPDATE vic_amendments
      SET status = 'approved', applied_to_cache = true
      WHERE id = ${parseInt(id)}
    `

    // If this is a voice correction with context about what was wrong,
    // we could potentially update the cache, but for now we just mark it approved
    // The admin can manually create a proper correction if needed

    return NextResponse.json({
      success: true,
      message: 'Correction approved',
      amendment: { ...amendment, status: 'approved' }
    })
  } catch (error) {
    console.error('Approve amendment error:', error)
    return NextResponse.json({ error: 'Failed to approve amendment' }, { status: 500 })
  }
}
