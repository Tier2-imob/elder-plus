import { useState } from 'react'

import type { Task } from '@/components/care/types'
import { useCareTasks } from '@/state/care-tasks-context'

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
 * Rule (documented): among tasks not in `doneIds`, choose the earliest by minutes-of-day that falls
 * AT OR AFTER the current minute-of-day ("now"); if none remain later today, fall back to the
 * earliest pending task overall (so the card is never empty while pending tasks exist). Ties break
 * by ascending `order`. `observeTasks` already returns docs ordered by `order asc`, so a stable sort on
 * minutes preserves `order` as the natural tiebreaker.
 */
function pickNearestPending(tasks: Task[], doneIds: Set<string>): Task | null {
  const pending = tasks.filter((t) => !doneIds.has(t.id))
  if (pending.length === 0) return null

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const byTime = [...pending].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  )

  const upcoming = byTime.find((t) => parseTimeToMinutes(t.time) >= nowMinutes)
  return upcoming ?? byTime[0]
}

/**
 * Exposes the nearest pending task for the ExploreScreen "Próxima tarefa" card, plus the same
 * actions the CareScreen TaskCard offers (concluir / adiar / atribuir). Reads the shared task list
 * from CareTasksProvider, so it is the same live data Cuidados shows. `uid` only keys the pin.
 */
export function useNearestTask(uid: string | undefined) {
  const { tasks, doneIds, tasksLoading, complete, uncomplete, rescheduleTime, assignTo } =
    useCareTasks()

  // Once the user acts on the card, keep showing that task (done or rescheduled) instead of jumping
  // to the next one, so "Concluída" can still be undone. Keyed by uid so it never leaks across accounts.
  const [pinned, setPinned] = useState<{ uid: string | undefined; id: string } | null>(null)
  const pinnedTask = pinned && pinned.uid === uid ? tasks.find((t) => t.id === pinned.id) : undefined
  const task = pinnedTask ?? pickNearestPending(tasks, doneIds)

  const pin = (id: string) => setPinned({ uid, id })

  return {
    task,
    done: task ? doneIds.has(task.id) : false,
    loading: tasksLoading,
    toggleDone: (id: string) => {
      pin(id)
      if (doneIds.has(id)) uncomplete(id)
      else complete(id)
    },
    reschedule: (id: string, time: string) => {
      pin(id)
      rescheduleTime(id, time)
    },
    assign: (id: string, assignee: string) => {
      pin(id)
      assignTo(id, assignee)
    },
  }
}
