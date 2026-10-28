import { FieldValue } from 'firebase-admin/firestore'

export const id = '003-persons-from-circles'
export const description = 'circles: a pessoa assistida (subject) vira a entidade persons/{id}'

/**
 * Each circle without `subjectId` gets a persons/{id} doc (name and linked account from its
 * `subject`) and points to it. Person and circle are written in the same batch.
 */
export async function up(db, { dryRun }) {
  const snap = await db.collection('circles').get()
  const pending = snap.docs.filter((d) => typeof d.data().subjectId !== 'string')
  if (!dryRun) {
    for (const circle of pending) {
      const data = circle.data()
      const person = db.collection('persons').doc()
      const batch = db.batch()
      batch.set(person, {
        name: data.subject?.name ?? '',
        uid: data.subject?.uid ?? null,
        circleId: circle.id,
        createdBy: data.createdBy ?? null,
        createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
      })
      batch.update(circle.ref, { subjectId: person.id })
      await batch.commit()
    }
  }
  return pending.length
}
