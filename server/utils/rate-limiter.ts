interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
}

interface CheckResult {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

interface Entry {
  timestamps: number[]
}

export class RateLimiter {
  private windowMs: number
  private maxRequests: number
  private store = new Map<string, Entry>()

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
  }

  check(key: string): CheckResult {
    const now = Date.now()
    const windowStart = now - this.windowMs

    let entry = this.store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      this.store.set(key, entry)
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart)

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0]
      const retryAfterMs = oldestInWindow + this.windowMs - now
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) }
    }

    entry.timestamps.push(now)
    const remaining = this.maxRequests - entry.timestamps.length
    return { allowed: true, remaining }
  }

  cleanup() {
    const now = Date.now()
    const windowStart = now - this.windowMs
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter(t => t > windowStart)
      if (entry.timestamps.length === 0) {
        this.store.delete(key)
      }
    }
  }
}
