import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDoc, getDocs, updateDoc, increment, Timestamp } from 'firebase/firestore'

scenario('titular-link', async () => {
  const env = await setup('titular-link')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  // New app: creator and titular get every permission except emergencia.
  const FIVE = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros']
  const ctx = (u) => env.authenticatedContext(u).firestore()
  const m = (db, c, uid) => doc(db, 'circles', c, 'members', uid)

  await admin(async (db) => {
    await setDoc(doc(db, 'users', 'filha'), { name: 'Ana', role: 'family', termsVersion: '1.0' })
    await setDoc(doc(db, 'users', 'mae'), { name: 'Dona Maria', role: 'elder', termsVersion: '1.0' })
    await setDoc(doc(db, 'users', 'impostor'), { name: 'Outra', role: 'elder', termsVersion: '1.0' })
  })
  const filha = ctx('filha'), mae = ctx('mae'), impostor = ctx('impostor')

  // 1. Filha creates the circle with a nominal titular (mirrors createCircle, new app).
  let cid
  await check('filha cria o circulo (titular nominal)', true, () => {
    const ref = doc(collection(filha, 'circles')); cid = ref.id
    const batch = writeBatch(filha)
    batch.set(ref, { subject: { name: 'Dona Maria', uid: null }, createdBy: 'filha', createdAt: serverTimestamp(), memberCount: 1, emergencyCount: 0, consent: { by: 'filha', at: serverTimestamp(), version: '1.0' } })
    batch.set(m(filha, ref.id, 'filha'), { name: 'Ana', role: 'admin', label: null, permissions: FIVE, status: 'ativo', phone: null, invitedBy: null, inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(filha, 'users', 'filha'), { circleId: ref.id })
    return batch.commit()
  })

  // 2. Titular invite (mirrors createInvite: role titular, permissions = all but emergencia).
  const titularInvite = (code) => ({ circleId: cid, circleName: 'Dona Maria', role: 'titular', label: null, permissions: FIVE, createdBy: 'filha', createdByName: 'Ana', createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 7 * 864e5), usedBy: null, usedAt: null, revoked: false })
  await check('filha gera convite de titular', true, () => setDoc(doc(filha, 'invites', 'ELDER-TTTT-1111'), titularInvite('ELDER-TTTT-1111')))
  await check('filha gera 2o convite de titular (regra permite enquanto nominal)', true, () => setDoc(doc(filha, 'invites', 'ELDER-TTTT-2222'), titularInvite('ELDER-TTTT-2222')))

  function accept(db, uid, code) {
    const batch = writeBatch(db)
    batch.set(m(db, cid, uid), { name: uid, role: 'titular', label: null, permissions: FIVE, status: 'pendente', phone: null, invitedBy: 'filha', inviteCode: code, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(db, 'invites', code), { usedBy: uid, usedAt: serverTimestamp() })
    batch.update(doc(db, 'users', uid), { circleId: cid })
    batch.update(doc(db, 'circles', cid), { memberCount: increment(1) })
    return batch.commit()
  }
  await check('mae aceita o convite de titular (pendente)', true, () => accept(mae, 'mae', 'ELDER-TTTT-1111'))
  await check('outra pessoa aceita o 2o convite de titular (pendente)', true, () => accept(impostor, 'impostor', 'ELDER-TTTT-2222'))
  await check('titular pendente nao cancela o proprio pedido', false, () => {
    const batch = writeBatch(mae)
    batch.delete(m(mae, cid, 'mae'))
    batch.update(doc(mae, 'circles', cid), { memberCount: increment(-1), emergencyCount: 0 })
    batch.update(doc(mae, 'users', 'mae'), { circleId: null })
    return batch.commit()
  })

  // 3. Approval links the account (mirrors approveMember for role titular).
  function approveTitular(uid) {
    const batch = writeBatch(filha)
    batch.update(m(filha, cid, uid), { status: 'ativo' })
    batch.update(doc(filha, 'circles', cid), { 'subject.uid': uid })
    return batch.commit()
  }
  await check('filha aprova a mae: conta vinculada como titular', true, () => approveTitular('mae'))
  const linked = await admin(async (db) => (await getDoc(doc(db, 'circles', cid))).data().subject)
  await assertEq('conta vinculada como titular depois da aprovacao', linked.uid, 'mae')
  await check('segundo titular nao pode ser aprovado', false, () => approveTitular('impostor'))
  await check('filha recusa o segundo titular', true, () => {
    const batch = writeBatch(filha)
    batch.delete(m(filha, cid, 'impostor'))
    batch.update(doc(filha, 'circles', cid), { memberCount: increment(-1), emergencyCount: 0 })
    return batch.commit()
  })
  await check('novo convite de titular e recusado depois do vinculo', false, () => setDoc(doc(filha, 'invites', 'ELDER-TTTT-3333'), titularInvite('ELDER-TTTT-3333')))

  // 4. The linked titular.
  await check('titular le a rotina e a saude', true, async () => {
    await getDocs(collection(mae, 'circles', cid, 'tasks'))
    await getDocs(collection(mae, 'circles', cid, 'medications'))
  })
  await check('titular gerencia: gera convite comum', true, () => setDoc(doc(mae, 'invites', 'ELDER-MMMM-1111'), { ...titularInvite('x'), role: 'familiar', permissions: ['ver-rotina'], createdBy: 'mae', createdByName: 'Dona Maria' }))
  await check('filha nao edita o titular', false, () => updateDoc(m(filha, cid, 'mae'), { permissions: ['ver-rotina'] }))
  await check('filha nao remove o titular', false, () => {
    const batch = writeBatch(filha)
    batch.delete(m(filha, cid, 'mae'))
    batch.update(doc(filha, 'circles', cid), { memberCount: increment(-1), emergencyCount: 0 })
    return batch.commit()
  })
  await check('titular nao sai do circulo', false, () => {
    const batch = writeBatch(mae)
    batch.delete(m(mae, cid, 'mae'))
    batch.update(doc(mae, 'circles', cid), { memberCount: increment(-1), emergencyCount: 0 })
    batch.update(doc(mae, 'users', 'mae'), { circleId: null })
    return batch.commit()
  })
  await check('filha nao troca o titular vinculado', false, () => updateDoc(doc(filha, 'circles', cid), { 'subject.uid': 'filha' }))
  const final = await admin(async (db) => (await getDoc(doc(db, 'circles', cid))).data())
  await assertEq('memberCount final = 2 (filha + mae)', final.memberCount, 2)
  await assertEq('subject.uid final = mae', final.subject.uid, 'mae')
})
