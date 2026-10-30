import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore'

scenario('circle-creator-permissions', async () => {
  const env = await setup('circle-creator-permissions')
  const FIVE = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros']
  await env.withSecurityRulesDisabled(async (c) => {
    for (const u of ['u1', 'u2', 'u3']) await setDoc(doc(c.firestore(), 'users', u), { name: u, role: 'family', termsVersion: '1.0' })
  })
  function create(uid, permissions) {
    const db = env.authenticatedContext(uid).firestore()
    const ref = doc(collection(db, 'circles'))
    const batch = writeBatch(db)
    batch.set(ref, { subject: { name: 'X', uid: null }, createdBy: uid, createdAt: serverTimestamp(), memberCount: 1, emergencyCount: 0, consent: { by: uid, at: serverTimestamp(), version: '1.0' } })
    batch.set(doc(db, 'circles', ref.id, 'members', uid), { name: uid, role: 'admin', label: null, permissions, status: 'ativo', phone: null, invitedBy: null, inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(db, 'users', uid), { circleId: ref.id })
    return batch.commit()
  }
  await check('cria circulo sem emergencia (app novo)', true, () => create('u1', FIVE))
  await check('cria circulo com emergencia (app antigo)', true, () => create('u2', [...FIVE, 'emergencia']))
  await check('nao cria com permissoes faltando', false, () => create('u3', ['ver-rotina']))
  await check('nao cria com permissao inventada', false, () => create('u3', [...FIVE, 'superpoder']))
})
