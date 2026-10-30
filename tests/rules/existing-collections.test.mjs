import { assertEq, check, scenario, setup } from './helpers.mjs'
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore'

scenario('existing-collections', async () => {
  const env = await setup('existing-collections')
  const a = env.authenticatedContext('alice').firestore()
  const b = env.authenticatedContext('bob').firestore()

  // Cadastro (createProfile)
  await check('cadastro cria o próprio perfil', true, () => setDoc(doc(a, 'users', 'alice'), { name: 'Alice', role: 'family', email: 'a@x', createdAt: serverTimestamp(), termsVersion: '1.0', termsAcceptedAt: serverTimestamp() }))
  await check('cadastro sem aceite de termos é recusado', false, () => setDoc(doc(b, 'users', 'bob'), { name: 'Bob', role: 'family', email: 'b@x' }))
  await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users', 'bob'), { name: 'Bob', role: 'elder', email: 'b@x', termsVersion: '1.0' }))
  await check('lê o próprio perfil', true, () => getDoc(doc(a, 'users', 'alice')))
  await check('não lê perfil de outro', false, () => getDoc(doc(a, 'users', 'bob')))
  await check('não muda o próprio role', false, () => updateDoc(doc(a, 'users', 'alice'), { role: 'partner' }))
  // Favoritos
  await check('adiciona favorito', true, () => setDoc(doc(a, 'users', 'alice', 'favorites', 'biz1'), { businessId: 'biz1', createdAt: serverTimestamp() }))
  await check('lista favoritos', true, () => getDocs(collection(a, 'users', 'alice', 'favorites')))
  await check('remove favorito', true, () => deleteDoc(doc(a, 'users', 'alice', 'favorites', 'biz1')))
  // Tarefas e medicamentos (legado em users/{uid})
  await check('cria tarefa', true, () => setDoc(doc(a, 'users', 'alice', 'tasks', 't1'), { title: 'x', order: 0, done: false }))
  await check('lista tarefas ordenadas', true, () => getDocs(query(collection(a, 'users', 'alice', 'tasks'), orderBy('order'))))
  await check('conclui tarefa', true, () => updateDoc(doc(a, 'users', 'alice', 'tasks', 't1'), { done: true }))
  await check('cria medicamento', true, () => addDoc(collection(a, 'users', 'alice', 'medications'), { name: 'Losartana', stock: 10, createdAt: serverTimestamp() }))
  await check('não lê tarefas de outro', false, () => getDocs(collection(a, 'users', 'bob', 'tasks')))
  // Avaliações
  await check('lê avaliações', true, () => getDocs(collection(a, 'businesses', 'biz1', 'reviews')))
  await check('cria avaliação própria', true, () => addDoc(collection(a, 'businesses', 'biz1', 'reviews'), { rating: 5, comment: 'ok', author: 'Alice', authorUid: 'alice', createdAt: serverTimestamp() }))
  await check('não cria avaliação em nome de outro', false, () => addDoc(collection(a, 'businesses', 'biz1', 'reviews'), { rating: 1, comment: 'x', author: 'Bob', authorUid: 'bob' }))
  // Círculo
  const ALL = ['ver-rotina','editar-rotina','ver-saude','editar-saude','emergencia','gerenciar-membros']
  let circleId
  await check('cria círculo (family, titular nominal)', true, () => {
    const ref = doc(collection(a, 'circles')); circleId = ref.id
    const batch = writeBatch(a)
    batch.set(ref, { subject: { name: 'Dona Maria', uid: null }, createdBy: 'alice', createdAt: serverTimestamp(), memberCount: 1, emergencyCount: 0, consent: { by: 'alice', at: serverTimestamp(), version: '1.0' } })
    batch.set(doc(a, 'circles', ref.id, 'members', 'alice'), { name: 'Alice', role: 'admin', label: null, permissions: ALL, status: 'ativo', phone: null, invitedBy: null, inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(a, 'users', 'alice'), { circleId: ref.id })
    return batch.commit()
  })
  await check('membro lê o círculo', true, () => getDoc(doc(a, 'circles', circleId)))
  await check('quem não é membro não lê o círculo', false, () => getDoc(doc(b, 'circles', circleId)))
  await check('não cria segundo círculo', false, () => {
    const ref = doc(collection(a, 'circles'))
    const batch = writeBatch(a)
    batch.set(ref, { subject: { name: 'Outro', uid: null }, createdBy: 'alice', createdAt: serverTimestamp(), memberCount: 1, emergencyCount: 0, consent: { by: 'alice', at: serverTimestamp(), version: '1.0' } })
    batch.set(doc(a, 'circles', ref.id, 'members', 'alice'), { name: 'Alice', role: 'admin', label: null, permissions: ALL, status: 'ativo', phone: null, invitedBy: null, inviteCode: null, joinedAt: serverTimestamp(), lastAccess: serverTimestamp(), consent: { at: serverTimestamp(), version: '1.0' } })
    batch.update(doc(a, 'users', 'alice'), { circleId: ref.id })
    return batch.commit()
  })
  await check('atualiza último acesso', true, () => updateDoc(doc(a, 'circles', circleId, 'members', 'alice'), { lastAccess: serverTimestamp() }))
  await check('não aumenta as próprias permissões', false, () => updateDoc(doc(a, 'circles', circleId, 'members', 'alice'), { role: 'titular' }))
})
