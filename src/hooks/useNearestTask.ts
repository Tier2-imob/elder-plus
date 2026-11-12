import { useState } from 'react'

import type { TaskCategory } from '@/components/care/types'
import { pickNearestPending } from '@/services/nearest-task'
import { useCareTasks } from '@/state/care-tasks-context'

/**
 * Exposes the nearest pending task for the ExploreScreen "Próxima tarefa" card, plus the same
 * actions the CareScreen TaskCard offers (concluir / adiar / atribuir). Reads the shared task list
 * from CareTasksProvider, so it is the same live data Cuidados shows. `uid` only keys the pin.
 */
export function useNearestTask(uid: string | undefined) {
  const { tasks, doneIds, tasksLoading, complete, uncomplete, rescheduleTime, assignTo, changeCategory, remove } =
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
    changeCategory: (id: string, category: TaskCategory) => {
      pin(id)
      changeCategory(id, category)
    },
    // No pin: once deleted, the card moves on to the next pending task.
    remove,
  }
}
