/**
 * Hybrid Search API - Combines pgvector + Zep for best results
 *
 * Returns:
 * - Full article content from pgvector (semantic search)
 * - Related entities and facts from Zep knowledge graph
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { ZepClient } from "@getzep/zep-cloud";

const sql = neon(process.env.DATABASE_URL!);
const LOST_LONDON_GRAPH_ID = "lost-london";

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Run both searches in parallel
    const [pgvectorResults, zepResults] = await Promise.all([
      searchPgvector(query, limit),
      searchZepGraph(query),
    ]);

    // Combine results
    const response = {
      query,
      // Primary results: full article content from pgvector
      results: pgvectorResults,
      // Enrichment: related entities and facts from Zep
      relatedEntities: zepResults.entities,
      relatedFacts: zepResults.facts,
      // Suggested follow-up topics based on graph connections
      suggestedTopics: zepResults.entities
        .filter((e: any) => e.type !== 'Entity')
        .slice(0, 3)
        .map((e: any) => e.name),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Hybrid Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function searchPgvector(query: string, limit: number) {
  try {
    // Call the existing semantic search
    const response = await fetch(
      `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/london-tools/semantic-search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit }),
      }
    );

    if (!response.ok) {
      // Fallback: direct DB query if internal fetch fails
      return await directPgvectorSearch(query, limit);
    }

    const data = await response.json();
    return data.results || [];
  } catch {
    return await directPgvectorSearch(query, limit);
  }
}

async function directPgvectorSearch(query: string, limit: number) {
  try {
    // Simple text search fallback if embedding search isn't available
    const results = await sql`
      SELECT
        title,
        content,
        excerpt,
        slug,
        source_type,
        0.5 as similarity
      FROM knowledge_chunks
      WHERE
        content ILIKE ${'%' + query + '%'} OR
        title ILIKE ${'%' + query + '%'}
      LIMIT ${limit}
    `;
    return results;
  } catch {
    return [];
  }
}

async function searchZepGraph(query: string) {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    return { entities: [], facts: [] };
  }

  try {
    const client = new ZepClient({ apiKey });

    // Search for entities (nodes)
    const nodeResults = await client.graph.search({
      graphId: LOST_LONDON_GRAPH_ID,
      query,
      limit: 8,
      scope: "nodes",
    });

    // Search for facts (edges)
    const edgeResults = await client.graph.search({
      graphId: LOST_LONDON_GRAPH_ID,
      query,
      limit: 5,
      scope: "edges",
    });

    return {
      entities: (nodeResults.nodes || []).map((n) => ({
        name: n.name,
        type: n.labels?.find((l) => l !== "Entity") || "Entity",
        summary: n.summary?.substring(0, 150),
      })),
      facts: (edgeResults.edges || [])
        .map((e) => e.fact)
        .filter(Boolean) as string[],
    };
  } catch (error) {
    console.error("[Zep Search] Error:", error);
    return { entities: [], facts: [] };
  }
}
