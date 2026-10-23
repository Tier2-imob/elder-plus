import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
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

function isTaskCategory(value: string | undefined): value is TaskCategory {
  return value !== undefined && value in TASK_CATEGORIES
}

/**
 * Map a Firestore TaskDoc to the screen's Task. The icon cast is sound because tasks are created
 * with TASK_CATEGORIES icons, which are real MaterialIcons glyph keys.
 */
function toTask(doc: TaskDoc): Task {
  return {
    id: doc.id,
    dayKey: doc.dayKey,
    title: doc.title,
    time: doc.time,
    day: doc.day,
    icon: doc.icon as keyof typeof MaterialIcons.glyphMap,
    assignee: doc.assignee,
    category: isTaskCategory(doc.category) ? doc.category : undefined,
    description: doc.description,
    createdAt: doc.createdAt ? doc.createdAt.toDate() : null,
    createdBy: doc.createdBy?.name,
  }
}

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
  assignTo: (taskId: string, assignee: string) => Promise<void>
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
  const { circle, membership, circleLoading } = useCircle()
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
    async (taskId: string, assignee: string): Promise<void> => {
      if (!circleId) return
      try {
        await tasks.assignTask(circleId, taskId, assignee)
      } catch (e) {
        console.warn('assignTask failed', e)
      }
    },
    [circleId]
  )

  const create = useCallback(
    async (input: NewTaskInput, createdByName: string): Promise<void> => {
      if (!circleId || !membership) throw new Error('No circle to create the task in')
      await tasks.createTask(circleId, {
        ...input,
        icon: TASK_CATEGORIES[input.category].icon,
        createdBy: { uid: membership.uid, name: createdByName },
      })
    },
    [circleId, membership]
  )

  const value = useMemo<CareTasksValue>(
    () => ({
      tasks: docs.map(toTask),
      doneIds: new Set(docs.filter((d) => d.done).map((d) => d.id)),
      tasksLoading,
      create,
      complete,
      uncomplete,
      rescheduleTime,
      assignTo,
    }),
    [docs, tasksLoading, create, complete, uncomplete, rescheduleTime, assignTo]
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
