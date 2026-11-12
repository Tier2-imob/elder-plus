// Health plan cards: circles/{id}/healthCards/{numberKey}. The doc id is the normalized card number,
// so the same number can't be registered twice; seeing needs `ver-saude`, writing needs
// `editar-saude` on an active circle. Changing the number is delete + create, never an update.
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore'

import { check, scenario, setup } from './helpers.mjs'

scenario('health-cards', async () => {
  const env = await setup('health-cards')
  const admin = async (fn) => {
    let out
    await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()) })
    return out
  }

  await admin(async (db) => {
    for (const u of ['ana', 'bia', 'cho', 'zed']) {
      await setDoc(doc(db, 'users', u), { name: u, role: 'family', roles: ['family'], termsVersion: '1.0', circleIds: u === 'zed' ? [] : ['c1'] })
    }
    await setDoc(doc(db, 'circles', 'c1'), { subject: { name: 'Dona Maria', uid: null }, createdBy: 'ana', memberCount: 3, emergencyCount: 0 })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'ana'), { name: 'ana', role: 'admin', permissions: ['ver-rotina', 'ver-saude', 'editar-saude', 'gerenciar-membros'], status: 'ativo' })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'bia'), { name: 'bia', role: 'familiar', permissions: ['ver-rotina'], status: 'ativo' })
    await setDoc(doc(db, 'circles', 'c1', 'members', 'cho'), { name: 'cho', role: 'familiar', permissions: ['ver-saude'], status: 'ativo' })
  })
  const as = (uid) => env.authenticatedContext(uid).firestore()
  const [ana, bia, cho, zed] = ['ana', 'bia', 'cho', 'zed'].map(as)
  const card = (db, id) => doc(db, 'circles', 'c1', 'healthCards', id)
  const fields = (numberKey) => ({ operator: 'Unimed', plan: '', number: '0 123 456', code: '', holder: '', numberKey })

  await check('quem edita a saude cadastra um cartao', true, () => setDoc(card(ana, '0123456'), fields('0123456')))
  await check('o id do cartao tem de ser o numero normalizado', false, () => setDoc(card(ana, 'outro-id'), fields('0123456')))
  await check('quem so ve a saude nao cadastra', false, () => setDoc(card(cho, '999888'), fields('999888')))
  await check('quem nao ve a saude nao cadastra', false, () => setDoc(card(bia, '999888'), fields('999888')))

  await check('quem ve a saude le os cartoes', true, () => getDocs(collection(cho, 'circles', 'c1', 'healthCards')))
  await check('quem ve a saude le um cartao', true, () => getDoc(card(cho, '0123456')))
  await check('quem nao ve a saude nao le os cartoes', false, () => getDocs(collection(bia, 'circles', 'c1', 'healthCards')))
  await check('quem nao e do circulo nao le os cartoes', false, () => getDocs(collection(zed, 'circles', 'c1', 'healthCards')))

  await check('edita o cartao mantendo o numero', true, () => updateDoc(card(ana, '0123456'), { operator: 'Unimed Nacional' }))
  await check('trocar o numero por update e recusado', false, () => updateDoc(card(ana, '0123456'), { numberKey: '777', number: '777' }))
  await check('quem so ve a saude nao edita o cartao', false, () => updateDoc(card(cho, '0123456'), { operator: 'X' }))
  await check('quem so ve a saude nao apaga o cartao', false, () => deleteDoc(card(cho, '0123456')))

  // Circulo inativo: somente leitura.
  await admin(async (db) => updateDoc(doc(db, 'circles', 'c1'), { status: 'inativo' }))
  await check('circulo inativo: ninguem cadastra cartao', false, () => setDoc(card(ana, '555444'), fields('555444')))
  await check('circulo inativo: ninguem edita cartao', false, () => updateDoc(card(ana, '0123456'), { operator: 'Y' }))
  // Quem gerencia um circulo inativo sem pessoa com conta ainda pode apagar os dados (exclusao definitiva), como nos medicamentos.
  await check('circulo inativo: quem so ve a saude nao apaga cartao', false, () => deleteDoc(card(cho, '0123456')))
  await check('circulo inativo: o cartao continua visivel', true, () => getDoc(card(cho, '0123456')))
  await admin(async (db) => updateDoc(doc(db, 'circles', 'c1'), { status: 'ativo' }))

  await check('reativado: quem edita a saude apaga o cartao', true, () => deleteDoc(card(ana, '0123456')))
})
