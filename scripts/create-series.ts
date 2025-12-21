import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

// Predefined series to create
const SERIES = [
  {
    name: 'Lost London',
    slug: 'lost-london',
    description: 'The original "Lost London" numbered article series by Vic Keegan, exploring hidden corners and forgotten stories of the capital.'
  },
  {
    name: 'Shakespeare\'s London',
    slug: 'shakespeares-london',
    description: 'Walk in the footsteps of the Bard through Elizabethan and Jacobean London.'
  },
  {
    name: 'Hidden Rivers',
    slug: 'hidden-rivers',
    description: 'Discover the lost rivers that once flowed through London, now buried beneath the streets.'
  },
  {
    name: 'Medieval London',
    slug: 'medieval-london',
    description: 'Explore the medieval city - from the Tower to Westminster Abbey and beyond.'
  },
  {
    name: 'Victorian Underworld',
    slug: 'victorian-underworld',
    description: 'The darker side of Victorian London - crime, poverty, and social reform.'
  },
  {
    name: 'River Thames',
    slug: 'river-thames',
    description: 'Stories of the river that shaped London\'s history and identity.'
  },
  {
    name: 'The Blitz',
    slug: 'the-blitz',
    description: 'London during World War II - the bombing, the shelters, and the resilience.'
  }
]

async function main() {
  console.log('Creating article series...\n')

  for (const series of SERIES) {
    try {
      await sql`
        INSERT INTO series (name, slug, description)
        VALUES (${series.name}, ${series.slug}, ${series.description})
        ON CONFLICT (slug) DO UPDATE SET
          name = ${series.name},
          description = ${series.description}
      `
      console.log(`✓ Created/updated: ${series.name}`)
    } catch (error) {
      console.error(`✗ Failed: ${series.name}`, error)
    }
  }

  // Auto-assign articles to "Lost London" series based on title pattern
  console.log('\nAssigning "Lost London" numbered articles to series...')

  const lostLondonSeries = await sql`
    SELECT id FROM series WHERE slug = 'lost-london'
  `

  if (lostLondonSeries[0]) {
    const seriesId = lostLondonSeries[0].id

    // Find articles with "Lost London" and a number in title - simpler approach
    const articles = await sql`
      SELECT id, title FROM articles
      WHERE title ILIKE '%lost london%'
        AND title ~ '\d+'
    `

    for (const article of articles) {
      // Extract number from title
      const match = article.title.match(/Lost London[^\d]*(\d+)/i)
      if (match) {
        const position = parseInt(match[1], 10)
        await sql`
          UPDATE articles
          SET series_id = ${seriesId}, series_position = ${position}
          WHERE id = ${article.id}
        `
      }
    }

    console.log(`✓ Assigned ${articles.length} articles to Lost London series`)
  }

  // Assign Shakespeare-related articles
  const shakespeareSeries = await sql`SELECT id FROM series WHERE slug = 'shakespeares-london'`
  if (shakespeareSeries[0]) {
    await sql`
      UPDATE articles
      SET series_id = ${shakespeareSeries[0].id}
      WHERE series_id IS NULL
        AND (title ILIKE '%shakespeare%' OR content ILIKE '%shakespeare%globe%')
    `
    console.log(`✓ Assigned Shakespeare articles`)
  }

  // Assign river-related articles
  const riverSeries = await sql`SELECT id FROM series WHERE slug = 'hidden-rivers'`
  if (riverSeries[0]) {
    await sql`
      UPDATE articles
      SET series_id = ${riverSeries[0].id}
      WHERE series_id IS NULL
        AND (title ILIKE '%river%' OR title ILIKE '%fleet%' OR title ILIKE '%tyburn%' OR title ILIKE '%walbrook%')
    `
    console.log(`✓ Assigned river articles`)
  }

  // Assign Thames-related articles
  const thamesSeries = await sql`SELECT id FROM series WHERE slug = 'river-thames'`
  if (thamesSeries[0]) {
    await sql`
      UPDATE articles
      SET series_id = ${thamesSeries[0].id}
      WHERE series_id IS NULL
        AND (title ILIKE '%thames%' OR content ILIKE '%river thames%')
    `
    console.log(`✓ Assigned Thames articles`)
  }

  // Update article counts
  await sql`
    UPDATE series s
    SET article_count = (
      SELECT COUNT(*) FROM articles a WHERE a.series_id = s.id
    )
  `

  console.log('\n✓ Updated article counts')

  // Show summary
  const summary = await sql`
    SELECT name, article_count FROM series ORDER BY article_count DESC
  `

  console.log('\nSeries summary:')
  for (const s of summary) {
    console.log(`  ${s.name}: ${s.article_count} articles`)
  }
}

main().catch(console.error)
