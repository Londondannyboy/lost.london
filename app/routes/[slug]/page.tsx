import { getRouteBySlug, getRouteStops } from '@/lib/db'
import { Header } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RouteMapClient } from '@/components/RouteMapClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const route = await getRouteBySlug(slug)

  if (!route) return { title: 'Route Not Found' }

  return {
    title: `${route.name} | Walking Routes | Lost London`,
    description: route.description
  }
}

export default async function RoutePage({ params }: Props) {
  const { slug } = await params
  const route = await getRouteBySlug(slug)

  if (!route) {
    notFound()
  }

  const stops = await getRouteStops(route.id)

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Route header */}
        <div className="mb-8">
          <Link href="/routes" className="text-sm text-gray-500 hover:text-gray-400 mb-4 inline-block">
            ← Back to routes
          </Link>
          <h1 className="text-3xl font-serif text-white mb-2">{route.name}</h1>
          {route.borough && (
            <p className="text-gray-500">{route.borough}</p>
          )}
        </div>

        {/* Route info */}
        <div className="flex flex-wrap gap-6 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚶</span>
            <div>
              <p className="text-sm text-gray-500">Distance</p>
              <p className="text-white font-medium">{route.distance_km} km</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-white font-medium">{route.duration_minutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-sm text-gray-500">Stops</p>
              <p className="text-white font-medium">{stops.length} locations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm text-gray-500">Difficulty</p>
              <p className="text-white font-medium capitalize">{route.difficulty}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {route.description && (
          <div className="article-card p-6 mb-8">
            <p className="text-gray-300 leading-relaxed">{route.description}</p>
          </div>
        )}

        {/* Map */}
        {stops.length > 0 && stops.some(s => s.article?.latitude) && (
          <div className="mb-8">
            <h2 className="text-xl font-serif text-white mb-4">Route Map</h2>
            <div className="h-80 rounded-lg overflow-hidden">
              <RouteMapClient stops={stops} />
            </div>
          </div>
        )}

        {/* Stops */}
        <div>
          <h2 className="text-xl font-serif text-white mb-4">Route Stops</h2>
          <div className="space-y-4">
            {stops.map((stop, index) => (
              <div key={stop.id} className="flex gap-4">
                {/* Stop number */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-london-700 flex items-center justify-center text-gold-400 font-bold">
                  {index + 1}
                </div>

                {/* Stop content */}
                <div className="flex-1 article-card p-4">
                  {stop.article && (
                    <Link
                      href={`/article/${stop.article.slug}`}
                      className="block group"
                    >
                      <div className="flex gap-4">
                        {stop.article.featured_image_url && (
                          <img
                            src={stop.article.featured_image_url}
                            alt={stop.article.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-white group-hover:text-gold-400 transition-colors">
                            {stop.article.title}
                          </h3>
                          {stop.article.location_name && (
                            <p className="text-sm text-gray-500 mt-1">
                              {stop.article.location_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {stop.article.excerpt}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {stop.walking_notes && (
                    <div className="mt-3 pt-3 border-t border-london-700">
                      <p className="text-sm text-gray-500 italic">
                        📍 {stop.walking_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Connector line */}
                {index < stops.length - 1 && (
                  <div className="absolute left-5 mt-10 w-0.5 h-full bg-london-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
