import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

/**
 * Generate related topics for articles based on multiple signals:
 * 1. Same historical era (0.3 weight)
 * 2. Same category (0.4 weight)
 * 3. Same borough (0.35 weight)
 * 4. Semantic similarity via pgvector (variable)
 */

interface RelatedArticle {
  id: number
  title: string
  score: number
  reasons: string[]
}

// Find articles with the same historical era
async function findRelatedByEra(articleId: number): Promise<RelatedArticle[]> {
  const results = await sql`
    SELECT target.id, target.title, 0.3 as score
    FROM articles source
    JOIN articles target ON source.historical_era = target.historical_era
    WHERE source.id = ${articleId}
      AND target.id != ${articleId}
      AND source.historical_era IS NOT NULL
    LIMIT 10
  `
  return results.map(r => ({
    id: r.id,
    title: r.title,
    score: Number(r.score),
    reasons: ['same_era']
  }))
}

// Find articles with overlapping categories
async function findRelatedByCategory(articleId: number): Promise<RelatedArticle[]> {
  const results = await sql`
    SELECT DISTINCT a2.id, a2.title, 0.4 as score
    FROM article_categories ac1
    JOIN article_categories ac2 ON ac1.category_id = ac2.category_id
    JOIN articles a2 ON ac2.article_id = a2.id
    WHERE ac1.article_id = ${articleId}
      AND a2.id != ${articleId}
    LIMIT 10
  `
  return results.map(r => ({
    id: r.id,
    title: r.title,
    score: Number(r.score),
    reasons: ['same_category']
  }))
}

// Find articles in the same borough
async function findRelatedByBorough(articleId: number): Promise<RelatedArticle[]> {
  const results = await sql`
    SELECT target.id, target.title, 0.35 as score
    FROM articles source
    JOIN articles target ON source.borough = target.borough
    WHERE source.id = ${articleId}
      AND target.id != ${articleId}
      AND source.borough IS NOT NULL
    LIMIT 10
  `
  return results.map(r => ({
    id: r.id,
    title: r.title,
    score: Number(r.score),
    reasons: ['same_borough']
  }))
}

// Find semantically similar articles using pgvector embeddings
async function findRelatedBySimilarity(articleId: number): Promise<RelatedArticle[]> {
  try {
    const results = await sql`
      WITH source_embedding AS (
        SELECT embedding
        FROM knowledge_chunks
        WHERE source_id = ${articleId}
          AND source_type = 'article'
        LIMIT 1
      ),
      ranked AS (
        SELECT
          kc.source_id as id,
          a.title,
          (1 - (kc.embedding <=> (SELECT embedding FROM source_embedding))) as score,
          ROW_NUMBER() OVER (PARTITION BY kc.source_id ORDER BY kc.embedding <=> (SELECT embedding FROM source_embedding)) as rn
        FROM knowledge_chunks kc
        JOIN articles a ON kc.source_id = a.id AND kc.source_type = 'article'
        WHERE kc.source_id != ${articleId}
          AND EXISTS (SELECT 1 FROM source_embedding)
      )
      SELECT id, title, score
      FROM ranked
      WHERE rn = 1
      ORDER BY score DESC
      LIMIT 10
    `
    return results.map(r => ({
      id: r.id,
      title: r.title,
      score: Math.min(Number(r.score), 0.5), // Cap semantic similarity contribution
      reasons: ['semantic_similarity']
    }))
  } catch (e) {
    console.warn(`  Semantic search failed for article ${articleId}:`, e)
    return []
  }
}

// Combine all signals and get top related articles
async function generateRelatedForArticle(articleId: number): Promise<Map<number, RelatedArticle>> {
  const [byEra, byCategory, byBorough, bySimilarity] = await Promise.all([
    findRelatedByEra(articleId),
    findRelatedByCategory(articleId),
    findRelatedByBorough(articleId),
    findRelatedBySimilarity(articleId),
  ])

  // Merge and accumulate scores
  const scored = new Map<number, RelatedArticle>()

  for (const results of [byEra, byCategory, byBorough, bySimilarity]) {
    for (const result of results) {
      const existing = scored.get(result.id)
      if (existing) {
        existing.score += result.score
        existing.reasons.push(...result.reasons)
      } else {
        scored.set(result.id, { ...result })
      }
    }
  }

  return scored
}

async function main() {
  console.log('Generating related topics for articles...\n')

  // Clear existing non-curated relationships
  console.log('Clearing existing auto-generated relationships...')
  await sql`DELETE FROM article_relationships WHERE is_curated = FALSE`

  // Fetch all articles
  const articles = await sql`
    SELECT id, title
    FROM articles
    ORDER BY id
  `
  console.log(`Found ${articles.length} articles\n`)

  let totalRelationships = 0

  for (const article of articles) {
    process.stdout.write(`Processing: ${article.title.substring(0, 50)}...`)

    const related = await generateRelatedForArticle(article.id)

    // Sort by score and take top 3
    const topRelated = Array.from(related.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    // Insert relationships
    for (const rel of topRelated) {
      await sql`
        INSERT INTO article_relationships
        (source_article_id, target_article_id, relationship_type, is_curated, similarity_score)
        VALUES (${article.id}, ${rel.id}, 'related', FALSE, ${rel.score})
        ON CONFLICT (source_article_id, target_article_id) DO UPDATE
        SET similarity_score = ${rel.score}
      `
      totalRelationships++
    }

    console.log(` (${topRelated.length} related)`)
  }

  console.log(`\nDone! Created ${totalRelationships} relationships.`)

  // Show some examples
  console.log('\nSample relationships:')
  const samples = await sql`
    SELECT
      a1.title as source_title,
      a2.title as target_title,
      ar.similarity_score
    FROM article_relationships ar
    JOIN articles a1 ON ar.source_article_id = a1.id
    JOIN articles a2 ON ar.target_article_id = a2.id
    ORDER BY ar.similarity_score DESC
    LIMIT 10
  `
  for (const sample of samples) {
    console.log(`  "${sample.source_title.substring(0, 40)}..." → "${sample.target_title.substring(0, 40)}..." (${Number(sample.similarity_score).toFixed(2)})`)
  }
}

main().catch(console.error)
