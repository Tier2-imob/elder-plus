import { Timestamp } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  TASK_CATEGORIES,
  type NewTaskInput,
  type Task,
  type TaskCategory,
} from '@/components/care/types';
import { hasPermission } from '@/services/circle-rules';
import * as tasks from '@/services/firebase/tasks';
import type { TaskDoc } from '@/services/firebase/types';
import { readCache, writeCache } from '@/services/local-cache';
import { useCircle } from '@/state/circle-context';
import { toTask } from '@/state/task-mapper';

/** TaskDoc as stored in the local cache (Timestamp is not JSON-serializable). */
type CachedTaskDoc = Omit<TaskDoc, 'createdAt'> & { createdAtMs: number | null }

const cacheKey = (circleId: string) => `tasks:circle:${circleId}`

const toCached = (doc: TaskDoc): CachedTaskDoc => {
  const { createdAt, ...rest } = doc
  return { ...rest, createdAtMs: createdAt ? createdAt.toMillis() : null }
}

const fromCached = ({ createdAtMs, ...rest }: CachedTaskDoc): TaskDoc => ({
  ...rest,
  createdAt: createdAtMs === null ? null : Timestamp.fromMillis(createdAtMs),
})

type CareTasksValue = {
  tasks: Task[]
  doneIds: Set<string>
  tasksLoading: boolean
  /** Create a task. Throws on failure so the form stays open to show the error. */
  create: (input: NewTaskInput, createdByName: string) => Promise<void>
  complete: (taskId: string) => Promise<void>
  uncomplete: (taskId: string) => Promise<void>
  rescheduleTime: (taskId: string, time: string) => Promise<void>
  /** Assign a circle member (by uid) as the responsible person. */
  assignTo: (taskId: string, assigneeId: string) => Promise<void>
  changeCategory: (taskId: string, category: TaskCategory) => Promise<void>
  remove: (taskId: string) => Promise<void>
}

const CareTasksContext = createContext<CareTasksValue | undefined>(undefined)

/**
 * Single source of the circle's care tasks for every screen (Explore card + Cuidados), so switching
 * screens never refetches and a change made on one shows on the other at once — and, being live,
 * changes made by other circle members show up too.
 *
 * - Reads circles/{circleId}/tasks only for an active member with `ver-rotina` (the rules deny it
 *   otherwise) and only once the circle is ready (after the creator's legacy data moved in).
 * - Subscribes with `onSnapshot`: local writes show immediately (Firestore latency compensation)
 *   and are rolled back by the SDK if the server rejects them, so actions need no manual optimism.
 * - Shows the last list saved in AsyncStorage while the first snapshot is on its way.
 */
export function CareTasksProvider({ children }: { children: ReactNode }) {
  const { circle, membership, members, circleLoading } = useCircle()
  const circleId =
    !circleLoading && circle && hasPermission(membership, 'ver-rotina') ? circle.id : undefined

  const [docs, setDocs] = useState<TaskDoc[]>([])
  const [tasksLoading, setTasksLoading] = useState(circleId !== undefined)

  // Reset during render whenever the circle changes (the React "adjust state when a prop changes"
  // pattern), so the provider never shows another circle's (or account's) tasks.
  const [loadedFor, setLoadedFor] = useState(circleId)
  if (loadedFor !== circleId) {
    setLoadedFor(circleId)
    setDocs([])
    setTasksLoading(circleId !== undefined)
  }

  useEffect(() => {
    if (!circleId) return

    let active = true
    let gotSnapshot = false

    readCache<CachedTaskDoc[]>(cacheKey(circleId)).then((cached) => {
      if (!active || gotSnapshot || !cached) return
      setDocs(cached.map(fromCached))
      setTasksLoading(false)
    })

    const unsubscribe = tasks.observeTasks(
      circleId,
      (loaded, fromCache) => {
        if (!active) return
        if (loaded.length === 0 && fromCache) {
          // Offline with an empty in-memory cache: unknown, not "no tasks". Keep whatever the
          // AsyncStorage cache showed and just stop the spinner.
          setTasksLoading(false)
          return
        }
        gotSnapshot = true
        setDocs(loaded)
        setTasksLoading(false)
        void writeCache(cacheKey(circleId), loaded.map(toCached))
      },
      (e) => {
        console.warn('observeTasks failed', e)
        if (active) setTasksLoading(false)
      }
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [circleId])

  const complete = useCallback(
    async (taskId: string): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.completeTask(circleId, taskId)
      } catch (e) {
        console.warn('completeTask failed', e)
      }
    },
    [circleId]
  )

  const uncomplete = useCallback(
    async (taskId: string): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.uncompleteTask(circleId, taskId)
      } catch (e) {
        console.warn('uncompleteTask failed', e)
      }
    },
    [circleId]
  )

  const rescheduleTime = useCallback(
    async (taskId: string, time: string): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.rescheduleTaskTime(circleId, taskId, time)
      } catch (e) {
        console.warn('rescheduleTaskTime failed', e)
      }
    },
    [circleId]
  )

  const assignTo = useCallback(
    async (taskId: string, assigneeId: string): Promise<void> => {
      if (!circleId) return
      try {
        const name = members.find((m) => m.uid === assigneeId)?.name ?? ''
        await tasks.assignTask(circleId, taskId, assigneeId, name)
      } catch (e) {
        console.warn('assignTask failed', e)
      }
    },
    [circleId, members]
  )

  const changeCategory = useCallback(
    async (taskId: string, category: TaskCategory): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.updateTaskCategory(circleId, taskId, category, TASK_CATEGORIES[category].icon)
      } catch (e) {
        console.warn('updateTaskCategory failed', e)
      }
    },
    [circleId]
  )

  // The snapshot drops the card at once (latency compensation) and restores it if the server refuses.
  const remove = useCallback(
    async (taskId: string): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.deleteTask(circleId, taskId)
      } catch (e) {
        console.warn('deleteTask failed', e)
      }
    },
    [circleId]
  )

  const create = useCallback(
    async (input: NewTaskInput, createdByName: string): Promise<void> => {
      if (!circleId || !membership) throw new Error('No circle to create the task in')
      await tasks.createTask(circleId, {
        ...input,
        assignee: input.assigneeId ? members.find((m) => m.uid === input.assigneeId)?.name : undefined,
        icon: TASK_CATEGORIES[input.category].icon,
        createdBy: { uid: membership.uid, name: createdByName },
      })
    },
    [circleId, membership, members]
  )

  const names = useMemo(
    () => new Map(members.filter((m) => m.status === 'ativo').map((m) => [m.uid, m.name])),
    [members]
  )

  const value = useMemo<CareTasksValue>(
    () => ({
      tasks: docs.map((d) => toTask(d, names)),
      doneIds: new Set(docs.filter((d) => d.done).map((d) => d.id)),
      tasksLoading,
      create,
      complete,
      uncomplete,
      rescheduleTime,
      assignTo,
      changeCategory,
      remove,
    }),
    [docs, names, tasksLoading, create, complete, uncomplete, rescheduleTime, assignTo, changeCategory, remove]
  )

  return <CareTasksContext.Provider value={value}>{children}</CareTasksContext.Provider>
}

export function useCareTasks() {
  const context = useContext(CareTasksContext)
  if (!context) {
    throw new Error('useCareTasks precisa ser usado dentro de um CareTasksProvider')
  }
  return context
}
