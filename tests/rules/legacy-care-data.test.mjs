import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDocs, query, orderBy, where, updateDoc } from 'firebase/firestore'

scenario('legacy-care-data', async () => {
  const env = await setup('legacy-care-data')
  const ALL = ['ver-rotina','editar-rotina','ver-saude','editar-saude','emergencia','gerenciar-membros']
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore()
    await setDoc(doc(db, 'users', 'alice'), { name: 'Alice', role: 'family', termsVersion: '1.0' })
    await setDoc(doc(db, 'users', 'carol'), { name: 'Carol', role: 'family', termsVersion: '1.0' })
    await setDoc(doc(db, 'users', 'alice', 'tasks', 't1'), { title: 'Consulta', order: 0, done: false, dayKey: 'wed', time: '09:30', day: 'Quarta', icon: 'event-note' })
    await setDoc(doc(db, 'users', 'alice', 'medications', 'm1'), { name: 'Losartana', stock: 10, times: ['08:00'], createdAt: new Date() })
    await setDoc(doc(db, 'users', 'alice', 'medicationDoses', 'm1_2026-10-23_0800'), { medicationId: 'm1', date: '2026-10-23', time: '08:00', state: 'tomou', stockDecremented: true })
    // Carol: active member with only ver-rotina (observador)
    await setDoc(doc(db, 'circles', 'c1'), { subject: { name: 'Dona Maria', uid: null }, createdBy: 'alice', memberCount: 2, emergencyCount: 0 })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'alice'), { name: 'Alice', role: 'admin', permissions: ALL, status: 'ativo' })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'carol'), { name: 'Carol', role: 'observador', permissions: ['ver-rotina'], status: 'ativo' })
    await updateDoc(doc(db, 'users', 'alice'), { circleId: 'c1' })
  })
  const a = env.authenticatedContext('alice').firestore()
  const c = env.authenticatedContext('carol').firestore()
  const out = env.authenticatedContext('mallory').firestore()

  // Mirrors migrateLegacyCareData
  await check('criador move os dados antigos para o círculo', true, async () => {
    for (const name of ['tasks', 'medications', 'medicationDoses']) {
      const snap = await getDocs(collection(a, 'users', 'alice', name))
      const batch = writeBatch(a)
      for (const legacy of snap.docs) { batch.set(doc(a, 'circles', 'c1', name, legacy.id), legacy.data()); batch.delete(legacy.ref) }
      await batch.commit()
    }
  })
  const counts = {}
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    for (const name of ['tasks', 'medications', 'medicationDoses']) {
      counts[name] = [(await getDocs(collection(db, 'users', 'alice', name))).size, (await getDocs(collection(db, 'circles', 'c1', name))).size]
    }
  })
  await assertEq('depois da migracao: nada sobra no local antigo, tudo esta no circulo', counts, { tasks: [0, 1], medications: [0, 1], medicationDoses: [0, 1] })
  await check('admin lista tarefas do círculo', true, () => getDocs(query(collection(a, 'circles', 'c1', 'tasks'), orderBy('order', 'asc'))))
  await check('admin lista medicamentos e doses', true, async () => { await getDocs(query(collection(a, 'circles', 'c1', 'medications'), orderBy('createdAt', 'asc'))); await getDocs(query(collection(a, 'circles', 'c1', 'medicationDoses'), where('date', '>=', '2026-10-17'))) })
  await check('admin conclui tarefa', true, () => updateDoc(doc(a, 'circles', 'c1', 'tasks', 't1'), { done: true }))
  await check('observador lê a rotina', true, () => getDocs(query(collection(c, 'circles', 'c1', 'tasks'), orderBy('order', 'asc'))))
  await check('observador não edita a rotina', false, () => updateDoc(doc(c, 'circles', 'c1', 'tasks', 't1'), { done: false }))
  await check('observador não lê a saúde', false, () => getDocs(collection(c, 'circles', 'c1', 'medications')))
  await check('quem não é do círculo não lê tarefas', false, () => getDocs(collection(out, 'circles', 'c1', 'tasks')))
})
