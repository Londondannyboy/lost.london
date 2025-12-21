import Link from 'next/link'

interface LocationCardProps {
  name?: string | null
  borough?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function LocationCard({ name, borough, latitude, longitude }: LocationCardProps) {
  if (!name && !borough && !latitude) return null

  const locationText = [name, borough].filter(Boolean).join(', ')

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-base">📍</span>
      {latitude && longitude ? (
        <Link
          href={`/map?lat=${latitude}&lng=${longitude}`}
          className="hover:text-blue-700 hover:underline"
        >
          {locationText || 'View location'}
        </Link>
      ) : (
        <span>{locationText}</span>
      )}
    </div>
  )
}
