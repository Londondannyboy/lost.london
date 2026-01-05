import { neon } from '@neondatabase/serverless'

// Create a placeholder that will be replaced at runtime
// This avoids build-time errors when DATABASE_URL is not set
function createSql(): ReturnType<typeof neon> {
  if (!process.env.DATABASE_URL) {
    // Return a function that throws - will only be called at runtime
    const placeholder = (() => {
      throw new Error('DATABASE_URL not configured')
    }) as unknown as ReturnType<typeof neon>
    return placeholder
  }
  return neon(process.env.DATABASE_URL)
}

export const sql = createSql()

export interface Article {
  id: number
  title: string
  slug: string
  url: string
  author: string
  publication_date: string
  content: string
  excerpt: string
  featured_image_url: string
  // Location fields
  latitude?: number
  longitude?: number
  location_name?: string
  borough?: string
  historical_era?: string
  year_from?: number
  year_to?: number
  // Series fields
  series_id?: number
  series_position?: number
}

export interface Series {
  id: number
  name: string
  slug: string
  description?: string
  article_count: number
}

export interface Route {
  id: number
  name: string
  slug: string
  description?: string
  difficulty: 'easy' | 'moderate' | 'challenging'
  duration_minutes: number
  distance_km: number
  borough?: string
}

export interface RouteStop {
  id: number
  route_id: number
  article_id: number
  stop_order: number
  walking_notes?: string
  article?: Article
}

export interface Category {
  id: number
  name: string
}

export async function searchArticles(query: string, limit = 5): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url
    FROM articles
    WHERE
      title ILIKE ${'%' + query + '%'} OR
      content ILIKE ${'%' + query + '%'} OR
      excerpt ILIKE ${'%' + query + '%'}
    ORDER BY publication_date DESC NULLS LAST
    LIMIT ${limit}
  `
  return articles as Article[]
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, content, excerpt, featured_image_url
    FROM articles
    WHERE slug = ${slug}
    LIMIT 1
  ` as Article[]
  return articles[0] || null
}

export async function getArticlesByCategory(categoryName: string, limit = 5): Promise<Article[]> {
  const articles = await sql`
    SELECT a.id, a.title, a.slug, a.url, a.author, a.publication_date, a.excerpt, a.featured_image_url
    FROM articles a
    JOIN article_categories ac ON a.id = ac.article_id
    JOIN categories c ON ac.category_id = c.id
    WHERE c.name ILIKE ${categoryName}
    ORDER BY a.publication_date DESC NULLS LAST
    LIMIT ${limit}
  `
  return articles as Article[]
}

export async function getRecentArticles(limit = 5): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url
    FROM articles
    ORDER BY publication_date DESC NULLS LAST
    LIMIT ${limit}
  `
  return articles as Article[]
}

export async function getCategories(): Promise<Category[]> {
  const categories = await sql`
    SELECT c.id, c.name, COUNT(ac.article_id) as article_count
    FROM categories c
    LEFT JOIN article_categories ac ON c.id = ac.category_id
    GROUP BY c.id, c.name
    ORDER BY article_count DESC
  `
  return categories as Category[]
}

export async function getRandomArticle(): Promise<Article | null> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, content, excerpt, featured_image_url
    FROM articles
    ORDER BY RANDOM()
    LIMIT 1
  ` as Article[]
  return articles[0] || null
}

// Location-based queries
export async function getArticlesWithLocation(): Promise<Article[]> {
  try {
    const articles = await sql`
      SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
             latitude, longitude, location_name, borough, historical_era, year_from, year_to
      FROM articles
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY title
    `
    return articles as Article[]
  } catch (error) {
    // Columns might not exist yet
    console.error('Location query error:', error)
    return []
  }
}

export async function getNearbyArticles(lat: number, lng: number, radiusKm: number = 1): Promise<(Article & { distance_km: number })[]> {
  // Haversine formula for distance calculation
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
           latitude, longitude, location_name, borough, historical_era,
           (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude)))) AS distance_km
    FROM articles
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    HAVING (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude)))) < ${radiusKm}
    ORDER BY distance_km
  `
  return articles as (Article & { distance_km: number })[]
}

export async function getArticlesByBorough(borough: string): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
           latitude, longitude, location_name, borough, historical_era
    FROM articles
    WHERE borough ILIKE ${borough}
    ORDER BY title
  `
  return articles as Article[]
}

export async function getArticlesByEra(era: string): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
           latitude, longitude, location_name, borough, historical_era, year_from, year_to
    FROM articles
    WHERE historical_era ILIKE ${era}
    ORDER BY year_from NULLS LAST, title
  `
  return articles as Article[]
}

// Series queries
export async function getAllSeries(): Promise<Series[]> {
  try {
    const series = await sql`
      SELECT s.id, s.name, s.slug, s.description,
             COUNT(a.id) as article_count
      FROM series s
      LEFT JOIN articles a ON a.series_id = s.id
      GROUP BY s.id, s.name, s.slug, s.description
      ORDER BY s.name
    `
    return series as Series[]
  } catch (error) {
    // Table might not exist yet
    console.error('Series table error:', error)
    return []
  }
}

export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  const series = await sql`
    SELECT id, name, slug, description, article_count
    FROM series
    WHERE slug = ${slug}
    LIMIT 1
  ` as Series[]
  return series[0] || null
}

export async function getArticlesBySeries(seriesId: number): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
           series_id, series_position
    FROM articles
    WHERE series_id = ${seriesId}
    ORDER BY series_position NULLS LAST, title
  `
  return articles as Article[]
}

