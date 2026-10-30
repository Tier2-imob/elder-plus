import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, setDoc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'

scenario('delete-circle', async () => {
  const env = await setup('delete-circle')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  const ALL = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'emergencia', 'gerenciar-membros']

  async function seed(cid, owner, ownerRole, subjectUid) {
    await admin(async (db) => {
      await setDoc(doc(db, 'users', owner), { name: owner, role: ownerRole === 'titular' ? 'elder' : 'family', termsVersion: '1.0', circleId: cid })
      await setDoc(doc(db, 'users', `${cid}-pend`), { name: 'p', role: 'family', termsVersion: '1.0', circleId: cid })
      await setDoc(doc(db, 'circles', cid), { subject: { name: 'X', uid: subjectUid }, createdBy: owner, memberCount: 2, emergencyCount: 0 })
      // Old-app creator (with emergencia) on purpose.
      await setDoc(doc(db, 'circles', cid, 'members', owner), { name: owner, role: ownerRole, permissions: ALL, status: 'ativo' })
      await setDoc(doc(db, 'circles', cid, 'members', `${cid}-pend`), { name: 'p', role: 'familiar', permissions: ['ver-rotina'], status: 'pendente' })
      await setDoc(doc(db, 'circles', cid, 'tasks', 't1'), { title: 'x', order: 0 })
      await setDoc(doc(db, 'circles', cid, 'medications', 'm1'), { name: 'Losartana' })
      await setDoc(doc(db, 'circles', cid, 'medicationDoses', 'm1_d'), { medicationId: 'm1', date: '2026-10-23' })
      await setDoc(doc(db, 'invites', `ELDER-${cid.toUpperCase()}A-AAAA`), { circleId: cid, role: 'familiar', permissions: ['ver-rotina'], createdBy: owner, expiresAt: Timestamp.fromMillis(Date.now() + 864e5), usedBy: null, revoked: false })
    })
  }

  // Mirrors circles.dissolveCircle
  async function dissolve(db, cid, me, meRole) {
    for (const name of ['tasks', 'medications', 'medicationDoses']) {
      const snap = await getDocs(collection(db, 'circles', cid, name))
      const batch = writeBatch(db)
      snap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
    const invites = await getDocs(query(collection(db, 'invites'), where('circleId', '==', cid)))
    const members = await getDocs(collection(db, 'circles', cid, 'members'))
    const batch = writeBatch(db)
    invites.docs.filter((d) => !d.data().usedBy && !d.data().revoked).forEach((d) => batch.update(d.ref, { revoked: true }))
    members.docs.filter((d) => d.id !== me).forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, 'circles', cid))
    if (meRole !== 'titular') batch.delete(doc(db, 'circles', cid, 'members', me))
    batch.update(doc(db, 'users', me), { circleId: null })
    await batch.commit()
  }

  async function leftovers(cid, me) {
    return admin(async (db) => {
      const count = async (name) => (await getDocs(collection(db, 'circles', cid, name))).size
      return {
        circulo: (await getDoc(doc(db, 'circles', cid))).exists(),
        tarefas: await count('tasks'),
        medicamentos: await count('medications'),
        doses: await count('medicationDoses'),
        membros: await count('members'),
        circleIdDoUsuario: (await getDoc(doc(db, 'users', me))).data().circleId,
        conviteRevogado: (await getDocs(query(collection(db, 'invites'), where('circleId', '==', cid)))).docs[0].data().revoked,
      }
    })
  }

  await seed('fam', 'ana', 'admin', null)
  await check('criador family (titular nominal) sai e exclui o circulo', () => dissolve(env.authenticatedContext('ana').firestore(), 'fam', 'ana', 'admin'))
  await assertEq('family: circulo e dados apagados, convite revogado', await leftovers('fam', 'ana'), { circulo: false, tarefas: 0, medicamentos: 0, doses: 0, membros: 0, circleIdDoUsuario: null, conviteRevogado: true })

  await seed('eld', 'maria', 'titular', 'maria')
  await check('criador elder (titular) sai e exclui o circulo', () => dissolve(env.authenticatedContext('maria').firestore(), 'eld', 'maria', 'titular'))
  // membros: 1 — the titular's own member doc stays (the rules keep it), harmless once the circle is gone.
  await assertEq('elder: circulo e dados apagados, convite revogado', await leftovers('eld', 'maria'), { circulo: false, tarefas: 0, medicamentos: 0, doses: 0, membros: 1, circleIdDoUsuario: null, conviteRevogado: true })
})
