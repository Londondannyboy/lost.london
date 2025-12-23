/**
 * Triple-Hybrid Search: pgvector (authoritative) + Zep Graph (enrichment)
 *
 * Architecture:
 * 1. pgvector hybrid search (60% vector + 40% keyword) = PRIMARY, authoritative content
 * 2. Zep graph search = SECONDARY, enrichment with entity relationships
 *
 * Key principle: pgvector content is truth, Zep only adds connections
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { ZepClient } from '@getzep/zep-cloud'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const ZEP_API_KEY = process.env.ZEP_API_KEY
const LOST_LONDON_GRAPH_ID = 'lost-london'

/**
 * Phonetic corrections for common mispronunciations
 */
const PHONETIC_CORRECTIONS: Record<string, string> = {
  // Names
  'ignacio': 'ignatius',
  'ignasio': 'ignatius',
  'ignacius': 'ignatius',
  // Places
  'thorny': 'thorney',
  'fawny': 'thorney',
  'fauny': 'thorney',
  'forney': 'thorney',
  'tie burn': 'tyburn',
  'tieburn': 'tyburn',
  // Buildings
  'aquarim': 'aquarium',
  'aquariam': 'aquarium',
  'royale': 'royal',
  'cristal': 'crystal',
  'crystle': 'crystal',
  // Historical terms
  'shakespear': 'shakespeare',
  'shakespere': 'shakespeare',
  'shakspeare': 'shakespeare',
  'elizabethian': 'elizabethan',
  'elizabethen': 'elizabethan',
  'victorien': 'victorian',
  'mediaeval': 'medieval',
  'medival': 'medieval',
  // Common London terms
  'westmister': 'westminster',
  'white hall': 'whitehall',
  'parliment': 'parliament',
  'tems': 'thames',
  // Devils Acre
  'devils acre': "devil's acre",
  'devil acre': "devil's acre",
  'the devils acre': "devil's acre",
}

function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim()
  for (const [wrong, correct] of Object.entries(PHONETIC_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    normalized = normalized.replace(regex, correct)
  }
  return normalized
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: 'voyage-2',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

interface SearchResult {
  id: number
  source_type: string
  source_id: number
  title: string
  content: string
  chunk_index: number
  metadata: Record<string, any>
  similarity: number
}

interface ZepEdge {
  fact?: string
  source_node_name?: string
  target_node_name?: string
  relation?: string
}

interface ZepNode {
  name?: string
  labels?: string[]
  summary?: string
}

interface EnrichedResult extends SearchResult {
  // Zep enrichment
  relatedEntities: string[]
  relatedFacts: string[]
  connections: Array<{
    from: string
    relation: string
    to: string
  }>
}

/**
 * Primary search: pgvector hybrid (authoritative)
 */
async function hybridVectorSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  const sql = neon(process.env.DATABASE_URL!)
  const normalizedQuery = normalizeQuery(query)
  console.log(`[Enriched Search] Query: "${query}" → Normalized: "${normalizedQuery}"`)

  const queryEmbedding = await getQueryEmbedding(normalizedQuery)

  const results = await sql`
    WITH
    vector_results AS (
      SELECT
        id,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as vector_score
      FROM knowledge_chunks
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 50
    ),
    keyword_results AS (
      SELECT
        id,
        CASE
          WHEN LOWER(content) LIKE ${`%${normalizedQuery.toLowerCase()}%`} THEN 0.30
          WHEN LOWER(title) LIKE ${`%${normalizedQuery.toLowerCase()}%`} THEN 0.25
          WHEN LOWER(title) LIKE ${`%${normalizedQuery.split(' ')[0]?.toLowerCase() || ''}%`} THEN 0.10
          WHEN LOWER(content) LIKE ${`%${normalizedQuery.split(' ')[0]?.toLowerCase() || ''}%`} THEN 0.05
          ELSE 0
        END as keyword_score,
        CASE
          WHEN title LIKE 'Vic Keegan%Lost London%' THEN 0.10
          WHEN source_type = 'article' THEN 0.05
          ELSE 0
        END as type_boost
      FROM knowledge_chunks
    )
    SELECT
      kc.id,
      kc.source_type,
      kc.source_id,
      kc.title,
      kc.content,
      kc.chunk_index,
      kc.metadata,
      COALESCE(vr.vector_score, 0) as vector_score,
      COALESCE(kr.keyword_score, 0) as keyword_score,
      COALESCE(kr.type_boost, 0) as type_boost,
      (COALESCE(vr.vector_score, 0) * 0.6) +
      (COALESCE(kr.keyword_score, 0) * 0.4) +
      COALESCE(kr.type_boost, 0) as final_score
    FROM knowledge_chunks kc
    LEFT JOIN vector_results vr ON kc.id = vr.id
    LEFT JOIN keyword_results kr ON kc.id = kr.id
    WHERE vr.id IS NOT NULL OR kr.keyword_score > 0
    ORDER BY
      (COALESCE(vr.vector_score, 0) * 0.6) +
      (COALESCE(kr.keyword_score, 0) * 0.4) +
      COALESCE(kr.type_boost, 0) DESC
    LIMIT ${limit}
  `

  return results.map((r: any) => ({
    id: r.id,
    source_type: r.source_type,
    source_id: r.source_id,
    title: r.title,
    content: r.content,
    chunk_index: r.chunk_index,
    metadata: r.metadata,
    similarity: parseFloat(r.final_score || r.vector_score || 0),
  }))
}

