import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore'

import { db } from './config'
import type { TaskDoc } from './types'

/** Seed input: a TaskDoc without its generated `id`/`done` fields. */
export type TaskSeed = Omit<TaskDoc, 'id' | 'done'>

/** Input for a user-created task. `createdAt`/`order`/`done` are filled by `createTask`. */
export type NewTaskDoc = {
  dayKey: string
  title: string
  time: string
  day: string
  icon: string
  category: string
  description?: string
  assignee?: string
  createdBy: { uid: string; name: string }
}

function tasksQuery(uid: string) {
  return query(collection(db, 'users', uid, 'tasks'), orderBy('order', 'asc'))
}

function toTaskDoc(d: QueryDocumentSnapshot<DocumentData>): TaskDoc {
  // 'estimate': a task created on this device shows its local createdAt while the server
  // timestamp is still pending, instead of null.
  const data = d.data({ serverTimestamps: 'estimate' })
  return {
    id: d.id,
    dayKey: data.dayKey,
    title: data.title,
    time: data.time,
    day: data.day,
    icon: data.icon,
    done: data.done,
    order: data.order,
    assignee: data.assignee,
    category: data.category,
    description: data.description,
    createdAt: data.createdAt ?? null,
    createdBy: data.createdBy,
  }
}

/**
 * Subscribe to users/{uid}/tasks ordered by `order`. Fires right away for local writes (pending
 * server ack) and again whenever the server state changes, including edits from other devices.
 * `fromCache` is true when the snapshot did not come from the server (e.g. offline): an empty
 * cached snapshot does not mean the user has no tasks.
 */
export function observeTasks(
  uid: string,
  onNext: (tasks: TaskDoc[], fromCache: boolean) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    tasksQuery(uid),
    (snap) => onNext(snap.docs.map(toTaskDoc), snap.metadata.fromCache),
    onError
  )
}

/**
 * Create a task with an auto-generated id. `createdAt` is stamped by the server; the returned
 * TaskDoc carries the local time as a stand-in (`observeTasks` delivers the server value).
 * `order` is the creation time so new tasks sort after the seeded ones (order 0, 1).
 */
export async function createTask(uid: string, input: NewTaskDoc): Promise<TaskDoc> {
  const order = Date.now()
  // Firestore rejects `undefined` values, so optional fields are only written when present.
  const data = {
    dayKey: input.dayKey,
    title: input.title,
    time: input.time,
    day: input.day,
    icon: input.icon,
    category: input.category,
    order,
    done: false,
    createdBy: input.createdBy,
    ...(input.description ? { description: input.description } : {}),
    ...(input.assignee ? { assignee: input.assignee } : {}),
  }
  const ref = await addDoc(collection(db, 'users', uid, 'tasks'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data, createdAt: Timestamp.now() }
}

/**
 * Seed the tasks subcollection with fixed doc ids (t1, t2, ...) so a double first-launch converges
 * rather than duplicating. Returns the seeded TaskDocs (all `done: false`).
 */
export async function seedTasks(uid: string, seed: TaskSeed[]): Promise<TaskDoc[]> {
  const batch = writeBatch(db)
  const seeded: TaskDoc[] = seed.map((item, index) => {
    const id = `t${index + 1}`
    batch.set(doc(db, 'users', uid, 'tasks', id), {
      dayKey: item.dayKey,
      title: item.title,
      time: item.time,
      day: item.day,
      icon: item.icon,
      order: item.order,
      done: false,
    })
    return { id, ...item, done: false }
  })
  await batch.commit()
  return seeded
}

/** Mark a task complete. */
export async function completeTask(uid: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { done: true })
}

/** Unmark a task complete (revert to pending). */
export async function uncompleteTask(uid: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { done: false })
}

/** Move a task to a new time (postpone). */
export async function rescheduleTaskTime(
  uid: string,
  taskId: string,
  time: string
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { time })
}

/** Assign a family member as the task's responsible person. */
export async function assignTask(uid: string, taskId: string, assignee: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'tasks', taskId), { assignee })
}
