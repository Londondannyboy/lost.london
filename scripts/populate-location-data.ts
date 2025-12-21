import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

// London borough boundaries (simplified - central London focus)
const BOROUGHS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  'City of London': { lat: [51.508, 51.520], lng: [-0.095, -0.075] },
  'Westminster': { lat: [51.490, 51.525], lng: [-0.170, -0.115] },
  'Camden': { lat: [51.525, 51.570], lng: [-0.200, -0.100] },
  'Islington': { lat: [51.525, 51.575], lng: [-0.130, -0.070] },
  'Tower Hamlets': { lat: [51.495, 51.540], lng: [-0.070, 0.010] },
  'Southwark': { lat: [51.450, 51.510], lng: [-0.110, -0.030] },
  'Lambeth': { lat: [51.440, 51.505], lng: [-0.150, -0.090] },
  'Hackney': { lat: [51.535, 51.580], lng: [-0.090, -0.020] },
  'Kensington and Chelsea': { lat: [51.480, 51.520], lng: [-0.220, -0.150] },
  'Greenwich': { lat: [51.450, 51.500], lng: [-0.020, 0.100] },
}

// Historical era keywords
const ERA_KEYWORDS: Record<string, string[]> = {
  'Roman': ['roman', 'londinium', 'amphitheatre', 'legionary', 'temple of mithras', '43 ad', 'boudicca'],
  'Medieval': ['medieval', 'saxon', 'norman', 'crusade', 'monastery', 'abbey', 'plague', 'black death', 'chaucer', 'tower of london'],
  'Tudor': ['tudor', 'henry viii', 'elizabeth i', 'shakespeare', 'globe theatre', 'reformation', 'dissolution'],
  'Stuart': ['stuart', 'charles i', 'cromwell', 'restoration', 'great fire', 'great plague', 'pepys', 'wren', '1666'],
  'Georgian': ['georgian', 'regency', 'handel', 'hogarth', 'dr johnson', 'industrial revolution', '18th century'],
  'Victorian': ['victorian', 'queen victoria', 'dickens', 'jack the ripper', 'cholera', 'great exhibition', 'underground', 'empire', '19th century'],
  'Modern': ['world war', 'blitz', 'bomb', '20th century', '21st century', 'windrush', 'swinging sixties', 'olympic']
}

// Common London location keywords for geocoding hints
const LOCATION_KEYWORDS: Record<string, { lat: number; lng: number; name: string }> = {
  'tower of london': { lat: 51.5081, lng: -0.0759, name: 'Tower of London' },
  'st paul': { lat: 51.5138, lng: -0.0984, name: "St Paul's Cathedral" },
  'westminster abbey': { lat: 51.4994, lng: -0.1273, name: 'Westminster Abbey' },
  'big ben': { lat: 51.5007, lng: -0.1246, name: 'Big Ben' },
  'parliament': { lat: 51.4995, lng: -0.1248, name: 'Houses of Parliament' },
  'london bridge': { lat: 51.5079, lng: -0.0877, name: 'London Bridge' },
  'tower bridge': { lat: 51.5055, lng: -0.0754, name: 'Tower Bridge' },
  'trafalgar': { lat: 51.5080, lng: -0.1281, name: 'Trafalgar Square' },
  'covent garden': { lat: 51.5117, lng: -0.1240, name: 'Covent Garden' },
  'smithfield': { lat: 51.5189, lng: -0.1015, name: 'Smithfield' },
  'fleet street': { lat: 51.5138, lng: -0.1087, name: 'Fleet Street' },
  'strand': { lat: 51.5107, lng: -0.1200, name: 'The Strand' },
  'whitehall': { lat: 51.5040, lng: -0.1262, name: 'Whitehall' },
  'southwark': { lat: 51.5044, lng: -0.0920, name: 'Southwark' },
  'bankside': { lat: 51.5065, lng: -0.0985, name: 'Bankside' },
  'globe': { lat: 51.5081, lng: -0.0972, name: "Shakespeare's Globe" },
  'greenwich': { lat: 51.4826, lng: -0.0077, name: 'Greenwich' },
  'hampstead': { lat: 51.5565, lng: -0.1781, name: 'Hampstead' },
  'chelsea': { lat: 51.4875, lng: -0.1687, name: 'Chelsea' },
  'bloomsbury': { lat: 51.5234, lng: -0.1283, name: 'Bloomsbury' },
  'soho': { lat: 51.5137, lng: -0.1337, name: 'Soho' },
  'mayfair': { lat: 51.5108, lng: -0.1494, name: 'Mayfair' },
  'clerkenwell': { lat: 51.5243, lng: -0.1054, name: 'Clerkenwell' },
  'spitalfields': { lat: 51.5194, lng: -0.0750, name: 'Spitalfields' },
  'whitechapel': { lat: 51.5154, lng: -0.0647, name: 'Whitechapel' },
  'wapping': { lat: 51.5040, lng: -0.0550, name: 'Wapping' },
  'limehouse': { lat: 51.5122, lng: -0.0386, name: 'Limehouse' },
  'docklands': { lat: 51.5000, lng: -0.0200, name: 'Docklands' },
  'isle of dogs': { lat: 51.4953, lng: -0.0188, name: 'Isle of Dogs' },
  'bermondsey': { lat: 51.4970, lng: -0.0670, name: 'Bermondsey' },
  'rotherhithe': { lat: 51.5003, lng: -0.0516, name: 'Rotherhithe' },
  'lambeth': { lat: 51.4880, lng: -0.1180, name: 'Lambeth' },
  'vauxhall': { lat: 51.4861, lng: -0.1225, name: 'Vauxhall' },
  'brixton': { lat: 51.4613, lng: -0.1156, name: 'Brixton' },
  'camden': { lat: 51.5390, lng: -0.1426, name: 'Camden' },
  'king\'s cross': { lat: 51.5308, lng: -0.1238, name: "King's Cross" },
  'islington': { lat: 51.5362, lng: -0.1033, name: 'Islington' },
  'shoreditch': { lat: 51.5252, lng: -0.0780, name: 'Shoreditch' },
  'hoxton': { lat: 51.5322, lng: -0.0777, name: 'Hoxton' },
  'hackney': { lat: 51.5450, lng: -0.0553, name: 'Hackney' },
  'bow': { lat: 51.5291, lng: -0.0153, name: 'Bow' },
  'stratford': { lat: 51.5416, lng: -0.0033, name: 'Stratford' },
  'thames': { lat: 51.5074, lng: -0.1100, name: 'River Thames' },
}