/**
 * Secondary enrichment: Zep graph (non-blocking, for relationships only)
 */
async function getZepEnrichment(query: string): Promise<{
  entities: string[]
  facts: string[]
  connections: Array<{ from: string; relation: string; to: string }>
}> {
  if (!ZEP_API_KEY) {
    console.warn('[Enriched Search] ZEP_API_KEY not configured, skipping enrichment')
    return { entities: [], facts: [], connections: [] }
  }

  try {
    const client = new ZepClient({ apiKey: ZEP_API_KEY })

    // Search for edges (relationships between entities)
    const edgeResults = await client.graph.search({
      graphId: LOST_LONDON_GRAPH_ID,
      query,
      limit: 10,
      scope: 'edges',
      reranker: 'rrf',
    })

    // Search for nodes (entities themselves)
    const nodeResults = await client.graph.search({
      graphId: LOST_LONDON_GRAPH_ID,
      query,
      limit: 5,
      scope: 'nodes',
      reranker: 'rrf',
    })

    // Extract unique entities from nodes
    const entities: string[] = []
    if (nodeResults.nodes) {
      for (const node of nodeResults.nodes as ZepNode[]) {
        if (node.name && !entities.includes(node.name)) {
          entities.push(node.name)
        }
      }
    }

    // Extract facts and connections from edges
    const facts: string[] = []
    const connections: Array<{ from: string; relation: string; to: string }> = []

    if (edgeResults.edges) {
      for (const edge of edgeResults.edges as ZepEdge[]) {
        // Extract fact text
        if (edge.fact && !facts.includes(edge.fact)) {
          facts.push(edge.fact)
        }

        // Extract connection
        if (edge.source_node_name && edge.target_node_name && edge.relation) {
          connections.push({
            from: edge.source_node_name,
            relation: edge.relation,
            to: edge.target_node_name,
          })

          // Add entity names we discover
          if (!entities.includes(edge.source_node_name)) {
            entities.push(edge.source_node_name)
          }
          if (!entities.includes(edge.target_node_name)) {
            entities.push(edge.target_node_name)
          }
        }
      }
    }

    console.log(`[Enriched Search] Zep found ${entities.length} entities, ${facts.length} facts, ${connections.length} connections`)
    return { entities, facts, connections }
  } catch (error) {
    console.error('[Enriched Search] Zep enrichment failed:', error)
    // Don't fail the whole request - Zep is optional enrichment
    return { entities: [], facts: [], connections: [] }
  }
}

/**
 * Combine pgvector results with Zep enrichment
 */
