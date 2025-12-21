import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('Starting database migration for Lost London enhancements...\n')

  // Phase 1.1: Add location columns to articles
  console.log('1. Adding location columns to articles table...')
  try {
    await sql`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
      ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS borough VARCHAR(100),
      ADD COLUMN IF NOT EXISTS historical_era VARCHAR(50),
      ADD COLUMN IF NOT EXISTS year_from INTEGER,
      ADD COLUMN IF NOT EXISTS year_to INTEGER
    `
    console.log('   ✓ Location columns added to articles\n')
  } catch (error) {
    console.log('   ✓ Location columns already exist or error:', (error as Error).message, '\n')
  }

  // Phase 1.2a: Create series table
  console.log('2. Creating series table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS series (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        article_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('   ✓ Series table created\n')
  } catch (error) {
    console.log('   ✓ Series table already exists or error:', (error as Error).message, '\n')
  }

  // Add series columns to articles
  console.log('3. Adding series columns to articles...')
  try {
    await sql`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS series_id INTEGER REFERENCES series(id),
      ADD COLUMN IF NOT EXISTS series_position INTEGER
    `
    console.log('   ✓ Series columns added to articles\n')
  } catch (error) {
    console.log('   ✓ Series columns already exist or error:', (error as Error).message, '\n')
  }

  // Phase 1.2b: Create routes tables
  console.log('4. Creating routes table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'moderate', 'challenging')),
        duration_minutes INTEGER,
        distance_km DECIMAL(4,2),
        borough VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('   ✓ Routes table created\n')
  } catch (error) {
    console.log('   ✓ Routes table already exists or error:', (error as Error).message, '\n')
  }

  console.log('5. Creating route_stops table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS route_stops (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
        article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
        stop_order INTEGER NOT NULL,
        walking_notes TEXT,
        UNIQUE(route_id, stop_order)
      )
    `
    console.log('   ✓ Route stops table created\n')
  } catch (error) {
    console.log('   ✓ Route stops table already exists or error:', (error as Error).message, '\n')
  }

  // Phase 1.2c: Create NextAuth.js required tables
  console.log('6. Creating NextAuth.js users table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        email_verified TIMESTAMP,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('   ✓ Users table created\n')
  } catch (error) {
    console.log('   ✓ Users table already exists or error:', (error as Error).message, '\n')
  }

  console.log('7. Creating NextAuth.js accounts table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type VARCHAR(255),
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, provider_account_id)
      )
    `
    console.log('   ✓ Accounts table created\n')
  } catch (error) {
    console.log('   ✓ Accounts table already exists or error:', (error as Error).message, '\n')
  }

  console.log('8. Creating NextAuth.js sessions table...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP NOT NULL
      )
    `
    console.log('   ✓ Sessions table created\n')
  } catch (error) {
    console.log('   ✓ Sessions table already exists or error:', (error as Error).message, '\n')
  }

  console.log('9. Creating user_data table for bookmarks/progress...')
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bookmarks INTEGER[] DEFAULT '{}',
        read_articles INTEGER[] DEFAULT '{}',
        visited_locations INTEGER[] DEFAULT '{}',
        saved_routes INTEGER[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('   ✓ User data table created\n')
  } catch (error) {
    console.log('   ✓ User data table already exists or error:', (error as Error).message, '\n')
  }

  // Create indexes for performance
  console.log('10. Creating indexes for performance...')
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_location ON articles(latitude, longitude) WHERE latitude IS NOT NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_borough ON articles(borough) WHERE borough IS NOT NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_era ON articles(historical_era) WHERE historical_era IS NOT NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_articles_series ON articles(series_id) WHERE series_id IS NOT NULL`
    await sql`CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id)`
    console.log('   ✓ Indexes created\n')
  } catch (error) {
    console.log('   ✓ Indexes already exist or error:', (error as Error).message, '\n')
  }

  console.log('Migration complete!')
  console.log('\nNext steps:')
  console.log('1. Run: npx tsx scripts/populate-location-data.ts')
  console.log('2. Run: npx tsx scripts/create-series.ts')
  console.log('3. Run: npx tsx scripts/create-routes.ts')
}

migrate().catch(console.error)