// Route queries
export async function getAllRoutes(): Promise<Route[]> {
  try {
    const routes = await sql`
      SELECT id, name, slug, description, difficulty, duration_minutes, distance_km, borough
      FROM routes
      ORDER BY name
    `
    return routes as Route[]
  } catch (error) {
    // Table might not exist yet
    console.error('Routes table error:', error)
    return []
  }
}

export async function getRouteBySlug(slug: string): Promise<Route | null> {
  const routes = await sql`
    SELECT id, name, slug, description, difficulty, duration_minutes, distance_km, borough
    FROM routes
    WHERE slug = ${slug}
    LIMIT 1
  ` as Route[]
  return routes[0] || null
}

export async function getRouteStops(routeId: number): Promise<RouteStop[]> {
  const stops = await sql`
    SELECT rs.id, rs.route_id, rs.article_id, rs.stop_order, rs.walking_notes,
           a.title, a.slug, a.excerpt, a.featured_image_url, a.latitude, a.longitude, a.location_name
    FROM route_stops rs
    JOIN articles a ON rs.article_id = a.id
    WHERE rs.route_id = ${routeId}
    ORDER BY rs.stop_order
  ` as Record<string, unknown>[]
  return stops.map(stop => ({
    id: stop.id,
    route_id: stop.route_id,
    article_id: stop.article_id,
    stop_order: stop.stop_order,
    walking_notes: stop.walking_notes,
    article: {
      id: stop.article_id,
      title: stop.title,
      slug: stop.slug,
      excerpt: stop.excerpt,
      featured_image_url: stop.featured_image_url,
      latitude: stop.latitude,
      longitude: stop.longitude,
      location_name: stop.location_name
    } as Article
  })) as RouteStop[]
}

// Timeline queries
export async function getArticlesByTimeRange(yearFrom: number, yearTo: number): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, url, author, publication_date, excerpt, featured_image_url,
           historical_era, year_from, year_to
    FROM articles
    WHERE (year_from IS NOT NULL AND year_from >= ${yearFrom} AND year_from <= ${yearTo})
       OR (year_to IS NOT NULL AND year_to >= ${yearFrom} AND year_to <= ${yearTo})
       OR (year_from IS NOT NULL AND year_to IS NOT NULL AND year_from <= ${yearFrom} AND year_to >= ${yearTo})
    ORDER BY year_from NULLS LAST, title
  `
  return articles as Article[]
}

export async function getEraStats(): Promise<{ era: string; count: number }[]> {
  try {
    const stats = await sql`
      SELECT historical_era as era, COUNT(*) as count
      FROM articles
      WHERE historical_era IS NOT NULL
      GROUP BY historical_era
      ORDER BY
        CASE historical_era
          WHEN 'Roman' THEN 1
          WHEN 'Medieval' THEN 2
          WHEN 'Tudor' THEN 3
          WHEN 'Stuart' THEN 4
          WHEN 'Georgian' THEN 5
          WHEN 'Victorian' THEN 6
          WHEN 'Modern' THEN 7
          ELSE 8
        END
    `
    return stats as { era: string; count: number }[]
  } catch (error) {
    // Column might not exist yet
    console.error('Era stats error:', error)
    return []
  }
}

// Related topics - for VIC to suggest follow-up topics
export interface RelatedTopic {
  id: number
  title: string
  slug: string
  similarity_score: number
}

export async function getRelatedTopics(articleId: number, limit = 3): Promise<RelatedTopic[]> {
  try {
    // Prioritize curated relationships, fallback to auto-generated
    const topics = await sql`
      SELECT a.id, a.title, a.slug, ar.similarity_score
      FROM article_relationships ar
      JOIN articles a ON ar.target_article_id = a.id
      WHERE ar.source_article_id = ${articleId}
      ORDER BY ar.is_curated DESC, ar.similarity_score DESC
      LIMIT ${limit}
    `
    return topics as RelatedTopic[]
  } catch (error) {
    console.error('Related topics error:', error)
    return []
  }
}

// Get related topics by article slug (more convenient for tool usage)
export async function getRelatedTopicsBySlug(slug: string, limit = 3): Promise<RelatedTopic[]> {
  try {
    const topics = await sql`
      SELECT a2.id, a2.title, a2.slug, ar.similarity_score
      FROM articles a1
      JOIN article_relationships ar ON a1.id = ar.source_article_id
      JOIN articles a2 ON ar.target_article_id = a2.id
      WHERE a1.slug = ${slug}
      ORDER BY ar.is_curated DESC, ar.similarity_score DESC
      LIMIT ${limit}
    `
    return topics as RelatedTopic[]
  } catch (error) {
    console.error('Related topics by slug error:', error)
    return []
  }
}
