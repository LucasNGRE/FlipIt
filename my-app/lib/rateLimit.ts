interface Entry {
  count: number
  resetAt: number
  lockedUntil?: number
}

const store = new Map<string, Entry>()

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; lockoutMs?: number }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const { limit, windowMs, lockoutMs } = opts

  let entry = store.get(key)

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  entry.count++

  if (entry.count > limit) {
    if (lockoutMs) entry.lockedUntil = now + lockoutMs
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { allowed: true }
}
