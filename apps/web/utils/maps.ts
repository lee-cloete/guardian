export type LngLatTuple = [number, number]

export type MapMarkerTone = 'client' | 'provider' | 'admin' | 'active' | 'pending'

export type MapMarker = {
  id: string
  label: string
  detail?: string
  latitude: number
  longitude: number
  tone?: MapMarkerTone
}

export type MapRouteTone = 'primary' | 'muted' | 'alert'

export type MapRoute = {
  id: string
  coordinates: LngLatTuple[]
  tone?: MapRouteTone
}

export type PlaceSuggestion = {
  id: string
  title: string
  subtitle: string
  address: string
  city: string
  latitude: number
  longitude: number
}

export type RouteSummary = {
  distanceMeters: number
  durationSeconds: number
  geometry: {
    type: 'LineString'
    coordinates: LngLatTuple[]
  }
}

export function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} km`
}

export function formatDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60))

  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (!minutes) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}

export function createGuardianMapStyle() {
  return {
    version: 8,
    name: 'guardian-light',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f3f0ea'
        }
      },
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        paint: {
          'raster-saturation': -0.7,
          'raster-contrast': 0.08,
          'raster-brightness-min': 0.28,
          'raster-brightness-max': 0.96
        }
      }
    ]
  }
}
