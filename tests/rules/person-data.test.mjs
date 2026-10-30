// The assisted person's data: name, birth date ("YYYY-MM-DD") and phone (digits) are optional except
// the name; only a manager of an active circle edits them; the name is the same on the person and on
// the circle's subject. The writes mirror createCircle / updatePerson in src/services/firebase/circles.ts.
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

import { check, scenario, setup } from './helpers.mjs'

scenario('person-data', async () => {
  const env = await setup('person-data')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  const FIVE = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros']

  await admin(async (db) => {
    for (const u of ['ana', 'bia', 'zed', 'eve']) {
      await setDoc(doc(db, 'users', u), { name: u, role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: u === 'ana' || u === 'bia' ? ['c1'] : [] })
    }
    await setDoc(doc(db, 'circles', 'c1'), { subject: { name: 'Dona Maria', uid: null }, subjectId: 'p1', createdBy: 'ana', memberCount: 2, emergencyCount: 0 })
    await setDoc(doc(db, 'persons', 'p1'), { name: 'Dona Maria', uid: null, birthDate: null, phone: null, circleId: 'c1', createdBy: 'ana' })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'ana'), { name: 'ana', role: 'admin', permissions: FIVE, status: 'ativo' })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'bia'), { name: 'bia', role: 'familiar', permissions: ['ver-rotina', 'editar-rotina'], status: 'ativo' })
  })
  const as = (uid) => env.authenticatedContext(uid).firestore()
  const [ana, bia, zed, eve] = ['ana', 'bia', 'zed', 'eve'].map(as)

  // Same writes as createCircle for someone else's circle (family profile).
  const createCircle = (db, uid, { name = 'Seu João', birthDate = null, phone = null } = {}) => {
    const circle = doc(collection(db, 'circles'))
    const person = doc(collection(db, 'persons'))
    const batch = writeBatch(db)
    batch.set(person, { name, uid: null, birthDate, phone, circleId: circle.id, createdBy: uid, createdAt: serverTimestamp() })
    batch.set(circle, {
      subject: { name, uid: null }, subjectId: person.id, createdBy: uid, createdAt: serverTimestamp(),
      memberCount: 1, emergencyCount: 0, consent: { by: uid, at: serverTimestamp(), version: '1.0' },
    })
    batch.set(doc(db, 'circles', circle.id, 'members', uid), {
      name: uid, role: 'admin', label: null, permissions: FIVE, status: 'ativo', phone: null, invitedBy: null,
      inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' },
    })
    batch.update(doc(db, 'users', uid), { circleIds: [circle.id] })
    return batch.commit()
  }

  // Same writes as updatePerson: the person, and the circle's subject name when it changed.
  const updatePerson = (db, { name, birthDate, phone }, renameCircle) => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'persons', 'p1'), { name, birthDate, phone })
    if (renameCircle) batch.update(doc(db, 'circles', 'c1'), { 'subject.name': name })
    return batch.commit()
  }

  // ─── Cadastrar: só o nome basta; nascimento e telefone são opcionais ───
  await check('cadastro so com o nome', true, () => createCircle(eve, 'eve', { name: 'Seu João' }))
  await admin(async (db) => setDoc(doc(db, 'users', 'eve'), { name: 'eve', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [] }))
  await check('cadastro com nome e data de nascimento', true, () => createCircle(eve, 'eve', { name: 'Seu João', birthDate: '1948-03-15' }))
  await admin(async (db) => setDoc(doc(db, 'users', 'eve'), { name: 'eve', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [] }))
  await check('cadastro com nome, nascimento e telefone', true, () => createCircle(eve, 'eve', { name: 'Seu João', birthDate: '1948-03-15', phone: '11912345678' }))
  await admin(async (db) => setDoc(doc(db, 'users', 'eve'), { name: 'eve', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [] }))
  await check('cadastro com telefone fixo (10 digitos)', true, () => createCircle(eve, 'eve', { name: 'Seu João', phone: '1131234567' }))
  await admin(async (db) => setDoc(doc(db, 'users', 'eve'), { name: 'eve', role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: [] }))
  await check('cadastro com telefone invalido e recusado', false, () => createCircle(eve, 'eve', { phone: '123' }))
  await check('cadastro com telefone mascarado e recusado (so digitos)', false, () => createCircle(eve, 'eve', { phone: '(11) 91234-5678' }))
  await check('cadastro com data fora do formato e recusado', false, () => createCircle(eve, 'eve', { birthDate: '15/03/1948' }))
  await check('cadastro com nome de 1 letra e recusado', false, () => createCircle(eve, 'eve', { name: 'J' }))

  // ─── Editar: quem gerencia ───
  await check('quem gerencia salva nascimento e telefone', true, () =>
    updatePerson(ana, { name: 'Dona Maria', birthDate: '1948-03-15', phone: '11912345678' }, false))
  const saved = await admin(async (db) => (await getDoc(doc(db, 'persons', 'p1'))).data())
  await check('os dados ficam gravados (o formulario reabre preenchido)', true, async () => {
    if (saved.birthDate !== '1948-03-15' || saved.phone !== '11912345678') throw new Error(JSON.stringify(saved))
  })
  await check('quem gerencia apaga nascimento e telefone', true, () =>
    updatePerson(ana, { name: 'Dona Maria', birthDate: null, phone: null }, false))
  await check('quem gerencia renomeia a pessoa e o circulo juntos', true, () =>
    updatePerson(ana, { name: 'Dona Maria Silva', birthDate: null, phone: null }, true))

  // ─── O nome e um so ───
  await check('renomear so a pessoa (sem o circulo) e recusado', false, () =>
    updatePerson(ana, { name: 'Outro Nome', birthDate: null, phone: null }, false))
  await check('renomear so o circulo (sem a pessoa) e recusado', false, () =>
    updateDoc(doc(ana, 'circles', 'c1'), { 'subject.name': 'Outro Nome' }))

  // ─── Formato ───
  await check('editar com telefone invalido e recusado', false, () =>
    updatePerson(ana, { name: 'Dona Maria Silva', birthDate: null, phone: '123' }, false))
  await check('editar com data fora do formato e recusado', false, () =>
    updatePerson(ana, { name: 'Dona Maria Silva', birthDate: 'ontem', phone: null }, false))
  await check('editar com nome vazio e recusado', false, () =>
    updatePerson(ana, { name: ' ', birthDate: null, phone: null }, true))
  await check('campo desconhecido na pessoa e recusado', false, () =>
    updateDoc(doc(ana, 'persons', 'p1'), { documento: '123' }))

  // ─── Quem pode ───
  await check('membro sem gerenciar nao edita os dados', false, () =>
    updatePerson(bia, { name: 'Dona Maria Silva', birthDate: '1948-03-15', phone: null }, false))
  await check('quem nao e do circulo nao edita os dados', false, () =>
    updatePerson(zed, { name: 'Dona Maria Silva', birthDate: '1948-03-15', phone: null }, false))
  await check('membro le os dados da pessoa', true, () => getDoc(doc(bia, 'persons', 'p1')))
  await check('quem nao e do circulo nao le os dados da pessoa', false, () => getDoc(doc(zed, 'persons', 'p1')))

  // ─── Circulo inativo: somente leitura ───
  await admin(async (db) => updateDoc(doc(db, 'circles', 'c1'), { status: 'inativo' }))
  await check('circulo inativo: ninguem edita os dados da pessoa', false, () =>
    updatePerson(ana, { name: 'Dona Maria Silva', birthDate: '1948-03-15', phone: null }, false))
  await admin(async (db) => updateDoc(doc(db, 'circles', 'c1'), { status: 'ativo' }))
  await check('reativado: quem gerencia volta a editar', true, () =>
    updatePerson(ana, { name: 'Dona Maria Silva', birthDate: '1948-03-15', phone: null }, false))
})
