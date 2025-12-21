import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Phonetic variations and common mishearings
const PHONETIC_MAPPINGS: Record<string, string> = {
  // Thorney variations
  'fauny': 'thorney',
  'fawny': 'thorney',
  'thorny': 'thorney',
  'thorn-ee': 'thorney',
  'forney': 'thorney',
  'fawney': 'thorney',
  'fourney': 'thorney',
  'fauny island': 'thorney island',
  'fawny island': 'thorney island',
  'thorny island': 'thorney island',
  // Tyburn variations
  'tie burn': 'tyburn',
  'tieburn': 'tyburn',
  'ty burn': 'tyburn',
  // Devil's Acre variations
  'devils acre': "devil's acre",
  'devil acre': "devil's acre",
  'devil\'s acre': "devil's acre",
  // Westminster variations
  'west minster': 'westminster',
  // Caxton variations
  'caxton': 'caxton',
  'william caxton': 'caxton',
}

function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim()

  // Check for exact phonetic matches
  if (PHONETIC_MAPPINGS[normalized]) {
    return PHONETIC_MAPPINGS[normalized]
  }

  // Check for partial matches within the query
  for (const [phonetic, correct] of Object.entries(PHONETIC_MAPPINGS)) {
    if (normalized.includes(phonetic)) {
      normalized = normalized.replace(phonetic, correct)
    }
  }

  return normalized
}

async function searchThorneyIsland(query: string, limit: number = 5) {
  const sql = neon(process.env.DATABASE_URL!)
  const normalizedQuery = normalizeQuery(query)
  const searchTerm = `%${normalizedQuery}%`

  const chunks = await sql`
    SELECT id, chunk_number, content
    FROM thorney_island_knowledge
    WHERE LOWER(content) LIKE LOWER(${searchTerm})
    ORDER BY chunk_number
    LIMIT ${limit}
  `

  return chunks
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', results: [] },
        { status: 400 }
      )
    }

    const chunks = await searchThorneyIsland(query, limit)

    const normalizedQuery = normalizeQuery(query)

    return NextResponse.json({
      success: true,
      source: 'Thorney Island by Vic Keegan',
      query,
      normalized_query: normalizedQuery,
      count: chunks.length,
      results: chunks.map((c: any) => ({
        chunk_number: c.chunk_number,
        content: c.content,
        // Format content for better readability - preserve paragraph breaks
        excerpt: c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''),
        // HTML-formatted version for display
        content_html: c.content.split('\n\n').map((p: string) => `<p>${p}</p>`).join(''),
      })),
    })
  } catch (error) {
    console.error('Thorney Island search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', results: [] },
        { status: 400 }
      )
    }

    const chunks = await searchThorneyIsland(query, limit)
    const normalizedQuery = normalizeQuery(query)

    return NextResponse.json({
      success: true,
      source: 'Thorney Island by Vic Keegan',
      query,
      normalized_query: normalizedQuery,
      count: chunks.length,
      results: chunks.map((c: any) => ({
        chunk_number: c.chunk_number,
        content: c.content,
        excerpt: c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''),
        content_html: c.content.split('\n\n').map((p: string) => `<p>${p}</p>`).join(''),
      })),
    })
  } catch (error) {
    console.error('Thorney Island search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
