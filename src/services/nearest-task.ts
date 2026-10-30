/**
 * The "next task" rule for the Explore screen. Pure (no Firebase or React), so it is unit-tested
 * (tests/unit/nearest-task.test.mjs).
 */

/** Just what the rule needs from a task; the app's Task satisfies it. */
type TaskLike = { id: string; time: string }

/**
 * Parse a task `time` string into minutes-of-day. Two real formats exist in the codebase:
 *   - zero-padded "HH:MM" (task seeds, e.g. "09:30", "12:00")
 *   - hour-only "<n>h"    (care data, e.g. "8h", "14h", "20h")
 * Match "HH:MM" first, otherwise match a leading integer (optionally followed by "h"/"H").
 * Anything unparseable returns +Infinity so it sorts last and never wins the "nearest" slot.
 */
export function parseTimeToMinutes(time: string): number {
  if (typeof time !== 'string') return Number.POSITIVE_INFINITY
  const trimmed = time.trim()

  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    const hours = Number(hhmm[1])
    const minutes = Number(hhmm[2])
    if (hours <= 23 && minutes <= 59) return hours * 60 + minutes
    return Number.POSITIVE_INFINITY
  }

  const hourOnly = trimmed.match(/^(\d{1,2})\s*[hH]?$/)
  if (hourOnly) {
    const hours = Number(hourOnly[1])
    if (hours <= 23) return hours * 60
  }

  return Number.POSITIVE_INFINITY
}

/**
 * Pick the "nearest pending task".
 *
 * Rule: among tasks not in `doneIds`, choose the earliest by minutes-of-day that falls AT OR AFTER
 * the current minute-of-day ("now"); if none remain later today, fall back to the earliest pending
 * task overall (so a circle with pending tasks is never shown empty). Ties break by the order of
 * `tasks` (Firestore returns them by `order asc`; the sort is stable).
 */
export function pickNearestPending<T extends TaskLike>(
  tasks: T[],
  doneIds: Set<string>,
  now: Date = new Date()
): T | null {
  const pending = tasks.filter((t) => !doneIds.has(t.id))
  if (pending.length === 0) return null

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const byTime = [...pending].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))

  return byTime.find((t) => parseTimeToMinutes(t.time) >= nowMinutes) ?? byTime[0]
}
