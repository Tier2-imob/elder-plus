import { useEffect, useMemo, useState } from 'react';

import {
  TASK_CATEGORIES,
  type NextTaskEntry,
  type TaskCategory,
} from '@/components/care/types';
import { hasPermission, isAssignable } from '@/services/circle-rules';
import {
  canSeeRoutine,
  observeCircleTaskFeed,
  type CircleTaskFeed,
} from '@/services/firebase/circle-task-feed';
import * as tasks from '@/services/firebase/tasks';
import { pickNearestPending } from '@/services/nearest-task';
import { toFamilyMember } from '@/state/circle-context';
import { toTask } from '@/state/task-mapper';

/**
 * The Explore "next tasks" section: the next pending task of EACH care circle the user takes part
 * in, live (see observeCircleTaskFeed), plus the actions of the task card (concluir, adiar, atribuir,
 * categoria, excluir) applied to the right circle.
 *
 * - A circle still loading is an entry with `loading`, so the section can say "carregando" instead of
 *   claiming there is no task.
 * - Circles the user can't read the routine of are left out, and so are inactive ones (read-only
 *   history, not something to do next).
 * - Once the user acts on a card, that task stays shown (done or rescheduled) instead of jumping to
 *   the next one, so "Concluída" can still be undone. Keyed by uid + circle.
 */
export function useNextTasks(
  uid: string | undefined,
  circles: { id: string; name: string; inactive: boolean }[]
) {
  const live = useMemo(() => circles.filter((c) => !c.inactive), [circles])
  const idsKey = live.map((c) => c.id).join(',')

  const [feeds, setFeeds] = useState<Record<string, CircleTaskFeed>>({})
  const [pinned, setPinned] = useState<Record<string, string>>({})

  // Reset during render when the account changes, so another user never sees the previous one's tasks.
  const [feedsFor, setFeedsFor] = useState(uid)
  if (feedsFor !== uid) {
    setFeedsFor(uid)
    setFeeds({})
    setPinned({})
  }

  useEffect(() => {
    if (!uid || !idsKey) return
    const stops = idsKey.split(',').map((circleId) =>
      observeCircleTaskFeed(circleId, uid, (feed) => setFeeds((prev) => ({ ...prev, [circleId]: feed })))
    )
    return () => stops.forEach((stop) => stop())
  }, [uid, idsKey])

  const entries = useMemo<NextTaskEntry[]>(
    () =>
      live.flatMap((circle): NextTaskEntry[] => {
        const base = { circleId: circle.id, circleName: circle.name }
        const feed = feeds[circle.id]
        if (!feed || feed.loading) {
          return [{ ...base, loading: true, error: false, task: null, done: false, members: [], readOnly: true }]
        }
        if (feed.error) {
          return [{ ...base, loading: false, error: true, task: null, done: false, members: [], readOnly: true }]
        }
        if (!canSeeRoutine(feed.member)) return []

        const names = new Map(feed.members.filter((m) => m.status === 'ativo').map((m) => [m.uid, m.name]))
        const all = feed.tasks.map((doc) => toTask(doc, names))
        const doneIds = new Set(feed.tasks.filter((doc) => doc.done).map((doc) => doc.id))
        const pin = pinned[`${uid}:${circle.id}`]
        const task = all.find((t) => t.id === pin) ?? pickNearestPending(all, doneIds)

        return [
          {
            ...base,
            loading: false,
            error: false,
            task,
            done: task ? doneIds.has(task.id) : false,
            members: feed.members.filter(isAssignable).map((m) => toFamilyMember(m, feed.member)),
            readOnly: !hasPermission(feed.member, 'editar-rotina'),
          },
        ]
      }),
    [live, feeds, pinned, uid]
  )

  // The task card writes straight to the circle's tasks; the live listener shows the result at once.
  const run = (label: string, operation: Promise<void>) =>
    operation.catch((e) => console.warn(`${label} failed`, e))
  const pin = (circleId: string, taskId: string) => setPinned((prev) => ({ ...prev, [`${uid}:${circleId}`]: taskId }))

  return {
    entries,
    toggleDone: (circleId: string, taskId: string) => {
      pin(circleId, taskId)
      const done = entries.find((e) => e.circleId === circleId)?.done
      void run('toggleDone', done ? tasks.uncompleteTask(circleId, taskId) : tasks.completeTask(circleId, taskId))
    },
    reschedule: (circleId: string, taskId: string, time: string) => {
      pin(circleId, taskId)
      void run('rescheduleTask', tasks.rescheduleTaskTime(circleId, taskId, time))
    },
    assign: (circleId: string, taskId: string, assigneeId: string) => {
      pin(circleId, taskId)
      const name = entries.find((e) => e.circleId === circleId)?.members.find((m) => m.id === assigneeId)?.name ?? ''
      void run('assignTask', tasks.assignTask(circleId, taskId, assigneeId, name))
    },
    changeCategory: (circleId: string, taskId: string, category: TaskCategory) => {
      pin(circleId, taskId)
      void run('changeCategory', tasks.updateTaskCategory(circleId, taskId, category, TASK_CATEGORIES[category].icon))
    },
    // No pin: once deleted, the card moves on to the circle's next pending task.
    remove: (circleId: string, taskId: string) => {
      void run('deleteTask', tasks.deleteTask(circleId, taskId))
    },
  }
}
