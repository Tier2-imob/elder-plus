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
} from 'firebase/firestore'

import { db } from './config'
import type { TaskDoc } from './types'

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

function tasksQuery(circleId: string) {
  return query(collection(db, 'circles', circleId, 'tasks'), orderBy('order', 'asc'))
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
 * Subscribe to circles/{circleId}/tasks ordered by `order`. Fires right away for local writes (pending
 * server ack) and again whenever the server state changes, including edits from other devices.
 * `fromCache` is true when the snapshot did not come from the server (e.g. offline): an empty
 * cached snapshot does not mean the user has no tasks.
 */
export function observeTasks(
  circleId: string,
  onNext: (tasks: TaskDoc[], fromCache: boolean) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    tasksQuery(circleId),
    (snap) => onNext(snap.docs.map(toTaskDoc), snap.metadata.fromCache),
    onError
  )
}

/**
 * Create a task with an auto-generated id. `createdAt` is stamped by the server; the returned
 * TaskDoc carries the local time as a stand-in (`observeTasks` delivers the server value).
 * `order` is the creation time, so tasks sort by when they were created.
 */
export async function createTask(circleId: string, input: NewTaskDoc): Promise<TaskDoc> {
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
  const ref = await addDoc(collection(db, 'circles', circleId, 'tasks'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data, createdAt: Timestamp.now() }
}

/** Mark a task complete. */
export async function completeTask(circleId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'tasks', taskId), { done: true })
}

/** Unmark a task complete (revert to pending). */
export async function uncompleteTask(circleId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'tasks', taskId), { done: false })
}

/** Move a task to a new time (postpone). */
export async function rescheduleTaskTime(
  circleId: string,
  taskId: string,
  time: string
): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'tasks', taskId), { time })
}

/** Assign a family member as the task's responsible person. */
export async function assignTask(circleId: string, taskId: string, assignee: string): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'tasks', taskId), { assignee })
}
