import { NextResponse } from 'next/server'
import { getArticlesWithLocation, getArticlesByBorough, getArticlesByEra } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const era = searchParams.get('era')
  const borough = searchParams.get('borough')

  try {
    let articles

    if (era) {
      articles = await getArticlesByEra(era)
    } else if (borough) {
      articles = await getArticlesByBorough(borough)
    } else {
      articles = await getArticlesWithLocation()
    }

    // Filter to only include articles with coordinates
    const mappedArticles = articles.filter(a => a.latitude && a.longitude)

    return NextResponse.json({
      success: true,
      count: mappedArticles.length,
      articles: mappedArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featured_image_url: a.featured_image_url,
        latitude: a.latitude,
        longitude: a.longitude,
        location_name: a.location_name,
        borough: a.borough,
        historical_era: a.historical_era
      }))
    })
  } catch (error) {
    console.error('Map API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch map data' },
      { status: 500 }
    )
  }
}
