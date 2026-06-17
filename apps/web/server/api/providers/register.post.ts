import { createProviderService, inMemoryProviderRepository } from '@guardian/backend'
import { providerProfileSchema } from '@guardian/domain'
import { defineEventHandler, readValidatedBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => providerProfileSchema.parse(value))
  const service = createProviderService(inMemoryProviderRepository)

  return service.saveProfile(body)
})
