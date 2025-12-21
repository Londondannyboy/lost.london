import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Phonetic variations and topic mappings for voice recognition
const PHONETIC_MAPPINGS: Record<string, string> = {
  // Thorney variations - redirect to Thorney Island search
  'fauny': 'thorney',
  'fawny': 'thorney',
  'thorny': 'thorney',
  'forney': 'thorney',
  'fawney': 'thorney',
  'fourney': 'thorney',
  // Tyburn variations
  'tie burn': 'tyburn',
  'tieburn': 'tyburn',
  'ty burn': 'tyburn',
  // Devil's Acre variations
  'devils acre': "devil's acre",
  'devil acre': "devil's acre",
  // Westminster variations
  'west minster': 'westminster',
  // Shakespeare variations
  'shake spear': 'shakespeare',
  'shakespear': 'shakespeare',
}

// Topic expansions - when someone asks about a topic, search for related terms
const TOPIC_EXPANSIONS: Record<string, string[]> = {
  'tudor': ['tudor', 'henry viii', 'henry vii', '16th century', 'reformation'],
  'dickensian': ['dickens', 'victorian', 'oliver twist', '19th century'],
  'dickens': ['dickens', 'victorian', 'oliver twist'],
  'medieval': ['medieval', 'monastery', 'monks', 'middle ages'],
  'roman': ['roman', 'londinium', 'amphitheatre', 'baths'],
  'victorian': ['victorian', '19th century', 'crystal palace', 'railway'],
  'shakespeare': ['shakespeare', 'globe', 'curtain theatre', 'blackfriars'],
  'rivers': ['tyburn', 'fleet', 'walbrook', 'hidden rivers', 'underground'],
  'east end': ['east end', 'whitechapel', 'spitalfields', 'stepney'],
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

function expandQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim()

  // Check if this is a topic that should be expanded
  for (const [topic, expansions] of Object.entries(TOPIC_EXPANSIONS)) {
    if (normalized.includes(topic)) {
      return expansions
    }
  }

  return [normalized]
}

async function searchArticles(query: string, limit: number = 20) {
  const sql = neon(process.env.DATABASE_URL!)
  const normalizedQuery = normalizeQuery(query)
  const searchTerms = expandQuery(normalizedQuery)

  // Search with expanded terms
  const searchTerm = `%${normalizedQuery}%`

  let articles = await sql`
    SELECT id, title, slug, excerpt, featured_image_url, url, author, categories, publication_date
    FROM articles
    WHERE LOWER(title) LIKE LOWER(${searchTerm})
       OR LOWER(content) LIKE LOWER(${searchTerm})
       OR LOWER(excerpt) LIKE LOWER(${searchTerm})
    ORDER BY
      CASE WHEN LOWER(title) LIKE LOWER(${searchTerm}) THEN 0 ELSE 1 END,
      title
    LIMIT ${limit}
  `

  // If no results and we have expanded terms, try those
  if (articles.length === 0 && searchTerms.length > 1) {
    for (const term of searchTerms) {
      const expandedTerm = `%${term}%`
      const expandedResults = await sql`
        SELECT id, title, slug, excerpt, featured_image_url, url, author, categories, publication_date
        FROM articles
        WHERE LOWER(title) LIKE LOWER(${expandedTerm})
           OR LOWER(content) LIKE LOWER(${expandedTerm})
           OR LOWER(excerpt) LIKE LOWER(${expandedTerm})
        ORDER BY
          CASE WHEN LOWER(title) LIKE LOWER(${expandedTerm}) THEN 0 ELSE 1 END,
          title
        LIMIT ${limit}
      `
      if (expandedResults.length > 0) {
        articles = expandedResults
        break
      }
    }
  }

  return { articles, normalizedQuery }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', articles: [] },
        { status: 400 }
      )
    }

    const { articles, normalizedQuery } = await searchArticles(query, limit)

    return NextResponse.json({
      success: true,
      query,
      normalized_query: normalizedQuery,
      count: articles.length,
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        author: a.author,
        excerpt: a.excerpt?.substring(0, 300) + (a.excerpt?.length > 300 ? '...' : ''),
        url: a.url,
        featured_image_url: a.featured_image_url,
        categories: a.categories,
        publication_date: a.publication_date,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', articles: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 20 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', articles: [] },
        { status: 400 }
      )
    }

    const { articles, normalizedQuery } = await searchArticles(query, limit)

    return NextResponse.json({
      success: true,
      query,
      normalized_query: normalizedQuery,
      count: articles.length,
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        author: a.author,
        excerpt: a.excerpt?.substring(0, 300) + (a.excerpt?.length > 300 ? '...' : ''),
        url: a.url,
        featured_image_url: a.featured_image_url,
        categories: a.categories,
        publication_date: a.publication_date,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', articles: [] },
      { status: 500 }
    )
  }
}
