import { defineEventHandler, getQuery } from 'h3'
import { searchPlaces } from '~/server/utils/maps'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const city = typeof query.city === 'string' ? query.city : null
  const config = useRuntimeConfig(event)
  const countryCodes = config.public.mapCountryCodes
    .split(',')
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)

  return {
    results: await searchPlaces({
      query: q,
      city,
      countryCodes
    })
  }
})
