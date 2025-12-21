import { getArticlesWithLocation } from '@/lib/db'
import { Header } from '@/components/Header'
import { MapPageClient } from '@/components/MapPageClient'

export const metadata = {
  title: 'Interactive Map | Lost London',
  description: 'Explore London\'s hidden history on an interactive map. Discover historical locations, walking routes, and fascinating stories.',
}

export default async function MapPage({
  searchParams
}: {
  searchParams: Promise<{ era?: string; borough?: string }>
}) {
  const params = await searchParams
  const articles = await getArticlesWithLocation()

  // Get unique eras and boroughs for filters
  const eras = [...new Set(articles.map(a => a.historical_era).filter(Boolean))] as string[]
  const boroughs = [...new Set(articles.map(a => a.borough).filter(Boolean))].sort() as string[]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MapPageClient
        articles={articles}
        selectedEra={params.era}
        selectedBorough={params.borough}
        eras={eras}
        boroughs={boroughs}
      />
    </div>
  )
}
