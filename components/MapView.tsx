'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// Fix for default markers in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

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

interface MapViewProps {
  articles: Article[]
  selectedEra?: string
  selectedBorough?: string
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export function MapView({ articles, selectedEra, selectedBorough }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  // Filter articles - only include those with valid coordinates
  const filteredArticles = articles.filter(article => {
    if (!article.latitude || !article.longitude) return false
    if (selectedEra && article.historical_era !== selectedEra) return false
    if (selectedBorough && article.borough !== selectedBorough) return false
    return true
  }) as (Article & { latitude: number; longitude: number })[]

  // Calculate center from articles or default to central London
  const center: [number, number] = filteredArticles.length > 0
    ? [
        filteredArticles.reduce((sum, a) => sum + a.latitude, 0) / filteredArticles.length,
        filteredArticles.reduce((sum, a) => sum + a.longitude, 0) / filteredArticles.length
      ]
    : [51.5074, -0.1278]

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-london-900 flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full"
        style={{ background: '#0a0e14' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapController center={center} />

        {filteredArticles.map((article) => (
          <Marker
            key={article.id}
            position={[article.latitude, article.longitude]}
            eventHandlers={{
              click: () => setSelectedArticle(article)
            }}
          >
            <Popup>
              <div className="min-w-[200px] max-w-[280px]">
                {article.featured_image_url && (
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-24 object-cover rounded-t mb-2"
                  />
                )}
                <h3 className="font-serif font-bold text-gray-900 text-sm mb-1">
                  {article.title}
                </h3>
                {article.location_name && (
                  <p className="text-xs text-gray-500 mb-1">{article.location_name}</p>
                )}
                {article.historical_era && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mb-2">
                    {article.historical_era}
                  </span>
                )}
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {article.excerpt}
                </p>
                <Link
                  href={`/article/${article.slug}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Read more →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Article count badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-surface/90 backdrop-blur border border-london-700 rounded-lg px-3 py-2">
        <span className="text-sm text-gray-300">
          <span className="font-bold text-gold-400">{filteredArticles.length}</span> locations
        </span>
      </div>

      {/* Selected article panel (mobile) */}
      {selectedArticle && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] md:hidden">
          <div className="bg-surface/95 backdrop-blur border border-london-700 rounded-lg p-4">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            <h3 className="font-serif font-bold text-white pr-6">{selectedArticle.title}</h3>
            {selectedArticle.location_name && (
              <p className="text-sm text-gray-400 mt-1">{selectedArticle.location_name}</p>
            )}
            <p className="text-sm text-gray-300 mt-2 line-clamp-2">{selectedArticle.excerpt}</p>
            <Link
              href={`/article/${selectedArticle.slug}`}
              className="inline-block mt-3 text-sm font-medium text-london-400 hover:text-london-300"
            >
              Read full article →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
