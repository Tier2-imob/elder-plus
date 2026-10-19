---
name: firebase-service-and-hook
description: Persistir um novo tipo de dado no Firestore ou Storage do Elder+ seguindo o padrão service module + hook, mantendo as screens puras.
---

# Skill: Serviço Firebase + hook de dados

Use ao adicionar persistência (ler/escrever dados de usuário, documentos, etc.). O padrão tem
três camadas e nunca coloca Firebase dentro de uma screen.

```
src/services/firebase/<coisa>.ts   → funções puras de I/O (Firestore/Storage), sem React
src/hooks/use<Coisa>.ts            → estado React + otimismo + tratamento de erro
src/app/<rota>.tsx (ou context)    → consome o hook e injeta na screen por props
```

## 1. Módulo de serviço (`src/services/firebase/*.ts`)

- Importa `db`/`storage` de `./config` (nunca chama `initializeApp` — só `config.ts` faz isso).
- Exporta funções `async` tipadas, uma por operação. Sem estado, sem React.
- Documentos tipados em `src/services/firebase/types.ts` (DTOs com `createdAt: Timestamp | null`).

Modelo de dados atual do Firestore (siga as mesmas convenções):

| Coleção/caminho | Conteúdo | Observação |
|-----------------|----------|------------|
| `users/{uid}` | perfil (`name`, `role`, `email`, `createdAt`) | 1 doc por usuário |
| `users/{uid}/favorites/{businessId}` | favorito | id do doc = `businessId` |
| `users/{uid}/tasks/{taskId}` | tarefa de cuidado | ordenado por `order` |
| `businesses/{businessId}/reviews/{reviewId}` | avaliação | global por negócio; carrega `authorUid` |
| Storage `users/{uid}/documents/{arquivo}` | documentos médicos | nome prefixado com `Date.now()_` |

Exemplo (padrão real de `favorites.ts`):

```ts
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './config'

export async function listFavorites(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'favorites'))
  return snap.docs.map((d) => d.id)
}
export async function addFavorite(uid: string, businessId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'favorites', businessId), { businessId, createdAt: serverTimestamp() })
}
export async function removeFavorite(uid: string, businessId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'favorites', businessId))
}
```

## 2. Hook de dados (`src/hooks/use*.ts`)

Responsável por estado, carregamento, **atualização otimista** e tratamento de erro. Padrões
reais em uso neste projeto (siga-os):

- **Reset ao trocar de chave (uid/businessId) durante o render**, não dentro do effect — padrão
  React "ajustar estado quando uma prop muda":
  ```ts
  const [loadedFor, setLoadedFor] = useState(key)
  if (loadedFor !== key) { setLoadedFor(key); setItems([]); setLoading(true) }
  ```
- **Guard de corrida** com `let active = true` (ou `activeRef`) no effect; não escreve estado
  depois que a chave mudou.
- **Otimismo com rollback**: aplica a mudança local na hora, chama o serviço, e reverte no
  `catch`. Em escrita que o usuário possa reenviar (ex.: avaliação), **rethrow** no catch para a
  screen preservar os inputs.
- **Nunca derruba o app**: `catch` registra `console.warn` + seta mensagem de erro em PT.
- **Seed idempotente** quando a coleção nasce vazia (ex.: tarefas), com `useRef` guard para não
  duplicar em double-mount.

Exemplo mínimo:

```ts
export function useThings(uid: string | undefined) {
  const [items, setItems] = useState<Thing[]>([])
  const [loading, setLoading] = useState(uid !== undefined)
  const [error, setError] = useState<string | undefined>()

  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) { setLoadedForUid(uid); setItems([]); setLoading(uid !== undefined) }

  useEffect(() => {
    let active = true
    if (!uid) return
    things.list(uid)
      .then((xs) => { if (active) setItems(xs) })
      .catch((e) => { console.warn('list failed', e); if (active) { setItems([]); setError('Não foi possível carregar.') } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [uid])

  // ...ações otimistas
  return { items, loading, error /* , ações */ }
}
```

## 3. Ligação na screen

O wrapper de rota (ou o `AccountContext`, se o dado for global como favoritos) chama o hook e
passa `items`/`loading`/`onAction` para a screen pura por props. A screen **não** importa o hook
se puder receber por props — exceto `useAccount()`, que é o único hook global permitido em telas
já estabelecidas (favoritos). Para dados por-tela, prefira o hook no wrapper.

## Storage (documentos)

- Serviço: `files.ts` (`uploadDocument`/`listDocuments`/`deleteDocument`).
- Pickers (`expo-document-picker`, `expo-image-picker`) ficam **só** no hook `useUserDocuments`,
  nunca na screen. Cancelamento (`result.canceled` ou `assets` vazio) é no-op.
- Atenção: imagem usa `asset.fileName`/`fileSize`; documento usa `asset.name`/`size`.

## Regras de segurança (lembrar o humano)

Toda coleção por-usuário exige regra `request.auth.uid == uid`. Avaliações: leitura para
logados, escrita só se `authorUid == request.auth.uid`. Deixe as regras documentadas; quem
publica no console é o humano.

## Checklist de aceite

- [ ] Serviço só faz I/O, importa `db`/`storage` de `./config`, DTO em `types.ts`
- [ ] Hook trata loading/erro/otimismo e nunca crasha
- [ ] Nenhuma screen importa `firebase` ou pickers
- [ ] `tsc --noEmit` e `expo lint` limpos
