export const id = '001-users-roles-list'
export const description = 'users: perfil único (role) vira lista de perfis (roles)'

/** users/{uid} without `roles` get `roles: [role]` (default 'family', as the app reads it). */
export async function up(db, { dryRun }) {
  const snap = await db.collection('users').get()
  const pending = snap.docs.filter((d) => !Array.isArray(d.data().roles))
  if (!dryRun) {
    for (let i = 0; i < pending.length; i += 400) {
      const batch = db.batch()
      for (const d of pending.slice(i, i + 400)) {
        const role = ['elder', 'family', 'partner'].includes(d.data().role) ? d.data().role : 'family'
        batch.update(d.ref, { roles: [role] })
      }
      await batch.commit()
    }
  }
  return pending.length
}
