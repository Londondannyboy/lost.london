import { neon } from '@neondatabase/serverless'

export const sql = neon(process.env.DATABASE_URL!)

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
  `
  return articles[0] as Article || null
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
  `
  return articles[0] as Article || null
}
