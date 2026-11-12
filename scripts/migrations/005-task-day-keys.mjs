import { dayLabel, LEGACY_DAY_KEYS, weekDays } from '../../src/services/week.ts'

export const id = '005-task-day-keys'
export const description = 'tarefas com dia da semana fixo (mon…sun) passam a ter a data real (AAAA-MM-DD) da semana atual'

/**
 * The app used to show a fixed week and saved each task's day as 'mon'…'sun'. Now the day is the
 * calendar date, so every such task moves to that weekday of the week this migration runs in (the
 * week the old app was showing as "the" week), with the readable `day` label rewritten to match.
 * Tasks that already carry a date are left alone, so it is safe to run again.
 */
export async function up(db, { dryRun }) {
  const week = weekDays(new Date())
  let changed = 0

  // Tasks of every circle (circles/{id}/tasks); the legacy users/{uid}/tasks were moved by 004.
  const snap = await db.collectionGroup('tasks').get()
  const legacy = snap.docs.filter(
    (d) => d.ref.path.startsWith('circles/') && LEGACY_DAY_KEYS[d.data().dayKey] !== undefined
  )
  changed = legacy.length
  if (dryRun) return changed

  for (let i = 0; i < legacy.length; i += 400) {
    const batch = db.batch()
    for (const task of legacy.slice(i, i + 400)) {
      const key = week[LEGACY_DAY_KEYS[task.data().dayKey]].key
      batch.update(task.ref, { dayKey: key, day: dayLabel(key) })
    }
    await batch.commit()
  }
  return changed
}
