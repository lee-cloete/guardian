import { createError, defineEventHandler, getQuery } from 'h3'
import { buildRoute } from '~/server/utils/maps'

function readCoordinate(value: unknown, name: string) {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN

  if (!Number.isFinite(parsed)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${name}.`
    })
  }

  return parsed
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const startLatitude = readCoordinate(query.startLatitude, 'startLatitude')
  const startLongitude = readCoordinate(query.startLongitude, 'startLongitude')
  const endLatitude = readCoordinate(query.endLatitude, 'endLatitude')
  const endLongitude = readCoordinate(query.endLongitude, 'endLongitude')

  const route = await buildRoute({
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude
  })

  return {
    route
  }
})
