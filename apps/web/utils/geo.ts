type Coordinate = {
  latitude: number
  longitude: number
}

const cityCoordinates: Record<string, Coordinate> = {
  'cape town': { latitude: -33.9249, longitude: 18.4241 },
  johannesburg: { latitude: -26.2041, longitude: 28.0473 },
  pretoria: { latitude: -25.7479, longitude: 28.2293 },
  durban: { latitude: -29.8587, longitude: 31.0218 },
  stellenbosch: { latitude: -33.9321, longitude: 18.8602 },
  centurion: { latitude: -25.8589, longitude: 28.185 }
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

export function resolveCityCoordinate(city?: string | null): Coordinate {
  const normalizedCity = city?.trim().toLowerCase()

  if (normalizedCity && cityCoordinates[normalizedCity]) {
    return cityCoordinates[normalizedCity]
  }

  return cityCoordinates['cape town']!
}

export function inferCoordinate(input: {
  city?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  seed?: string
}): Coordinate {
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return {
      latitude: input.latitude,
      longitude: input.longitude
    }
  }

  const center = resolveCityCoordinate(input.city)
  const seed = hashString(`${input.city ?? ''}:${input.address ?? ''}:${input.seed ?? ''}`)
  const latitudeOffset = ((seed % 17) - 8) * 0.0075
  const longitudeOffset = ((Math.floor(seed / 17) % 17) - 8) * 0.009

  return {
    latitude: Number((center.latitude + latitudeOffset).toFixed(6)),
    longitude: Number((center.longitude + longitudeOffset).toFixed(6))
  }
}
