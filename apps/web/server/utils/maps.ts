import type { PlaceSuggestion, RouteSummary } from '~/utils/maps'

type NominatimSearchResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string | undefined>
}

type OsrmRouteResponse = {
  code: string
  routes?: Array<{
    distance: number
    duration: number
    geometry: {
      coordinates: [number, number][]
      type: 'LineString'
    }
  }>
}

export async function searchPlaces(input: {
  query: string
  city?: string | null
  countryCodes?: string[]
  limit?: number
}): Promise<PlaceSuggestion[]> {
  const query = input.query.trim()

  if (query.length < 3) {
    return []
  }

  const searchString = [query, input.city?.trim()].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    q: searchString,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(input.limit ?? 5),
    dedupe: '1'
  })

  if (input.countryCodes?.length) {
    params.set('countrycodes', input.countryCodes.join(','))
  }

  const results = await $fetch<NominatimSearchResult[]>(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        'accept-language': 'en',
        'user-agent': 'guardian-web/0.1'
      }
    }
  )

  return results.map((result) => {
    const address = result.address ?? {}
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.suburb ??
      address.county ??
      input.city?.trim() ??
      'Unknown area'

    const title =
      address.road ??
      address.neighbourhood ??
      address.suburb ??
      result.display_name.split(',')[0]?.trim() ??
      'Selected location'

    const subtitle = [city, address.state, address.country].filter(Boolean).join(' · ')

    return {
      id: String(result.place_id),
      title,
      subtitle,
      address: result.display_name,
      city,
      latitude: Number(result.lat),
      longitude: Number(result.lon)
    }
  })
}

export async function buildRoute(input: {
  startLatitude: number
  startLongitude: number
  endLatitude: number
  endLongitude: number
}): Promise<RouteSummary | null> {
  const coordinates = [
    `${input.startLongitude},${input.startLatitude}`,
    `${input.endLongitude},${input.endLatitude}`
  ].join(';')

  const params = new URLSearchParams({
    alternatives: 'false',
    steps: 'false',
    geometries: 'geojson',
    overview: 'full'
  })

  const routeResponse = await $fetch<OsrmRouteResponse>(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`
  )

  if (routeResponse.code !== 'Ok' || !routeResponse.routes?.[0]) {
    return null
  }

  const route = routeResponse.routes[0]

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry
  }
}
