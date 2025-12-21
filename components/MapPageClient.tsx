'use client'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView').then(mod => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-london-900 flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  )
})

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  latitude?: number
  longitude?: number
  location_name?: string
  borough?: string
  historical_era?: string
}

interface MapPageClientProps {
  articles: Article[]
  selectedEra?: string
  selectedBorough?: string
  eras: string[]
  boroughs: string[]
}

export function MapPageClient({ articles, selectedEra, selectedBorough, eras, boroughs }: MapPageClientProps) {
  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Filters Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-london-800 p-4">
        <h2 className="font-serif text-lg text-white mb-4">Filter Locations</h2>

        {/* Era Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Historical Era</h3>
          <div className="flex flex-wrap gap-2">
            <a
              href="/map"
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                !selectedEra
                  ? 'bg-london-600 border-london-500 text-white'
                  : 'border-london-700 text-gray-400 hover:border-london-500 hover:text-white'
              }`}
            >
              All
            </a>
            {eras.map(era => (
              <a
                key={era}
                href={`/map?era=${era}${selectedBorough ? `&borough=${selectedBorough}` : ''}`}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedEra === era
                    ? 'bg-london-600 border-london-500 text-white'
                    : 'border-london-700 text-gray-400 hover:border-london-500 hover:text-white'
                }`}
              >
                {era}
              </a>
            ))}
          </div>
        </div>

        {/* Borough Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Borough</h3>
          <select
            defaultValue={selectedBorough || ''}
            onChange={(e) => {
              const borough = e.target.value
              const url = new URL(window.location.href)
              if (borough) {
                url.searchParams.set('borough', borough)
              } else {
                url.searchParams.delete('borough')
              }
              window.location.href = url.toString()
            }}
            className="w-full bg-london-800 border border-london-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-london-500 focus:outline-none"
          >
            <option value="">All Boroughs</option>
            {boroughs.map(borough => (
              <option key={borough} value={borough}>{borough}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-london-800">
          <p className="text-sm text-gray-500">
            Showing <span className="text-gold-400 font-medium">{articles.length}</span> mapped locations
          </p>
        </div>
      </aside>

      {/* Map Container */}
      <main className="flex-1 h-[calc(100vh-4rem)] md:h-auto">
        <MapView
          articles={articles}
          selectedEra={selectedEra}
          selectedBorough={selectedBorough}
        />
      </main>
    </div>
  )
}
