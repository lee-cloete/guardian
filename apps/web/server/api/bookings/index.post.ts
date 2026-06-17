import { createBookingService, inMemoryBookingRepository } from '@guardian/backend'
import { bookingRequestSchema } from '@guardian/domain'
import { defineEventHandler, readValidatedBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => bookingRequestSchema.parse(value))
  const service = createBookingService(inMemoryBookingRepository)

  return service.requestBooking(body)
})
