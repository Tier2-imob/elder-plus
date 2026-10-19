import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

import { db } from './config'
import type { TaskDoc } from './types'

/** Seed input: a TaskDoc without its generated `id`/`done` fields. */
export type TaskSeed = Omit<TaskDoc, 'id' | 'done'>

/** List tasks under users/{uid}/tasks ordered by `order`. */
export async function listTasks(uid: string): Promise<TaskDoc[]> {
  const snap = await getDocs(query(collection(db, 'users', uid, 'tasks'), orderBy('order', 'asc')))
  return snap.docs.map((d) => {
    const data = d.data()
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
    }
  })
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
