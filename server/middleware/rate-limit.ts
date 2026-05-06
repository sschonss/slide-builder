import { RateLimiter } from '../utils/rate-limiter'

const writeLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30 })
const readLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 100 })

// Cleanup stale entries every 5 minutes.
// .unref() prevents the timer from keeping the Node event loop alive,
// which would hang prerender/build processes indefinitely.
const cleanupInterval = setInterval(() => {
  writeLimiter.cleanup()
  readLimiter.cleanup()
}, 5 * 60_000)
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref()
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const SKIP_PATHS = ['/api/health', '/api/sync/']

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Skip rate limiting for non-API routes and health/sync endpoints
  if (!path.startsWith('/api/') || SKIP_PATHS.some(p => path.startsWith(p))) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const method = getMethod(event)
  const isWrite = WRITE_METHODS.has(method)
  const limiter = isWrite ? writeLimiter : readLimiter

  const result = limiter.check(ip)

  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', String(Math.ceil((result.retryAfterMs || 60_000) / 1000)))
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Try again later.',
    })
  }
})
