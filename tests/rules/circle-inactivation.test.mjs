// Inactivating a circle keeps every record in the database but makes it read-only; only a manager
// inactivates and reactivates; deleting for good stays possible (LGPD). The writes below mirror
// setCircleActive / dissolveCircle in src/services/firebase/circles.ts.
import {
  Timestamp,
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

import { assertEq, check, scenario, setup } from './helpers.mjs'

scenario('circle-inactivation', async () => {
  const env = await setup('circle-inactivation')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }
  const FIVE = ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros']
  const member = (db, uid) => doc(db, 'circles', 'c1', 'members', uid)

  // ana manages a circle around a nominal person; bia edits routine and health; cris only sees the
  // routine; dino leaves later; pend is waiting for approval; eve has an invite; zed is a stranger.
  await admin(async (db) => {
    for (const u of ['ana', 'bia', 'cris', 'dino', 'pend', 'eve', 'zed']) {
      await setDoc(doc(db, 'users', u), {
        name: u, role: 'family', roles: ['family'], termsVersion: '1.0',
        circleIds: u === 'eve' || u === 'zed' ? [] : ['c1'],
      })
    }
    await setDoc(doc(db, 'circles', 'c1'), {
      subject: { name: 'Dona Maria', uid: null }, subjectId: 'p1', createdBy: 'ana', memberCount: 5, emergencyCount: 0,
    })
    await setDoc(doc(db, 'persons', 'p1'), { name: 'Dona Maria', uid: null, circleId: 'c1', createdBy: 'ana' })
    await setDoc(member(db, 'ana'), { name: 'ana', role: 'admin', permissions: FIVE, status: 'ativo' })
    await setDoc(member(db, 'bia'), { name: 'bia', role: 'familiar', permissions: ['ver-rotina', 'editar-rotina', 'ver-saude', 'editar-saude'], status: 'ativo' })
    await setDoc(member(db, 'cris'), { name: 'cris', role: 'observador', permissions: ['ver-rotina'], status: 'ativo' })
    await setDoc(member(db, 'dino'), { name: 'dino', role: 'familiar', permissions: ['ver-rotina'], status: 'ativo' })
    await setDoc(member(db, 'pend'), { name: 'pend', role: 'familiar', permissions: ['ver-rotina'], status: 'pendente' })
    await setDoc(doc(db, 'circles', 'c1', 'tasks', 't1'), { title: 'Consulta', order: 0, done: false })
    await setDoc(doc(db, 'circles', 'c1', 'medications', 'm1'), { name: 'Losartana', stock: 10 })
    await setDoc(doc(db, 'circles', 'c1', 'medicationDoses', 'm1_2026-10-28_0800'), { medicationId: 'm1', date: '2026-10-28', time: '08:00', state: 'tomou' })
    await setDoc(doc(db, 'invites', 'ELDER-OPEN-0001'), {
      circleId: 'c1', circleName: 'Dona Maria', role: 'familiar', label: null, permissions: ['ver-rotina'],
      createdBy: 'ana', createdByName: 'ana', expiresAt: Timestamp.fromMillis(Date.now() + 864e5),
      usedBy: null, usedAt: null, revoked: false,
    })
  })
  const as = (uid) => env.authenticatedContext(uid).firestore()
  const [ana, bia, cris, dino, eve, zed] = ['ana', 'bia', 'cris', 'dino', 'eve', 'zed'].map(as)

  // Same writes as setCircleActive: circle and its person, in one batch.
  const setActive = (db, uid, active) => {
    const change = active
      ? { status: 'ativo', inactivatedAt: deleteField(), inactivatedBy: deleteField() }
      : { status: 'inativo', inactivatedAt: serverTimestamp(), inactivatedBy: uid }
    const batch = writeBatch(db)
    batch.update(doc(db, 'circles', 'c1'), change)
    batch.update(doc(db, 'persons', 'p1'), change)
    return batch.commit()
  }
  const counts = () =>
    admin(async (db) => ({
      tasks: (await getDocs(collection(db, 'circles', 'c1', 'tasks'))).size,
      medications: (await getDocs(collection(db, 'circles', 'c1', 'medications'))).size,
      doses: (await getDocs(collection(db, 'circles', 'c1', 'medicationDoses'))).size,
      members: (await getDocs(collection(db, 'circles', 'c1', 'members'))).size,
    }))

  // ─── Antes: um círculo ativo funciona normalmente ───
  await check('ativo: bia edita uma tarefa', true, () => updateDoc(doc(bia, 'circles', 'c1', 'tasks', 't1'), { done: true }))

  // ─── Só quem gerencia inativa ───
  await check('bia (sem gerenciar) nao inativa', false, () => setActive(bia, 'bia', false))
  await check('cris (observador) nao inativa', false, () => setActive(cris, 'cris', false))
  await check('quem nao e do circulo nao inativa', false, () => setActive(zed, 'zed', false))
  await check('inativar com inactivatedBy de outra pessoa e recusado', false, () => setActive(ana, 'bia', false))
  await check('inativar com data escolhida pelo cliente e recusado', false, () => {
    const batch = writeBatch(ana)
    batch.update(doc(ana, 'circles', 'c1'), { status: 'inativo', inactivatedAt: Timestamp.fromMillis(0), inactivatedBy: 'ana' })
    return batch.commit()
  })
  await check('a pessoa nao muda de status sozinha (sem o circulo)', false, () =>
    updateDoc(doc(ana, 'persons', 'p1'), { status: 'inativo', inactivatedBy: 'ana' }))
  await check('ana (gerencia) inativa o circulo e a pessoa', true, () => setActive(ana, 'ana', false))

  // ─── Inativar nao apaga nada ───
  const afterInactivation = await admin(async (db) => ({
    circle: (await getDoc(doc(db, 'circles', 'c1'))).data(),
    person: (await getDoc(doc(db, 'persons', 'p1'))).data(),
  }))
  await assertEq('circulo ficou inativo, com quem inativou', [afterInactivation.circle.status, afterInactivation.circle.inactivatedBy], ['inativo', 'ana'])
  await assertEq('pessoa assistida espelha o status', [afterInactivation.person.status, afterInactivation.person.inactivatedBy], ['inativo', 'ana'])
  await assertEq('nenhum dado foi apagado', await counts(), { tasks: 1, medications: 1, doses: 1, members: 5 })

  // ─── Inativo = somente leitura ───
  await check('inativo: membros continuam lendo as tarefas', true, () => getDocs(collection(bia, 'circles', 'c1', 'tasks')))
  await check('inativo: membros continuam lendo a saude', true, () => getDocs(collection(bia, 'circles', 'c1', 'medications')))
  await check('inativo: a pessoa assistida continua legivel', true, () => getDoc(doc(bia, 'persons', 'p1')))
  await check('inativo: bia nao edita tarefa', false, () => updateDoc(doc(bia, 'circles', 'c1', 'tasks', 't1'), { done: false }))
  await check('inativo: bia nao cria tarefa', false, () => setDoc(doc(bia, 'circles', 'c1', 'tasks', 't2'), { title: 'x', order: 1 }))
  await check('inativo: ana nao edita medicamento', false, () => updateDoc(doc(ana, 'circles', 'c1', 'medications', 'm1'), { stock: 1 }))
  await check('inativo: bia nao registra dose', false, () => setDoc(doc(bia, 'circles', 'c1', 'medicationDoses', 'm1_2026-10-29_0800'), { medicationId: 'm1', date: '2026-10-29', time: '08:00', state: 'tomou' }))
  await check('inativo: bia nao apaga tarefa', false, () => deleteDoc(doc(bia, 'circles', 'c1', 'tasks', 't1')))
  await check('inativo: ana nao renomeia a pessoa', false, () => updateDoc(doc(ana, 'persons', 'p1'), { name: 'Outro nome' }))
  await check('inativo: ana nao edita permissoes de membro', false, () =>
    updateDoc(member(ana, 'bia'), { role: 'observador', label: null, permissions: ['ver-rotina'] }))
  await check('inativo: ana nao aprova pedido pendente', false, () => updateDoc(member(ana, 'pend'), { status: 'ativo' }))
  await check('inativo: ana nao remove membro', false, () => {
    const batch = writeBatch(ana)
    batch.delete(member(ana, 'cris'))
    batch.update(doc(ana, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 0 })
    return batch.commit()
  })
  await check('inativo: ana nao gera convite', false, () =>
    setDoc(doc(ana, 'invites', 'ELDER-NEWW-0001'), {
      circleId: 'c1', circleName: 'Dona Maria', role: 'observador', label: null, permissions: ['ver-rotina'],
      createdBy: 'ana', createdByName: 'ana', createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 864e5), usedBy: null, usedAt: null, revoked: false,
    }))
  await check('inativo: convite aberto nao pode ser aceito', false, () => {
    const batch = writeBatch(eve)
    batch.set(member(eve, 'eve'), {
      name: 'eve', role: 'familiar', label: null, permissions: ['ver-rotina'], status: 'pendente', phone: null,
      invitedBy: 'ana', inviteCode: 'ELDER-OPEN-0001', joinedAt: serverTimestamp(), lastAccess: serverTimestamp(),
      consent: { at: serverTimestamp(), version: '1.0' },
    })
    batch.update(doc(eve, 'invites', 'ELDER-OPEN-0001'), { usedBy: 'eve', usedAt: serverTimestamp() })
    batch.update(doc(eve, 'users', 'eve'), { circleIds: ['c1'] })
    batch.update(doc(eve, 'circles', 'c1'), { memberCount: increment(1) })
    return batch.commit()
  })
  await check('inativo: membro registra o proprio ultimo acesso', true, () => updateDoc(member(bia, 'bia'), { lastAccess: serverTimestamp() }))
  await check('inativo: quem gerencia ainda cancela um convite aberto', true, () => updateDoc(doc(ana, 'invites', 'ELDER-OPEN-0001'), { revoked: true }))
  await check('inativo: qualquer membro ainda pode sair', true, () => {
    const batch = writeBatch(dino)
    batch.delete(member(dino, 'dino'))
    batch.update(doc(dino, 'circles', 'c1'), { memberCount: increment(-1), emergencyCount: 0 })
    batch.update(doc(dino, 'users', 'dino'), { circleIds: arrayRemove('c1') })
    return batch.commit()
  })

  // ─── Só quem gerencia reativa ───
  await check('bia (sem gerenciar) nao reativa', false, () => setActive(bia, 'bia', true))
  await check('cris (observador) nao reativa', false, () => setActive(cris, 'cris', true))
  await check('ana reativa o circulo e a pessoa', true, () => setActive(ana, 'ana', true))
  const afterReactivation = await admin(async (db) => ({
    circle: (await getDoc(doc(db, 'circles', 'c1'))).data(),
    person: (await getDoc(doc(db, 'persons', 'p1'))).data(),
  }))
  await assertEq('reativado: status ativo e sem marcas de inativacao',
    [afterReactivation.circle.status, 'inactivatedAt' in afterReactivation.circle, 'inactivatedBy' in afterReactivation.circle],
    ['ativo', false, false])
  await assertEq('reativado: a pessoa tambem volta a ativa', [afterReactivation.person.status, 'inactivatedBy' in afterReactivation.person], ['ativo', false])
  await check('reativado: bia volta a editar tarefa', true, () => updateDoc(doc(bia, 'circles', 'c1', 'tasks', 't1'), { done: false }))
  await check('reativado: ana volta a editar medicamento', true, () => updateDoc(doc(ana, 'circles', 'c1', 'medications', 'm1'), { stock: 9 }))

  // ─── Um circulo novo nasce ativo ───
  await check('circulo novo nao pode nascer inativo', false, () => {
    const circle = doc(collection(eve, 'circles'))
    const person = doc(collection(eve, 'persons'))
    const batch = writeBatch(eve)
    batch.set(person, { name: 'X', uid: null, circleId: circle.id, createdBy: 'eve', createdAt: serverTimestamp() })
    batch.set(circle, {
      subject: { name: 'X', uid: null }, subjectId: person.id, createdBy: 'eve', createdAt: serverTimestamp(),
      memberCount: 1, emergencyCount: 0, status: 'inativo', consent: { by: 'eve', at: serverTimestamp(), version: '1.0' },
    })
    batch.set(doc(eve, 'circles', circle.id, 'members', 'eve'), {
      name: 'eve', role: 'admin', label: null, permissions: FIVE, status: 'ativo', phone: null, invitedBy: null, inviteCode: null,
      joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' },
    })
    batch.update(doc(eve, 'users', 'eve'), { circleIds: [circle.id] })
    return batch.commit()
  })

  // ─── Exclusao definitiva continua possivel, mesmo com o circulo inativo ───
  await check('ana inativa de novo', true, () => setActive(ana, 'ana', false))
  await check('inativo: bia nao apaga os dados do circulo', false, () => deleteDoc(doc(bia, 'circles', 'c1', 'medications', 'm1')))
  await check('inativo: quem pode excluir o circulo apaga tarefas, medicamentos e doses', true, async () => {
    const batch = writeBatch(ana)
    for (const name of ['tasks', 'medications', 'medicationDoses']) {
      const snap = await getDocs(collection(ana, 'circles', 'c1', name))
      snap.docs.forEach((d) => batch.delete(d.ref))
    }
    return batch.commit()
  })
  await check('inativo: exclusao definitiva do circulo, da pessoa e dos membros', true, async () => {
    const members = await getDocs(collection(ana, 'circles', 'c1', 'members'))
    const batch = writeBatch(ana)
    members.docs.filter((d) => d.id !== 'ana').forEach((d) => batch.delete(d.ref))
    batch.delete(doc(ana, 'persons', 'p1'))
    batch.delete(doc(ana, 'circles', 'c1'))
    batch.delete(member(ana, 'ana'))
    batch.update(doc(ana, 'users', 'ana'), { circleIds: arrayRemove('c1') })
    return batch.commit()
  })
  await assertEq('apos a exclusao: circulo e pessoa sumiram',
    await admin(async (db) => [(await getDoc(doc(db, 'circles', 'c1'))).exists(), (await getDoc(doc(db, 'persons', 'p1'))).exists()]),
    [false, false])
})
