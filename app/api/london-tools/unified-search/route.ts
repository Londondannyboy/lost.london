import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Phonetic variations and common mishearings for voice recognition
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
  "devil's acre": "devil's acre",
  // Westminster variations
  'west minster': 'westminster',
  // Shakespeare variations
  'shake spear': 'shakespeare',
  'shakespear': 'shakespeare',
  // Caxton variations
  'caxton': 'caxton',
  'william caxton': 'caxton',
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

interface UnifiedResult {
  id: number
  title: string
  content: string
  excerpt: string
  source: 'article' | 'thorney_island'
  // Article-specific fields
  slug?: string
  author?: string
  url?: string
  featured_image_url?: string
  categories?: string[]
  publication_date?: string
  // Thorney Island specific
  chunk_number?: number
}

async function unifiedSearch(query: string, limit: number = 10): Promise<{ results: UnifiedResult[], normalizedQuery: string }> {
  const sql = neon(process.env.DATABASE_URL!)
  const normalizedQuery = normalizeQuery(query)
  const searchTerms = expandQuery(normalizedQuery)
  const searchTerm = `%${normalizedQuery}%`

  // Search both tables in parallel
  const [articleResults, thorneyResults] = await Promise.all([
    // Search articles table
    sql`
      SELECT
        id,
        title,
        slug,
        author,
        url,
        featured_image_url,
        categories,
        publication_date,
        COALESCE(excerpt, LEFT(content, 500)) as excerpt,
        LEFT(content, 1500) as content,
        CASE WHEN LOWER(title) LIKE LOWER(${searchTerm}) THEN 0 ELSE 1 END as relevance
      FROM articles
      WHERE LOWER(title) LIKE LOWER(${searchTerm})
         OR LOWER(content) LIKE LOWER(${searchTerm})
         OR LOWER(excerpt) LIKE LOWER(${searchTerm})
      ORDER BY relevance, title
      LIMIT ${Math.ceil(limit * 0.7)}
    `,
    // Search thorney_island_knowledge table
    sql`
      SELECT
        id,
        chunk_number,
        content,
        LEFT(content, 500) as excerpt
      FROM thorney_island_knowledge
      WHERE LOWER(content) LIKE LOWER(${searchTerm})
      ORDER BY chunk_number
      LIMIT ${Math.ceil(limit * 0.5)}
    `
  ])

  // Transform and combine results
  const articles: UnifiedResult[] = articleResults.map((a: any) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    excerpt: a.excerpt,
    source: 'article' as const,
    slug: a.slug,
    author: a.author,
    url: a.url,
    featured_image_url: a.featured_image_url,
    categories: a.categories,
    publication_date: a.publication_date,
  }))

  const thorneyChunks: UnifiedResult[] = thorneyResults.map((c: any) => ({
    id: c.id,
    title: `Thorney Island - Chapter ${c.chunk_number}`,
    content: c.content,
    excerpt: c.excerpt,
    source: 'thorney_island' as const,
    chunk_number: c.chunk_number,
    author: 'Vic Keegan',
  }))

  // Interleave results - prioritize articles but include Thorney Island content
  const combined: UnifiedResult[] = []
  let aIdx = 0, tIdx = 0

  while (combined.length < limit && (aIdx < articles.length || tIdx < thorneyChunks.length)) {
    // Add 2 articles for every 1 thorney chunk (roughly)
    if (aIdx < articles.length) {
      combined.push(articles[aIdx++])
    }
    if (aIdx < articles.length && combined.length < limit) {
      combined.push(articles[aIdx++])
    }
    if (tIdx < thorneyChunks.length && combined.length < limit) {
      combined.push(thorneyChunks[tIdx++])
    }
  }

  // If no results with primary query, try expanded terms
  if (combined.length === 0 && searchTerms.length > 1) {
    for (const term of searchTerms) {
      const expandedTerm = `%${term}%`
      const [expandedArticles, expandedThorney] = await Promise.all([
        sql`
          SELECT
            id, title, slug, author, url, featured_image_url, categories, publication_date,
            COALESCE(excerpt, LEFT(content, 500)) as excerpt,
            LEFT(content, 1500) as content
          FROM articles
          WHERE LOWER(title) LIKE LOWER(${expandedTerm})
             OR LOWER(content) LIKE LOWER(${expandedTerm})
          LIMIT ${limit}
        `,
        sql`
          SELECT id, chunk_number, content, LEFT(content, 500) as excerpt
          FROM thorney_island_knowledge
          WHERE LOWER(content) LIKE LOWER(${expandedTerm})
          ORDER BY chunk_number
          LIMIT 3
        `
      ])

      if (expandedArticles.length > 0 || expandedThorney.length > 0) {
        const expandedResults: UnifiedResult[] = [
          ...expandedArticles.map((a: any) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            excerpt: a.excerpt,
            source: 'article' as const,
            slug: a.slug,
            author: a.author,
            url: a.url,
            featured_image_url: a.featured_image_url,
            categories: a.categories,
            publication_date: a.publication_date,
          })),
          ...expandedThorney.map((c: any) => ({
            id: c.id,
            title: `Thorney Island - Chapter ${c.chunk_number}`,
            content: c.content,
            excerpt: c.excerpt,
            source: 'thorney_island' as const,
            chunk_number: c.chunk_number,
            author: 'Vic Keegan',
          }))
        ]
        return { results: expandedResults.slice(0, limit), normalizedQuery }
      }
    }
  }

  return { results: combined, normalizedQuery }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', results: [] },
        { status: 400 }
      )
    }

    const { results, normalizedQuery } = await unifiedSearch(query, limit)

    return NextResponse.json({
      success: true,
      query,
      normalized_query: normalizedQuery,
      count: results.length,
      sources: {
        articles: results.filter(r => r.source === 'article').length,
        thorney_island: results.filter(r => r.source === 'thorney_island').length,
      },
      results: results.map(r => ({
        ...r,
        excerpt: r.excerpt?.substring(0, 400) + (r.excerpt && r.excerpt.length > 400 ? '...' : ''),
        content: r.content?.substring(0, 1500) + (r.content && r.content.length > 1500 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Unified search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', results: [] },
        { status: 400 }
      )
    }

    const { results, normalizedQuery } = await unifiedSearch(query, limit)

    return NextResponse.json({
      success: true,
      query,
      normalized_query: normalizedQuery,
      count: results.length,
      sources: {
        articles: results.filter(r => r.source === 'article').length,
        thorney_island: results.filter(r => r.source === 'thorney_island').length,
      },
      results: results.map(r => ({
        ...r,
        excerpt: r.excerpt?.substring(0, 400) + (r.excerpt && r.excerpt.length > 400 ? '...' : ''),
        content: r.content?.substring(0, 1500) + (r.content && r.content.length > 1500 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Unified search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