function detectEra(title: string, content: string): { era: string | null; yearFrom: number | null; yearTo: number | null } {
  const text = `${title} ${content}`.toLowerCase()

  // Try to extract years from text
  const yearMatches = text.match(/\b(1\d{3}|20[0-2]\d)\b/g)
  let yearFrom: number | null = null
  let yearTo: number | null = null

  if (yearMatches && yearMatches.length > 0) {
    const years = yearMatches.map(Number).sort((a, b) => a - b)
    yearFrom = years[0]
    yearTo = years[years.length - 1]
    if (yearTo === yearFrom) yearTo = null
  }

  // Detect era from keywords
  for (const [era, keywords] of Object.entries(ERA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return { era, yearFrom, yearTo }
      }
    }
  }

  // Infer era from year if available
  if (yearFrom) {
    if (yearFrom < 410) return { era: 'Roman', yearFrom, yearTo }
    if (yearFrom < 1485) return { era: 'Medieval', yearFrom, yearTo }
    if (yearFrom < 1603) return { era: 'Tudor', yearFrom, yearTo }
    if (yearFrom < 1714) return { era: 'Stuart', yearFrom, yearTo }
    if (yearFrom < 1837) return { era: 'Georgian', yearFrom, yearTo }
    if (yearFrom < 1901) return { era: 'Victorian', yearFrom, yearTo }
    return { era: 'Modern', yearFrom, yearTo }
  }

  return { era: null, yearFrom: null, yearTo: null }
}

function detectLocation(title: string, content: string): { lat: number | null; lng: number | null; name: string | null; borough: string | null } {
  const text = `${title} ${content}`.toLowerCase()

  // Try to match known locations
  for (const [keyword, location] of Object.entries(LOCATION_KEYWORDS)) {
    if (text.includes(keyword)) {
      // Determine borough based on coordinates
      let detectedBorough: string | null = null
      for (const [borough, bounds] of Object.entries(BOROUGHS)) {
        if (
          location.lat >= bounds.lat[0] && location.lat <= bounds.lat[1] &&
          location.lng >= bounds.lng[0] && location.lng <= bounds.lng[1]
        ) {
          detectedBorough = borough
          break
        }
      }

      return {
        lat: location.lat,
        lng: location.lng,
        name: location.name,
        borough: detectedBorough
      }
    }
  }

  // Try to detect borough from text
  for (const borough of Object.keys(BOROUGHS)) {
    if (text.includes(borough.toLowerCase())) {
      const bounds = BOROUGHS[borough]
      // Return center of borough
      return {
        lat: (bounds.lat[0] + bounds.lat[1]) / 2,
        lng: (bounds.lng[0] + bounds.lng[1]) / 2,
        name: borough,
        borough
      }
    }
  }

  return { lat: null, lng: null, name: null, borough: null }
}

async function main() {
  console.log('Populating location data for articles...\n')

  // Get all articles
  const articles = await sql`
    SELECT id, title, content, excerpt
    FROM articles
    WHERE latitude IS NULL OR historical_era IS NULL
    ORDER BY id
  `

  console.log(`Found ${articles.length} articles to process\n`)

  let updated = 0
  let locationUpdated = 0
  let eraUpdated = 0

  for (const article of articles) {
    const text = `${article.title} ${article.content || ''} ${article.excerpt || ''}`

    const location = detectLocation(article.title, text)
    const era = detectEra(article.title, text)

    const updates: string[] = []

    if (location.lat !== null) {
      updates.push(`location: ${location.name}`)
      locationUpdated++
    }
    if (era.era !== null) {
      updates.push(`era: ${era.era}`)
      eraUpdated++
    }

    if (updates.length > 0) {
      await sql`
        UPDATE articles
        SET
          latitude = COALESCE(${location.lat}, latitude),
          longitude = COALESCE(${location.lng}, longitude),
          location_name = COALESCE(${location.name}, location_name),
          borough = COALESCE(${location.borough}, borough),
          historical_era = COALESCE(${era.era}, historical_era),
          year_from = COALESCE(${era.yearFrom}, year_from),
          year_to = COALESCE(${era.yearTo}, year_to)
        WHERE id = ${article.id}
      `
      console.log(`✓ ${article.title}: ${updates.join(', ')}`)
      updated++
    }
  }

  console.log(`\n\nDone!`)
  console.log(`Total updated: ${updated}`)
  console.log(`Locations added: ${locationUpdated}`)
  console.log(`Eras added: ${eraUpdated}`)
  console.log(`\nNote: For more accurate geocoding, consider using a geocoding API like:`)
  console.log(`- OpenStreetMap Nominatim (free)`)
  console.log(`- Google Maps Geocoding API`)
  console.log(`- Mapbox Geocoding API`)
}

main().catch(console.error)
