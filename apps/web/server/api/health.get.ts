import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return {
    ok: true,
    service: 'guardian-web',
    time: new Date().toISOString()
  }
})
