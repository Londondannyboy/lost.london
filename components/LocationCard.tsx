interface LocationCardProps {
  name?: string | null
  borough?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function LocationCard({ name, borough, latitude, longitude }: LocationCardProps) {
  if (!name && !borough && !latitude) return null

  const locationText = [name, borough].filter(Boolean).join(', ')

  // Link to Google Maps if we have coordinates
  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-base">📍</span>
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-700 hover:underline"
        >
          {locationText || 'View location'}
        </a>
      ) : (
        <span>{locationText}</span>
      )}
    </div>
  )
}
