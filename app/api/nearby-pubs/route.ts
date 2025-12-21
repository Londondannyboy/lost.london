import { NextRequest, NextResponse } from 'next/server'

// Vic's recommended historic London pubs
const RECOMMENDED_PUBS = [
  {
    name: 'Ye Olde Cheshire Cheese',
    address: '145 Fleet Street, EC4A 2BU',
    rating: 4.3,
    description: 'Rebuilt in 1667 after the Great Fire. Dickens, Twain, and Conan Doyle drank here.',
    lat: 51.5142,
    lng: -0.1067,
    isRecommended: true
  },
  {
    name: 'The George Inn',
    address: '75-77 Borough High Street, SE1 1NH',
    rating: 4.6,
    description: "London's last remaining galleried coaching inn. Shakespeare performed here.",
    lat: 51.5044,
    lng: -0.0891,
    isRecommended: true
  },
  {
    name: 'The Lamb and Flag',
    address: '33 Rose Street, WC2E 9EB',
    rating: 4.5,
    description: 'One of the oldest pubs in Covent Garden, dating from 1623.',
    lat: 51.5115,
    lng: -0.1256,
    isRecommended: true
  },
  {
    name: 'The Prospect of Whitby',
    address: '57 Wapping Wall, E1W 3SH',
    rating: 4.4,
    description: "London's oldest riverside pub, dating from 1520. Turner painted the Thames from here.",
    lat: 51.5064,
    lng: -0.0556,
    isRecommended: true
  },
  {
    name: 'The Cittie of Yorke',
    address: '22 High Holborn, WC1V 6BN',
    rating: 4.4,
    description: 'Spectacular Victorian interior with the longest bar in Britain.',
    lat: 51.5181,
    lng: -0.1119,
    isRecommended: true
  },
  {
    name: 'The Seven Stars',
    address: '53 Carey Street, WC2A 2JB',
    rating: 4.5,
    description: 'Behind the Royal Courts of Justice, established 1602. Tiny and charming.',
    lat: 51.5145,
    lng: -0.1133,
    isRecommended: true
  },
  {
    name: 'The Blackfriar',
    address: '174 Queen Victoria Street, EC4V 4EG',
    rating: 4.5,
    description: 'Stunning Arts and Crafts interior with bronze friar sculptures.',
    lat: 51.5121,
    lng: -0.1035,
    isRecommended: true
  },
  {
    name: 'The Spaniards Inn',
    address: 'Spaniards Road, NW3 7JJ',
    rating: 4.4,
    description: 'Hampstead Heath pub where Keats wrote. Dick Turpin supposedly drank here.',
    lat: 51.5712,
    lng: -0.1733,
    isRecommended: true
  }
]

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`
  }
  return `${km.toFixed(1)}km away`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')

  // If we have user location, sort by distance
  if (lat && lng) {
    const pubsWithDistance = RECOMMENDED_PUBS.map(pub => ({
      ...pub,
      distance: formatDistance(calculateDistance(lat, lng, pub.lat, pub.lng)),
      distanceKm: calculateDistance(lat, lng, pub.lat, pub.lng)
    }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map(({ distanceKm, lat, lng, ...pub }) => pub) // Remove internal fields

    return NextResponse.json({
      success: true,
      pubs: pubsWithDistance
    })
  }

  // Return top recommended without distance
  return NextResponse.json({
    success: true,
    pubs: RECOMMENDED_PUBS.slice(0, 5).map(({ lat, lng, ...pub }) => pub)
  })
}
