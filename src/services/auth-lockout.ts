/**
 * Client-side temporary login lockout for the email/password flow.
 *
 * Satisfies the acceptance criterion "após 5 tentativas erradas, o login fica bloqueado
 * temporariamente" over Firebase Auth — there is NO custom backend. We only gate the EMAIL path
 * (passwords are guessable); the Google path is untouched.
 *
 * Design: an in-memory map keyed by the normalized email. The lockout lives for the lifetime of the
 * JS process (it resets on an app restart). This is intentional — persisting it via AsyncStorage
 * would add real complexity (async reads before every attempt, clock-skew handling) for a guardrail
 * whose only job is to slow down rapid repeated guesses in a single session; a reinstall/restart
 * reset is an acceptable tradeoff for a client-side-only measure. Firebase's own server-side
 * `auth/too-many-requests` remains the durable backstop.
 */

/** Consecutive failed attempts before the account is temporarily blocked. */
export const LOCKOUT_MAX_ATTEMPTS = 5

/** How long the block lasts, in milliseconds, once the threshold is reached. */
export const LOCKOUT_COOLDOWN_MS = 60_000

/** App-level error code surfaced to auth-errors.ts when a sign-in is blocked by the lockout. */
export const LOCKOUT_ERROR_CODE = 'app/too-many-attempts'

type Entry = {
  /** Consecutive failed attempts recorded so far. */
  failures: number
  /** Epoch ms at which the current block ends, or null when not blocked. */
  lockedUntil: number | null
}

const entries = new Map<string, Entry>()

/** Normalize an email so one mistyped casing/spacing can't dodge (or cross-lock) the counter. */
function keyFor(email: string): string {
  return email.trim().toLowerCase()
}

/** Error thrown when an attempt is made while the email is locked out. */
export type LockoutError = Error & { code: string; remainingSeconds: number }

function lockoutError(remainingMs: number): LockoutError {
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000))
  const error = new Error('too-many-attempts') as LockoutError
  error.code = LOCKOUT_ERROR_CODE
  error.remainingSeconds = remainingSeconds
  return error
}

/**
 * Remaining lockout time for an email in milliseconds, or 0 if not currently locked.
 * Clears an expired block as a side effect.
 */
export function remainingLockoutMs(email: string): number {
  const entry = entries.get(keyFor(email))
  if (!entry || entry.lockedUntil == null) return 0
  const remaining = entry.lockedUntil - Date.now()
  if (remaining <= 0) {
    // Block expired: reset so the user gets a fresh set of attempts.
    entries.delete(keyFor(email))
    return 0
  }
  return remaining
}

/**
 * Throw a {@link LockoutError} if the email is currently blocked. Call BEFORE hitting Firebase so a
 * locked account never reaches the network.
 */
export function assertNotLockedOut(email: string): void {
  const remaining = remainingLockoutMs(email)
  if (remaining > 0) {
    throw lockoutError(remaining)
  }
}

/**
 * Record a failed sign-in for an email. Once {@link LOCKOUT_MAX_ATTEMPTS} is reached the account is
 * blocked for {@link LOCKOUT_COOLDOWN_MS}. Returns the thrown-style error ONLY when this failure
 * triggers (or renews) a block, so the caller can surface the remaining time immediately.
 */
export function registerFailedAttempt(email: string): LockoutError | null {
  const key = keyFor(email)
  const entry = entries.get(key) ?? { failures: 0, lockedUntil: null }
  entry.failures += 1

  if (entry.failures >= LOCKOUT_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_COOLDOWN_MS
    entries.set(key, entry)
    return lockoutError(LOCKOUT_COOLDOWN_MS)
  }

  entries.set(key, entry)
  return null
}

/** Clear all lockout state for an email after a successful sign-in. */
export function clearLockout(email: string): void {
  entries.delete(keyFor(email))
}
