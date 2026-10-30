import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, writeBatch, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore'

scenario('member-management', async () => {
  const env = await setup('member-management')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  const ALL = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'emergencia', 'gerenciar-membros']
  const m = (db, uid) => doc(db, 'circles', 'c1', 'members', uid)

  // alice: admin/creator (ALL, count started at 0 like old circles); bob: familiar; carol: observador;
  // tito: titular with account.
  await admin(async (db) => {
    for (const u of ['alice', 'bob', 'carol', 'tito']) await setDoc(doc(db, 'users', u), { name: u, role: 'family', termsVersion: '1.0', circleId: 'c1' })
    await setDoc(doc(db, 'circles', 'c1'), { subject: { name: 'Tito', uid: 'tito' }, createdBy: 'alice', memberCount: 4, emergencyCount: 0 })
    await setDoc(m(db, 'alice'), { name: 'alice', role: 'admin', label: null, permissions: ALL, status: 'ativo', phone: null })
    await setDoc(m(db, 'bob'), { name: 'bob', role: 'familiar', label: null, permissions: ['ver-rotina', 'editar-rotina', 'ver-saude'], status: 'ativo', phone: null })
    await setDoc(m(db, 'carol'), { name: 'carol', role: 'observador', label: null, permissions: ['ver-rotina'], status: 'ativo', phone: null })
    await setDoc(m(db, 'tito'), { name: 'tito', role: 'titular', label: null, permissions: ALL, status: 'ativo', phone: null })
  })
  const ctx = (u) => env.authenticatedContext(u).firestore()
  const a = ctx('alice'), b = ctx('bob'), c = ctx('carol')

  // Mirrors circles.updateMember (absolute emergencyCount recount)
  function updateMember(db, uid, changes, emergencyCount) {
    const batch = writeBatch(db)
    batch.update(m(db, uid), changes)
    batch.update(doc(db, 'circles', 'c1'), { emergencyCount })
    return batch.commit()
  }

  await check('membro cadastra o proprio telefone', true, () => updateDoc(m(b, 'bob'), { phone: '11912345678' }))
  await check('membro nao cadastra telefone de outro', false, () => updateDoc(m(b, 'carol'), { phone: '11900000000' }))
  await check('membro nao muda as proprias permissoes', false, () => updateDoc(m(b, 'bob'), { permissions: ALL }))
  await check('admin torna bob contato de emergencia (recontagem: alice + bob = 2)', true, () =>
    updateMember(a, 'bob', { role: 'familiar', label: 'Filho', permissions: ['ver-rotina', 'editar-rotina', 'ver-saude', 'emergencia'] }, 2))
  await check('admin promove carol a administradora', true, () =>
    updateMember(a, 'carol', { role: 'admin', label: null, permissions: ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros'] }, 2))
  await check('admin nao transforma ninguem em titular', false, () =>
    updateMember(a, 'bob', { role: 'titular', label: null, permissions: ALL }, 2))
  await check('admin nao edita o titular', false, () => updateMember(a, 'tito', { role: 'familiar', label: null, permissions: ['ver-rotina'] }, 2))
  await check('admin nao edita a si mesmo', false, () => updateMember(a, 'alice', { role: 'admin', label: null, permissions: ['ver-rotina'] }, 2))
  await check('contagem acima de 3 e recusada', false, () =>
    updateMember(a, 'bob', { role: 'familiar', label: null, permissions: ['ver-rotina', 'emergencia'] }, 4))
  await check('nao-gerente nao edita membros', false, () => updateMember(b, 'carol', { role: 'observador', label: null, permissions: ['ver-rotina'] }, 2))
  await check('admin nao remove o titular', false, () => {
    const batch = writeBatch(a)
    batch.delete(m(a, 'tito'))
    batch.update(doc(a, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 2 })
    return batch.commit()
  })
  // Mirrors circles.leaveCircle: bob (emergency) leaves, count 2 -> 1
  await check('bob sai do circulo (emergencia 2 -> 1)', true, () => {
    const batch = writeBatch(b)
    batch.delete(m(b, 'bob'))
    batch.update(doc(b, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 1 })
    batch.update(doc(b, 'users', 'bob'), { circleId: null })
    return batch.commit()
  })
  // Mirrors circles.removeMember (recount): carol removed, alice still emergency -> 1
  await check('carol (admin) remove alice? nao: alice e gerente, mas carol pode', true, () => {
    const batch = writeBatch(c)
    batch.delete(m(c, 'alice'))
    batch.update(doc(c, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 0 })
    return batch.commit()
  })
  await check('titular nao sai do circulo', false, () => {
    const t = ctx('tito')
    const batch = writeBatch(t)
    batch.delete(m(t, 'tito'))
    batch.update(doc(t, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 0 })
    batch.update(doc(t, 'users', 'tito'), { circleId: null })
    return batch.commit()
  })
  const circle = await admin(async (db) => (await getDoc(doc(db, 'circles', 'c1'))).data())
  await assertEq('memberCount final = 2 (carol + tito)', circle.memberCount, 2)
  await assertEq('emergencyCount final = 0', circle.emergencyCount, 0)
})
