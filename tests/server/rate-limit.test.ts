import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter } from '../../server/utils/rate-limiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 })
  })

  it('allows requests under the limit', () => {
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 2 })
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 1 })
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 0 })
  })

  it('blocks requests over the limit', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')
    const result = limiter.check('ip-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks IPs independently', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')

    expect(limiter.check('ip-1').allowed).toBe(false)
    expect(limiter.check('ip-2').allowed).toBe(true)
  })

  it('resets after window expires', () => {
    vi.useFakeTimers()

    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')
    expect(limiter.check('ip-1').allowed).toBe(false)

    vi.advanceTimersByTime(61_000)

    expect(limiter.check('ip-1').allowed).toBe(true)

    vi.useRealTimers()
  })

  it('cleans up stale entries', () => {
    vi.useFakeTimers()

    limiter.check('ip-1')
    limiter.check('ip-2')

    vi.advanceTimersByTime(61_000)

    limiter.cleanup()
    expect(limiter.check('ip-1').allowed).toBe(true)
    expect(limiter.check('ip-2').allowed).toBe(true)

    vi.useRealTimers()
  })
})
