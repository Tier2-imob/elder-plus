import type MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useEffect, useRef, useState } from 'react'

import * as tasks from '@/services/firebase/tasks'
import type { TaskDoc } from '@/services/firebase/types'

/** The shape ExploreScreen consumes for the "Próxima tarefa" card. */
export type NearestTask = {
  id: string
  title: string
  time: string
  icon: keyof typeof MaterialIcons.glyphMap
}

/**
 * Parse a task `time` string into minutes-of-day. Two real formats exist in the codebase:
 *   - zero-padded "HH:MM" (task seeds, e.g. "09:30", "12:00")
 *   - hour-only "<n>h"    (care data, e.g. "8h", "14h", "20h")
 * Match "HH:MM" first, otherwise match a leading integer (optionally followed by "h"/"H").
 * Anything unparseable returns +Infinity so it sorts last and never wins the "nearest" slot.
 */
function parseTimeToMinutes(time: string): number {
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
 * Rule (documented): among tasks with `done === false`, choose the earliest by minutes-of-day that
 * falls AT OR AFTER the current minute-of-day ("now"); if none remain later today, fall back to the
 * earliest pending task overall (so the card is never empty while pending tasks exist). Ties break
 * by ascending `order`. `listTasks` already returns docs ordered by `order asc`, so a stable sort on
 * minutes preserves `order` as the natural tiebreaker.
 */
function pickNearestPending(docs: TaskDoc[]): TaskDoc | null {
  const pending = docs.filter((d) => !d.done)
  if (pending.length === 0) return null

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const byTime = [...pending].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  )

  const upcoming = byTime.find((d) => parseTimeToMinutes(d.time) >= nowMinutes)
  return upcoming ?? byTime[0]
}

/**
 * Reads the signed-in user's tasks from Firestore (via `listTasks`) and exposes the nearest pending
 * task for the ExploreScreen card. Mirrors `useCareTasks`' uid-guard + render-time reset-on-uid-change
 * pattern. This hook only READS — it does NOT seed (seeding is `useCareTasks`' responsibility;
 * duplicating it here would risk races). Firestore access stays in the service layer.
 */
export function useNearestTask(uid: string | undefined) {
  const [task, setTask] = useState<NearestTask | null>(null)
  const [loading, setLoading] = useState(uid !== undefined)

  // Reset to the loading state during render whenever the uid changes (the React-recommended
  // "adjust state when a prop changes" pattern), so a wrapper reused across accounts never shows
  // the previous user's task.
  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) {
    setLoadedForUid(uid)
    setTask(null)
    setLoading(uid !== undefined)
  }

  // Tracks the current effect run so a resolved request for a stale uid never writes state.
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    if (uid) {
      tasks
        .listTasks(uid)
        .then((docs) => {
          if (!activeRef.current) return
          const nearest = pickNearestPending(docs)
          // The icon cast is sound because tasks are seeded with real MaterialIcons glyph strings.
          setTask(
            nearest
              ? {
                  id: nearest.id,
                  title: nearest.title,
                  time: nearest.time,
                  icon: nearest.icon as keyof typeof MaterialIcons.glyphMap,
                }
              : null
          )
        })
        .catch((e) => {
          console.warn('listTasks failed', e)
          if (activeRef.current) setTask(null)
        })
        .finally(() => {
          if (activeRef.current) setLoading(false)
        })
    }

    return () => {
      activeRef.current = false
    }
  }, [uid])

  return { task, loading }
}
