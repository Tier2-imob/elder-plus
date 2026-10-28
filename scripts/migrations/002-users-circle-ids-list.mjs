import { FieldValue } from 'firebase-admin/firestore'

export const id = '002-users-circle-ids-list'
export const description = 'users: círculo único (circleId) vira lista de círculos (circleIds)'

/**
 * users/{uid} with the single `circleId` get `circleIds: [circleId]` (or [] when it was null) and
 * lose `circleId`. Accounts that already have `circleIds` only drop a leftover `circleId`.
 */
export async function up(db, { dryRun }) {
  const snap = await db.collection('users').get()
  const pending = snap.docs.filter((d) => 'circleId' in d.data())
  if (!dryRun) {
    for (let i = 0; i < pending.length; i += 400) {
      const batch = db.batch()
      for (const d of pending.slice(i, i + 400)) {
        const data = d.data()
        const ids = Array.isArray(data.circleIds)
          ? data.circleIds
          : typeof data.circleId === 'string'
            ? [data.circleId]
            : []
        batch.update(d.ref, { circleIds: ids, circleId: FieldValue.delete() })
      }
      await batch.commit()
    }
  }
  return pending.length
}
