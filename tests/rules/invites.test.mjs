import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDoc, getDocs, query, where, updateDoc, increment, Timestamp } from 'firebase/firestore'

scenario('invites', async () => {
  const env = await setup('invites')
  const ALL = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'emergencia', 'gerenciar-membros']
  // withSecurityRulesDisabled resolves to void, so carry the callback's result out explicitly.
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }

  await admin(async (db) => {
    for (const [u, role] of [['alice', 'family'], ['bob', 'family'], ['dan', 'family'], ['pat', 'partner'], ['eve', 'family']]) {
      await setDoc(doc(db, 'users', u), { name: u, role, termsVersion: '1.0' })
    }
    await setDoc(doc(db, 'circles', 'c1'), { subject: { name: 'Dona Maria', uid: null }, createdBy: 'alice', memberCount: 1, emergencyCount: 0 })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'alice'), { name: 'alice', role: 'admin', permissions: ALL, status: 'ativo' })
    await updateDoc(doc(db, 'users', 'alice'), { circleId: 'c1' })
    await setDoc(doc(db, 'circles', 'c1', 'tasks', 't1'), { title: 'x', order: 0 })
    await setDoc(doc(db, 'invites', 'ELDER-OLD1-OLD1'), {
      circleId: 'c1', circleName: 'Dona Maria', role: 'familiar', label: null, permissions: ['ver-rotina'],
      createdBy: 'alice', createdByName: 'alice', expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      usedBy: null, usedAt: null, revoked: false,
    })
  })
  const ctx = (u) => env.authenticatedContext(u).firestore()
  const a = ctx('alice'), b = ctx('bob'), d = ctx('dan'), p = ctx('pat'), e = ctx('eve')

  const inviteData = (perms, role = 'familiar') => ({
    circleId: 'c1', circleName: 'Dona Maria', role, label: 'Filho', permissions: perms, createdBy: 'alice',
    createdByName: 'alice', createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 7 * 864e5),
    usedBy: null, usedAt: null, revoked: false,
  })
  const readInvite = (code) => admin(async (db) => (await getDoc(doc(db, 'invites', code))).data())

  // Mirrors circles.acceptInvite
  function accept(db, uid, code, inv) {
    const batch = writeBatch(db)
    batch.set(doc(db, 'circles', 'c1', 'members', uid), {
      name: uid, role: inv.role, label: inv.label, permissions: inv.permissions, status: 'pendente', phone: null,
      invitedBy: inv.createdBy, inviteCode: code, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(),
      consent: { at: serverTimestamp(), version: '1.0' },
    })
    batch.update(doc(db, 'invites', code), { usedBy: uid, usedAt: serverTimestamp() })
    batch.update(doc(db, 'users', uid), { circleId: 'c1' })
    batch.update(doc(db, 'circles', 'c1'), { memberCount: increment(1) })
    return batch.commit()
  }
  const fam = ['ver-rotina', 'editar-rotina', 'ver-saude']

  await check('admin gera convite', true, () => setDoc(doc(a, 'invites', 'ELDER-AAAA-BBBB'), inviteData(fam)))
  await check('nao-membro nao gera convite', false, () => setDoc(doc(b, 'invites', 'ELDER-XXXX-YYYY'), { ...inviteData(fam), createdBy: 'bob' }))
  await check('codigo fora do formato e recusado', false, () => setDoc(doc(a, 'invites', 'abc'), inviteData(fam)))
  await check('convidado consulta o convite pelo codigo', true, () => getDoc(doc(b, 'invites', 'ELDER-AAAA-BBBB')))
  await check('convidado nao lista convites', false, () => getDocs(query(collection(b, 'invites'), where('circleId', '==', 'c1'))))
  await check('admin lista convites do circulo', true, () => getDocs(query(collection(a, 'invites'), where('circleId', '==', 'c1'))))
  const inv = await readInvite('ELDER-AAAA-BBBB')
  await check('convidado nao aceita com permissoes a mais', false, () => accept(b, 'bob', 'ELDER-AAAA-BBBB', { ...inv, permissions: ALL }))
  await check('convidado aceita (entra pendente)', true, () => accept(b, 'bob', 'ELDER-AAAA-BBBB', inv))
  await check('convite nao pode ser reutilizado', false, () => accept(d, 'dan', 'ELDER-AAAA-BBBB', inv))
  await check('pendente le o circulo (tela de espera)', true, () => getDoc(doc(b, 'circles', 'c1')))
  await check('pendente nao le as tarefas', false, () => getDocs(collection(b, 'circles', 'c1', 'tasks')))
  await check('pendente nao se aprova', false, () => updateDoc(doc(b, 'circles', 'c1', 'members', 'bob'), { status: 'ativo' }))
  await check('admin aprova', true, () => updateDoc(doc(a, 'circles', 'c1', 'members', 'bob'), { status: 'ativo' }))
  await check('aprovado le as tarefas', true, () => getDocs(collection(b, 'circles', 'c1', 'tasks')))
  await check('convite expirado nao e aceito', false, () =>
    accept(e, 'eve', 'ELDER-OLD1-OLD1', { role: 'familiar', label: null, permissions: ['ver-rotina'], createdBy: 'alice' }))

  await check('admin gera 2o convite', true, () => setDoc(doc(a, 'invites', 'ELDER-CCCC-DDDD'), inviteData(['ver-rotina'], 'observador')))
  await check('admin cancela convite', true, () => updateDoc(doc(a, 'invites', 'ELDER-CCCC-DDDD'), { revoked: true }))
  const inv2 = await readInvite('ELDER-CCCC-DDDD')
  await check('convite cancelado nao e aceito', false, () => accept(d, 'dan', 'ELDER-CCCC-DDDD', inv2))

  await check('admin gera 3o convite', true, () => setDoc(doc(a, 'invites', 'ELDER-EEEE-FFFF'), inviteData(['ver-rotina'], 'observador')))
  const inv3 = await readInvite('ELDER-EEEE-FFFF')
  await check('conta parceiro nao aceita convite', false, () => accept(p, 'pat', 'ELDER-EEEE-FFFF', inv3))
  await check('dan aceita o 3o convite', true, () => accept(d, 'dan', 'ELDER-EEEE-FFFF', inv3))
  // Mirrors circles.leaveCircle (cancelPending)
  await check('pendente cancela o proprio pedido', true, () => {
    const batch = writeBatch(d)
    batch.delete(doc(d, 'circles', 'c1', 'members', 'dan'))
    batch.update(doc(d, 'circles', 'c1'), { memberCount: increment(-1) })
    batch.update(doc(d, 'users', 'dan'), { circleId: null })
    return batch.commit()
  })

  await check('admin gera 4o convite', true, () => setDoc(doc(a, 'invites', 'ELDER-GGGG-HHHH'), inviteData(['ver-rotina'], 'observador')))
  const inv4 = await readInvite('ELDER-GGGG-HHHH')
  await check('eve aceita o 4o convite', true, () => accept(e, 'eve', 'ELDER-GGGG-HHHH', inv4))
  // Mirrors circles.removeMember (reject)
  await check('admin recusa eve', true, () => {
    const batch = writeBatch(a)
    batch.delete(doc(a, 'circles', 'c1', 'members', 'eve'))
    batch.update(doc(a, 'circles', 'c1'), { memberCount: increment(-1) })
    return batch.commit()
  })
  await check('eve limpa o vinculo orfao', true, () => updateDoc(doc(e, 'users', 'eve'), { circleId: null }))
  const final = await admin(async (db) => (await getDoc(doc(db, 'circles', 'c1'))).data().memberCount)
  await assertEq('memberCount final = 2 (alice + bob)', final, 2)
})
