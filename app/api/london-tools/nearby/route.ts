import { NextResponse } from 'next/server'
import { getNearbyArticles } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')
  const radius = parseFloat(searchParams.get('radius') || '2')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: 'Invalid coordinates' },
      { status: 400 }
    )
  }

  try {
    const articles = await getNearbyArticles(lat, lng, radius)

    return NextResponse.json({
      success: true,
      count: articles.length,
      center: { lat, lng },
      radius,
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featured_image_url: a.featured_image_url,
        latitude: a.latitude,
        longitude: a.longitude,
        location_name: a.location_name,
        distance_km: Math.round(a.distance_km * 100) / 100
      }))
    })
  } catch (error) {
    console.error('Nearby API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nearby locations' },
      { status: 500 }
    )
  }
}
