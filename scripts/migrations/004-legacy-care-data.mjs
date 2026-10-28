export const id = '004-legacy-care-data'
export const description = 'dados de cuidado anteriores ao círculo (users/{uid}/...) vão para o círculo criado pelo usuário'

const COLLECTIONS = ['tasks', 'medications', 'medicationDoses']

/**
 * Tasks, medications and doses still under users/{uid}/ move into the first circle that user
 * created (same ids and data; set + delete in the same batch). Users without a circle of their own
 * keep their data — the app moves it when they create one (legacy-migration.ts).
 */
export async function up(db, { dryRun }) {
  const createdBy = new Map()
  for (const circle of (await db.collection('circles').get()).docs) {
    const owner = circle.data().createdBy
    if (owner && !createdBy.has(owner)) createdBy.set(owner, circle.id)
  }

  let moved = 0
  for (const user of (await db.collection('users').get()).docs) {
    const circleId = createdBy.get(user.id)
    if (!circleId) continue
    for (const name of COLLECTIONS) {
      const docs = (await user.ref.collection(name).get()).docs
      moved += docs.length
      if (dryRun) continue
      for (let i = 0; i < docs.length; i += 200) {
        const batch = db.batch()
        for (const legacy of docs.slice(i, i + 200)) {
          batch.set(db.collection('circles').doc(circleId).collection(name).doc(legacy.id), legacy.data())
          batch.delete(legacy.ref)
        }
        await batch.commit()
      }
    }
  }
  return moved
}
