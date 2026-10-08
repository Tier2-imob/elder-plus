import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { TaskSeed } from '@/services/firebase/tasks';
import * as tasks from '@/services/firebase/tasks';
import type { TaskDoc } from '@/services/firebase/types';

/** The shape CareScreen consumes (icon narrowed to a MaterialIcons glyph key). */
export type Task = {
  id: string
  dayKey: string
  title: string
  time: string
  day: string
  icon: keyof typeof MaterialIcons.glyphMap
}

/**
 * Initial tasks seeded for a user with no stored tasks. Moved out of CareScreen; carries the exact
 * glyph strings (`favorite-border` for t1, `medication` for t2) and an explicit `order` so the
 * screen renders them in the same sequence as before.
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
  }
}

/**
 * Loads the user's care tasks from Firestore, seeding the initial tasks on first access (guarded so
 * a double first-launch does not re-seed). `complete` persists done:true, optimistically marks the
 * id done, and reverts on failure (completion is irreversible in the UI).
 */
export function useCareTasks(uid: string | undefined) {
  const [docs, setDocs] = useState<TaskDoc[]>([])
  const [tasksLoading, setTasksLoading] = useState(uid !== undefined)

  const seededRef = useRef(false)

  // Reset to the loading state during render whenever the uid changes (the React-recommended
  // "adjust state when a prop changes" pattern), so a wrapper reused across accounts never shows
  // the previous user's tasks and we avoid synchronous setState inside the effect body.
  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) {
    setLoadedForUid(uid)
    setDocs([])
    // With no signed-in user there is nothing to load; otherwise enter the loading state until the
    // effect resolves. Adjusting here (not in the effect) avoids a synchronous setState in the
    // effect body.
    setTasksLoading(uid !== undefined)
  }

  useEffect(() => {
    // Reset the per-session seed guard for the new uid (the effect re-runs whenever uid changes).
    seededRef.current = false

    if (!uid) return

    let active = true

    tasks
      .listTasks(uid)
      .then(async (loaded) => {
        if (loaded.length === 0 && !seededRef.current) {
          seededRef.current = true
          loaded = await tasks.seedTasks(uid, SEED)
        }
        if (active) setDocs(loaded)
      })
      .catch((e) => {
        console.warn('listTasks failed', e)
        if (active) setDocs([])
      })
      .finally(() => {
        if (active) setTasksLoading(false)
      })

    return () => {
      active = false
    }
  }, [uid])

  const complete = useCallback(
    async (taskId: string): Promise<void> => {
      if (!uid) return

      // Optimistically mark done; revert the single doc on failure.
      setDocs((prev) => prev.map((d) => (d.id === taskId ? { ...d, done: true } : d)))

      try {
        await tasks.completeTask(uid, taskId)
      } catch (e) {
        console.warn('completeTask failed', e)
        setDocs((prev) => prev.map((d) => (d.id === taskId ? { ...d, done: false } : d)))
      }
    },
    [uid]
  )

  const screenTasks = docs.map(toTask)
  const doneIds = new Set(docs.filter((d) => d.done).map((d) => d.id))

  return { tasks: screenTasks, doneIds, tasksLoading, complete }
}