function enrichResults(
  vectorResults: SearchResult[],
  zepEnrichment: { entities: string[]; facts: string[]; connections: Array<{ from: string; relation: string; to: string }> }
): EnrichedResult[] {
  return vectorResults.map(result => {
    // Find connections relevant to this result
    const titleLower = result.title.toLowerCase()
    const contentLower = result.content.toLowerCase()

    const relevantConnections = zepEnrichment.connections.filter(conn => {
      const fromLower = conn.from.toLowerCase()
      const toLower = conn.to.toLowerCase()
      return (
        titleLower.includes(fromLower) ||
        titleLower.includes(toLower) ||
        contentLower.includes(fromLower) ||
        contentLower.includes(toLower)
      )
    })

    const relevantEntities = zepEnrichment.entities.filter(entity => {
      const entityLower = entity.toLowerCase()
      return titleLower.includes(entityLower) || contentLower.includes(entityLower)
    })

    // Only include facts that mention something in the article
    const relevantFacts = zepEnrichment.facts.filter(fact => {
      const factLower = fact.toLowerCase()
      // Check if any entity from this article appears in the fact
      return relevantEntities.some(entity => factLower.includes(entity.toLowerCase()))
    }).slice(0, 3) // Limit to top 3 relevant facts

    return {
      ...result,
      relatedEntities: relevantEntities,
      relatedFacts: relevantFacts,
      connections: relevantConnections,
    }
  })
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

    // Run pgvector search and Zep enrichment in parallel
    const [vectorResults, zepEnrichment] = await Promise.all([
      hybridVectorSearch(query, limit),
      getZepEnrichment(query),
    ])

    // Combine results - pgvector is authoritative, Zep adds relationships
    const enrichedResults = enrichResults(vectorResults, zepEnrichment)

    return NextResponse.json({
      success: true,
      query,
      count: enrichedResults.length,
      sources: {
        articles: enrichedResults.filter(r => r.source_type === 'article').length,
        thorney_island: enrichedResults.filter(r => r.source_type === 'thorney_island').length,
      },
      // Global enrichment from Zep (for storytelling connections)
      enrichment: {
        allEntities: zepEnrichment.entities,
        allFacts: zepEnrichment.facts,
        allConnections: zepEnrichment.connections,
      },
      results: enrichedResults.map(r => ({
        id: r.id,
        source_type: r.source_type,
        source_id: r.source_id,
        title: r.title,
        content: r.content.substring(0, 1500),
        excerpt: r.content.substring(0, 400) + (r.content.length > 400 ? '...' : ''),
        chunk_index: r.chunk_index,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100,
        // Enrichment per result
        relatedEntities: r.relatedEntities,
        relatedFacts: r.relatedFacts,
        connections: r.connections,
        // For backwards compatibility
        author: r.metadata?.author || 'Vic Keegan',
        slug: r.metadata?.slug,
        categories: r.metadata?.categories,
        url: r.metadata?.slug ? `/article/${r.metadata.slug}` : undefined,
      })),
    })
  } catch (error) {
    console.error('Enriched search error:', error)
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

    // Run pgvector search and Zep enrichment in parallel
    const [vectorResults, zepEnrichment] = await Promise.all([
      hybridVectorSearch(query, limit),
      getZepEnrichment(query),
    ])

    // Combine results
    const enrichedResults = enrichResults(vectorResults, zepEnrichment)

    return NextResponse.json({
      success: true,
      query,
      count: enrichedResults.length,
      sources: {
        articles: enrichedResults.filter(r => r.source_type === 'article').length,
        thorney_island: enrichedResults.filter(r => r.source_type === 'thorney_island').length,
      },
      enrichment: {
        allEntities: zepEnrichment.entities,
        allFacts: zepEnrichment.facts,
        allConnections: zepEnrichment.connections,
      },
      results: enrichedResults.map(r => ({
        id: r.id,
        source_type: r.source_type,
        source_id: r.source_id,
        title: r.title,
        content: r.content.substring(0, 1500),
        excerpt: r.content.substring(0, 400) + (r.content.length > 400 ? '...' : ''),
        chunk_index: r.chunk_index,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100,
        relatedEntities: r.relatedEntities,
        relatedFacts: r.relatedFacts,
        connections: r.connections,
        author: r.metadata?.author || 'Vic Keegan',
        slug: r.metadata?.slug,
        categories: r.metadata?.categories,
        url: r.metadata?.slug ? `/article/${r.metadata.slug}` : undefined,
      })),
    })
  } catch (error) {
    console.error('Enriched search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
