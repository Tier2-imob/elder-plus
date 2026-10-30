import { assertEq, check, scenario, setup } from './helpers.mjs'
import {
  doc, collection, writeBatch, serverTimestamp, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove,
  deleteField, increment, Timestamp,
} from 'firebase/firestore'

scenario('profiles-and-circles', async () => {
  const env = await setup('profiles-and-circles')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  const FIVE = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros']
  const ctx = (u) => env.authenticatedContext(u).firestore()

  // Mirrors circles.createCircle (new app): person + circle + member + users.circleIds (full list).
  function createCircle(uid, { forSelf, current, name = 'Pessoa', userName = uid }) {
    const db = ctx(uid)
    const circle = doc(collection(db, 'circles'))
    const person = doc(collection(db, 'persons'))
    const subject = { name: forSelf ? userName : name, uid: forSelf ? uid : null }
    const batch = writeBatch(db)
    batch.set(person, { name: subject.name, uid: subject.uid, circleId: circle.id, createdBy: uid, createdAt: serverTimestamp() })
    batch.set(circle, { subject, subjectId: person.id, createdBy: uid, createdAt: serverTimestamp(), memberCount: 1, emergencyCount: 0, consent: { by: uid, at: serverTimestamp(), version: '1.0' } })
    batch.set(doc(db, 'circles', circle.id, 'members', uid), { name: userName, role: forSelf ? 'titular' : 'admin', label: null, permissions: FIVE, status: 'ativo', phone: null, invitedBy: null, inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(db, 'users', uid), { circleIds: [...current, circle.id], circleId: deleteField() })
    return { commit: () => batch.commit(), circleId: circle.id, personId: person.id }
  }

  // ─── Perfis ───
  await check('cadastro com lista de perfis', true, () =>
    setDoc(doc(ctx('ana'), 'users', 'ana'), { name: 'Ana', role: 'family', roles: ['family'], email: 'a@x', createdAt: serverTimestamp(), termsVersion: '1.0', termsAcceptedAt: serverTimestamp() }))
  await check('cadastro com perfil inventado e recusado', false, () =>
    setDoc(doc(ctx('zed'), 'users', 'zed'), { name: 'Z', role: 'family', roles: ['admin'], termsVersion: '1.0', termsAcceptedAt: serverTimestamp() }))
  await check('acrescenta o perfil Idoso', true, () => updateDoc(doc(ctx('ana'), 'users', 'ana'), { roles: arrayUnion('elder') }))
  await check('nao se torna parceiro depois do cadastro', false, () => updateDoc(doc(ctx('ana'), 'users', 'ana'), { roles: arrayUnion('partner') }))
  await check('nao fica sem nenhum perfil', false, () => updateDoc(doc(ctx('ana'), 'users', 'ana'), { roles: [] }))

  // ─── Vários círculos ───
  const c1 = createCircle('ana', { forSelf: true, current: [] })
  await check('ana (idosa) cria o proprio circulo', true, c1.commit)
  const c2 = createCircle('ana', { forSelf: false, current: [c1.circleId], name: 'Pai' })
  await check('ana (familia) cria um 2o circulo para o pai', true, c2.commit)
  const c2b = createCircle('ana', { forSelf: false, current: [c2.circleId], name: 'Mae' })
  await check('lista desatualizada (perde um circulo) e recusada', false, c2b.commit)
  const anaIds = await admin(async (db) => (await getDoc(doc(db, 'users', 'ana'))).data().circleIds)
  await assertEq('ana participa de 2 circulos', anaIds.length, 2)

  await admin(async (db) => setDoc(doc(db, 'users', 'fam'), { name: 'F', role: 'family', roles: ['family'], termsVersion: '1.0' }))
  const self = createCircle('fam', { forSelf: true, current: [] })
  await check('perfil so Familia nao cria circulo "para mim"', false, self.commit)
  await admin(async (db) => setDoc(doc(db, 'users', 'loja'), { name: 'L', role: 'partner', roles: ['partner'], termsVersion: '1.0' }))
  await check('parceiro nao cria circulo', false, createCircle('loja', { forSelf: false, current: [] }).commit)

  await admin(async (db) => setDoc(doc(db, 'users', 'max'), { name: 'M', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [] }))
  let ids = []
  // The product limit (5 ACTIVE circles) is enforced by the app, since inactive ones don't count and the
  // rules can't tell which are inactive; the rules only cap the raw number of circle ids (20).
  for (let i = 1; i <= 20; i++) {
    const c = createCircle('max', { forSelf: false, current: ids, name: `P${i}` })
    await check(`max cria o circulo ${i}`, true, c.commit)
    ids = [...ids, c.circleId]
  }
  await check('o 21o circulo passa do teto de seguranca das regras', false, createCircle('max', { forSelf: false, current: ids, name: 'P21' }).commit)

  // ─── Conta antiga (só circleId) ───
  const legacy = await admin(async (db) => {
    await setDoc(doc(db, 'users', 'old'), { name: 'O', role: 'family', termsVersion: '1.0', circleId: 'oldc' })
    await setDoc(doc(db, 'circles', 'oldc'), { subject: { name: 'X', uid: null }, createdBy: 'old', memberCount: 1, emergencyCount: 0 })
    await setDoc(doc(db, 'circles', 'oldc', 'members', 'old'), { name: 'O', role: 'admin', permissions: FIVE, status: 'ativo' })
  })
  await check('conta antiga cria 2o circulo mantendo o antigo na lista', true, createCircle('old', { forSelf: false, current: ['oldc'], name: 'Yara' }).commit)
  await check('conta antiga sai do circulo antigo', true, () => updateDoc(doc(ctx('old'), 'users', 'old'), { circleIds: arrayRemove('oldc'), circleId: deleteField() }))

  // ─── Convite para um 2o círculo ───
  await admin(async (db) => setDoc(doc(db, 'users', 'bia'), { name: 'Bia', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [c1.circleId] }))
  await admin(async (db) => setDoc(doc(db, 'circles', c1.circleId, 'members', 'bia'), { name: 'Bia', role: 'familiar', permissions: ['ver-rotina'], status: 'ativo' }))
  await check('ana convida para o circulo do pai', true, () =>
    setDoc(doc(ctx('ana'), 'invites', 'ELDER-PAIA-AAAA'), { circleId: c2.circleId, circleName: 'Pai', role: 'familiar', label: null, permissions: ['ver-rotina'], createdBy: 'ana', createdByName: 'Ana', createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 864e5), usedBy: null, usedAt: null, revoked: false }))
  function accept(uid, current, circleId, code) {
    const db = ctx(uid)
    const batch = writeBatch(db)
    batch.set(doc(db, 'circles', circleId, 'members', uid), { name: uid, role: 'familiar', label: null, permissions: ['ver-rotina'], status: 'pendente', phone: null, invitedBy: 'ana', inviteCode: code, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(db, 'invites', code), { usedBy: uid, usedAt: serverTimestamp() })
    batch.update(doc(db, 'users', uid), { circleIds: [...current, circleId], circleId: deleteField() })
    batch.update(doc(db, 'circles', circleId), { memberCount: increment(1) })
    return batch.commit()
  }
  await check('bia (ja em um circulo) aceita convite para o 2o', true, () => accept('bia', [c1.circleId], c2.circleId, 'ELDER-PAIA-AAAA'))

  // ─── persons ───
  await check('membro le a pessoa assistida', true, () => getDoc(doc(ctx('ana'), 'persons', c2.personId)))
  await check('quem nao e do circulo nao le a pessoa', false, () => getDoc(doc(ctx('max'), 'persons', c2.personId)))
  await check('pessoa nao ganha uid sem o vinculo do circulo', false, () => updateDoc(doc(ctx('ana'), 'persons', c2.personId), { uid: 'qualquer' }))
  // The name is one: the person and the circle's subject change together (see person-data.test.mjs).
  await check('gerente renomeia a pessoa (e o circulo, juntos)', true, () => {
    const db = ctx('ana')
    const batch = writeBatch(db)
    batch.update(doc(db, 'persons', c2.personId), { name: 'Seu Joao' })
    batch.update(doc(db, 'circles', c2.circleId), { 'subject.name': 'Seu Joao' })
    return batch.commit()
  })
  await check('pessoa nao e criada solta (sem circulo novo)', false, () =>
    setDoc(doc(ctx('ana'), 'persons', 'solta'), { name: 'X', uid: null, circleId: c2.circleId, createdBy: 'ana', createdAt: serverTimestamp() }))
})
