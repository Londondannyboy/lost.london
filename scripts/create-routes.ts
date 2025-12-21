import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

// Sample walking routes
const ROUTES = [
  {
    name: "Shakespeare's Southwark",
    slug: 'shakespeares-southwark',
    description: 'Walk through the Bankside that Shakespeare knew - from the site of the original Globe Theatre to the bear-baiting arenas and taverns of Elizabethan London.',
    difficulty: 'easy',
    duration_minutes: 90,
    distance_km: 2.5,
    borough: 'Southwark',
    keywords: ['globe', 'southwark', 'bankside', 'shakespeare', 'rose theatre', 'bear garden']
  },
  {
    name: 'Medieval Westminster',
    slug: 'medieval-westminster',
    description: 'Explore the medieval heart of English power - from Westminster Abbey to the remains of the medieval palace.',
    difficulty: 'easy',
    duration_minutes: 120,
    distance_km: 3.0,
    borough: 'Westminster',
    keywords: ['westminster', 'abbey', 'palace', 'parliament', 'whitehall']
  },
  {
    name: 'City of London Secrets',
    slug: 'city-of-london-secrets',
    description: 'Discover hidden corners of the Square Mile - from Roman ruins to medieval churches and forgotten alleyways.',
    difficulty: 'moderate',
    duration_minutes: 150,
    distance_km: 4.0,
    borough: 'City of London',
    keywords: ['city of london', 'bank', 'guildhall', 'st paul', 'roman', 'cheapside']
  },
  {
    name: 'Hidden Rivers Walk',
    slug: 'hidden-rivers-walk',
    description: "Trace the course of London's lost rivers - the Fleet, the Tyburn, and the Walbrook - now buried beneath the streets.",
    difficulty: 'moderate',
    duration_minutes: 180,
    distance_km: 5.5,
    borough: null,
    keywords: ['fleet', 'tyburn', 'walbrook', 'river', 'sewer', 'culvert']
  },
  {
    name: "Jack the Ripper's Whitechapel",
    slug: 'jack-the-ripper-whitechapel',
    description: 'Walk the streets of Victorian Whitechapel, exploring the sites connected to the infamous 1888 murders.',
    difficulty: 'easy',
    duration_minutes: 90,
    distance_km: 2.0,
    borough: 'Tower Hamlets',
    keywords: ['whitechapel', 'ripper', 'spitalfields', 'ten bells', 'dorset street']
  }
]

async function main() {
  console.log('Creating walking routes...\n')

  for (const route of ROUTES) {
    try {
      // Insert or update route
      const result = await sql`
        INSERT INTO routes (name, slug, description, difficulty, duration_minutes, distance_km, borough)
        VALUES (${route.name}, ${route.slug}, ${route.description}, ${route.difficulty}, ${route.duration_minutes}, ${route.distance_km}, ${route.borough})
        ON CONFLICT (slug) DO UPDATE SET
          name = ${route.name},
          description = ${route.description},
          difficulty = ${route.difficulty},
          duration_minutes = ${route.duration_minutes},
          distance_km = ${route.distance_km},
          borough = ${route.borough}
        RETURNING id
      `

      const routeId = result[0].id
      console.log(`✓ Created/updated route: ${route.name} (ID: ${routeId})`)

      // Find relevant articles for this route
      const keywordsPattern = route.keywords.map(k => `%${k}%`).join('|')

      // Build the query to find matching articles
      let matchingArticles: { id: number; title: string }[] = []

      for (const keyword of route.keywords) {
        const articles = await sql`
          SELECT id, title
          FROM articles
          WHERE (title ILIKE ${'%' + keyword + '%'} OR content ILIKE ${'%' + keyword + '%'})
            AND latitude IS NOT NULL
          LIMIT 3
        `
        for (const article of articles) {
          if (!matchingArticles.find(a => a.id === article.id)) {
            matchingArticles.push(article as { id: number; title: string })
          }
        }
      }

      // Limit to 8 stops max
      matchingArticles = matchingArticles.slice(0, 8)

      if (matchingArticles.length > 0) {
        // Clear existing stops for this route
        await sql`DELETE FROM route_stops WHERE route_id = ${routeId}`

        // Add new stops
        for (let i = 0; i < matchingArticles.length; i++) {
          const article = matchingArticles[i]
          await sql`
            INSERT INTO route_stops (route_id, article_id, stop_order)
            VALUES (${routeId}, ${article.id}, ${i + 1})
          `
        }

        console.log(`  Added ${matchingArticles.length} stops: ${matchingArticles.map(a => a.title).join(', ')}`)
      } else {
        console.log(`  No matching articles found with location data`)
      }

    } catch (error) {
      console.error(`✗ Failed: ${route.name}`, error)
    }
  }

  // Show summary
  console.log('\nRoute summary:')
  const summary = await sql`
    SELECT r.name, r.difficulty, r.distance_km, COUNT(rs.id) as stops
    FROM routes r
    LEFT JOIN route_stops rs ON r.id = rs.route_id
    GROUP BY r.id, r.name, r.difficulty, r.distance_km
    ORDER BY r.name
  `

  for (const r of summary) {
    console.log(`  ${r.name}: ${r.distance_km}km, ${r.difficulty}, ${r.stops} stops`)
  }
}

main().catch(console.error)
