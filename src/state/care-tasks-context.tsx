import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Timestamp } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  TASK_CATEGORIES,
  type NewTaskInput,
  type Task,
  type TaskCategory,
} from '@/components/care/types';
import type { TaskSeed } from '@/services/firebase/tasks';
import * as tasks from '@/services/firebase/tasks';
import type { TaskDoc } from '@/services/firebase/types';
import { readCache, writeCache } from '@/services/local-cache';

function isTaskCategory(value: string | undefined): value is TaskCategory {
  return value !== undefined && value in TASK_CATEGORIES
}

/**
 * Initial tasks seeded for a user with no stored tasks. Carries the exact glyph strings
 * (`favorite-border` for t1, `medication` for t2) and an explicit `order` so they render in the
 * same sequence as before.
 */
const SEED: TaskSeed[] = [
  {
    dayKey: 'wed',
    title: 'Consulta cardiologista',
    time: '09:30',
    day: 'Quarta-feira, 14',
    icon: 'favorite-border',
    order: 0,
  },
  {
    dayKey: 'wed',
    title: 'Tomar medicação — Losartana',
    time: '12:00',
    day: 'Quarta-feira, 14',
    icon: 'medication',
    order: 1,
  },
]

/**
 * Map a Firestore TaskDoc to the screen's Task. The icon cast is sound because `seedTasks` persists
 * the exact glyph names from SEED, which are real MaterialIcons glyph keys.
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

const cacheKey = (uid: string) => `tasks:${uid}`

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
 * Single source of the user's care tasks for every screen (Explore card + Cuidados), so switching
 * screens never refetches and a change made on one shows on the other at once.
 *
 * - Subscribes with `onSnapshot`: local writes show immediately (Firestore latency compensation)
 *   and are rolled back by the SDK if the server rejects them, so actions need no manual optimism.
 * - Shows the last list saved in AsyncStorage while the first snapshot is on its way.
 * - Seeds the initial tasks once when the server reports an empty collection.
 */
export function CareTasksProvider({ uid, children }: { uid: string | undefined; children: ReactNode }) {
  const [docs, setDocs] = useState<TaskDoc[]>([])
  const [tasksLoading, setTasksLoading] = useState(uid !== undefined)

  const seededRef = useRef(false)

  // Reset during render whenever the uid changes (the React "adjust state when a prop changes"
  // pattern), so a provider reused across accounts never shows the previous user's tasks.
  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) {
    setLoadedForUid(uid)
    setDocs([])
    setTasksLoading(uid !== undefined)
  }

  useEffect(() => {
    seededRef.current = false

    if (!uid) return

    let active = true
    let gotSnapshot = false

    readCache<CachedTaskDoc[]>(cacheKey(uid)).then((cached) => {
      if (!active || gotSnapshot || !cached) return
      setDocs(cached.map(fromCached))
      setTasksLoading(false)
    })

    const unsubscribe = tasks.observeTasks(
      uid,
      (loaded, fromCache) => {
        if (!active) return
        if (loaded.length === 0 && !fromCache && !seededRef.current) {
          // The seed write fires the next snapshot with the seeded tasks.
          seededRef.current = true
          tasks.seedTasks(uid, SEED).catch((e) => {
            console.warn('seedTasks failed', e)
            if (active) setTasksLoading(false)
          })
          return
        }
        if (loaded.length === 0 && fromCache) {
          // Offline with an empty in-memory cache: unknown, not "no tasks". Keep whatever the
          // AsyncStorage cache showed and just stop the spinner.
          setTasksLoading(false)
          return
        }
        gotSnapshot = true
        setDocs(loaded)
        setTasksLoading(false)
        void writeCache(cacheKey(uid), loaded.map(toCached))
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
  }, [uid])

  const complete = useCallback(
    async (taskId: string): Promise<void> => {
      if (!uid) return
      try {
        await tasks.completeTask(uid, taskId)
      } catch (e) {
        console.warn('completeTask failed', e)
      }
    },
    [uid]
  )

  const uncomplete = useCallback(
    async (taskId: string): Promise<void> => {
      if (!uid) return
      try {
        await tasks.uncompleteTask(uid, taskId)
      } catch (e) {
        console.warn('uncompleteTask failed', e)
      }
    },
    [uid]
  )

  const rescheduleTime = useCallback(
    async (taskId: string, time: string): Promise<void> => {
      if (!uid) return
      try {
        await tasks.rescheduleTaskTime(uid, taskId, time)
      } catch (e) {
        console.warn('rescheduleTaskTime failed', e)
      }
    },
    [uid]
  )

  const assignTo = useCallback(
    async (taskId: string, assignee: string): Promise<void> => {
      if (!uid) return
      try {
        await tasks.assignTask(uid, taskId, assignee)
      } catch (e) {
        console.warn('assignTask failed', e)
      }
    },
    [uid]
  )

  const create = useCallback(
    async (input: NewTaskInput, createdByName: string): Promise<void> => {
      if (!uid) throw new Error('No signed-in user')
      await tasks.createTask(uid, {
        ...input,
        icon: TASK_CATEGORIES[input.category].icon,
        createdBy: { uid, name: createdByName },
      })
    },
    [uid]
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
