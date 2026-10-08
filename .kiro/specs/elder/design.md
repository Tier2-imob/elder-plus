# Elder — Design

> **Wave 1 — Firebase.** O protótipo evoluiu para um produto com backend real no Firebase (JS SDK
> modular, pacote `firebase`), mantendo a arquitetura de duas camadas, o alias `@/` e o NativeWind.
> O acesso ao Firebase e aos pickers fica isolado em `src/services/firebase/*`, nos hooks em
> `src/hooks/*` e nos wrappers de rota em `src/app/*`; as Screens permanecem puras. A **Wave 2**
> reserva FCM/push e o Portal do Parceiro.

## Arquitetura geral

O app segue uma arquitetura de duas camadas sobre o Expo Router:

```
src/app/*.tsx              → wrappers finos (rota, insets, navegação, dados/callbacks)
src/screens/*.tsx          → componentes puros (recebem tudo via props; sem Firebase/picker)
src/hooks/*.ts             → hooks que ligam serviços às telas (useBusinessReviews, useCareTasks, useUserDocuments)
src/services/firebase/*.ts → config/auth/users/favorites/reviews/tasks/files (única camada que toca o Firebase)
```

Essa separação garante que as Screens não dependem de roteador nem do Firebase — facilitando testes
e reaproveitamento. **Pureza de duas camadas:** as telas puras nunca importam `firebase` nem os
pickers; apenas serviços, hooks e wrappers o fazem.

## Fluxo de navegação

```
index.tsx (LoginScreen) ──► login.tsx (AuthLoginScreen) ← e-mail/senha
  └─► signup.tsx (SignupScreen: nome + e-mail + senha → Firebase Auth)
        ├─► explore.tsx (ExploreScreen) ← Idoso / Família
        │     ├─► discover.tsx (DiscoverScreen)
        │     │     └─► business.tsx (BusinessScreen)
        │     ├─► care.tsx (CareScreen) [via FloatingNav]
        │     └─► documents.tsx (DocumentsScreen) [via ícone de pasta no cabeçalho]
        └─► [partner — bloqueado na Wave 1; destino reservado para a Wave 2]
```

O `RootNavigator` em `_layout.tsx` é o único dono dos redirecionamentos por estado de autenticação:
observa `onAuthStateChanged`, mantém o splash enquanto fontes/sessão carregam e redireciona para `/`
no logout. Logout parte do ícone "Sair" no cabeçalho da ExploreScreen (sem rota nova).

## Componentes principais

### LoginScreen
- Três `RoleCard` com ícone MaterialIcons em quadrado arredondado
- Callbacks: `onSelectRole(role)`, `onLogin()`
- Props opcionais: `brandMark` (imagem do símbolo azul), `topInset`

### SignupScreen
- Pill de contexto (tipo de conta selecionado) + campo de nome + `dividerAsset` opcional
- Botão desabilitado enquanto `name.trim().length < 2`
- Callbacks: `onBack()`, `onContinue(name)`

### ExploreScreen
- Cabeçalho em linha: `<Logo>` à esquerda e, à direita, um ícone `folder` ("Meus documentos") e um ícone `logout` ("Sair"), ambos navy, renderizados condicionalmente — sem mudança de paleta/padding; `FloatingNav` intacto
- Card navy com `TextInput` funcional que filtra `ALL_ITEMS` (seed local) via `useMemo`
- Grid 2×3 de categorias + lista "Perto de você"
- `FloatingNav` ativo em "Explorar"
- Callbacks: `onSelectCategory(category)`, `onSelectBusiness(item)`, `onNavigate(key)`, `onLogout?()`, `onOpenDocuments?()`

### AuthLoginScreen [Wave 1]
- Tela de e-mail/senha para usuários já cadastrados, no mesmo visual do SignupScreen
- Callbacks: `onLogin({ email, password })`, estados `submitting`/`errorMessage` via props

### DocumentsScreen [Wave 1]
- Lista os documentos do usuário (nome + tamanho/tipo opcionais) com duas ações de envio ("Escolher arquivo" / "Escolher foto") e exclusão por item
- Estados de carregamento, vazio e erro; **tela pura** (sem importar Firebase ou pickers)
- Props: `documents`, `loading`, `uploading`, `errorMessage`, `onPickFile`, `onPickImage`, `onDelete(fullPath)`, `onBack`, `topInset?`, `bottomInset?`
- Dados e ações vêm do hook `useUserDocuments` (único lugar que importa os pickers e `files.ts`)

### DiscoverScreen
- Cards animados via `position: absolute` + `translateY` (react-native-reanimated)
- Cada card é um `ServiceCard` isolado com seu próprio `useSharedValue`
- Container de filtros com título "FILTROS" + três chips `flex-1`
- Mapa via `<WebView source={{ html: '...<iframe>...' }}>`
- Callbacks: `onBack()`, `onSelectItem(item)`, `onNavigate(key)`

### BusinessScreen
- Hero: `View` com `bg-navy/20`, altura 220px — reservado para imagem futura
- Sheet: `ScrollView` com `borderTopRadius: 24` e `marginTop: -24`
- Favorito lido/escrito via `useAccount()` — persistido em `users/{uid}/favorites` no Firestore e consistente entre DiscoverScreen e BusinessScreen
- Avaliações: carregadas de `businesses/{businessId}/reviews` via hook `useBusinessReviews`; envio é otimista e tolera `createdAt` nulo (serverTimestamp ainda não resolvido no cliente)
- Callbacks: `onBack()`

### CareScreen
- Toggle "Hoje / Semana" como dois botões `flex-1` num container arredondado
- `TodayView`: exibe tarefas do `TODAY_KEY` ('wed')
- `WeekView`: itera `WEEK_DAYS` em fila vertical, exibe cabeçalho por dia + `TaskCard`s
- `TaskCard`: `rounded-3xl`, ícone 56px, fonte `text-[19px] font-hanken-extrabold`, botão "Concluir" como pill
- Conclusão persistida em `users/{uid}/tasks` via hook `useCareTasks` (otimista, revertendo em falha); card permanece com check verde e título riscado
- `FloatingNav` ativo em "Cuidados"

### FloatingNav
- `position: absolute`, `bottom: bottomInset + 20`, `alignSelf: center`
- Pill navy com dois `Pressable` internos
- Ativo: `bg-terracotta` + label visível; Inativo: transparente + ícone semitransparente

### Logo
- Dimensões via `style` inline (não `className`) para evitar conflito com preflight CSS do Tailwind no web

## Estado global (AccountContext sobre Firebase Auth)

```
AccountProvider
  ├── account: { name, role, uid } | null   ← carregado de users/{uid} após onAuthStateChanged
  ├── loading                               ← bloqueia o splash até fontes + sessão prontas
  ├── signUp({ name, role, email, password })  ← bloqueia 'partner' antes de qualquer chamada
  ├── signIn({ email, password })
  ├── signOut()
  ├── favorites: Set<string>                ← carregado de users/{uid}/favorites
  ├── toggleFavorite(id)                    ← otimista, revert por id em falha
  └── isFavorite(id) → boolean
```

O `AccountContext` fala apenas com `src/services/firebase/auth.ts` (único módulo, além de
`config.ts`, que importa `firebase/auth`) e com `favorites.ts`; nunca importa `firebase/auth`
diretamente.

## Backend Firebase (Wave 1)

- **Authentication:** e-mail/senha; persistência via AsyncStorage para restaurar a sessão.
- **Firestore:** `users/{uid}` (perfil), `users/{uid}/favorites`, `users/{uid}/tasks`,
  `businesses/{businessId}/reviews` (avaliações públicas por negócio).
- **Storage:** `users/{uid}/documents/` (arquivos do usuário).
- **Singletons:** apenas `config.ts` chama `initializeApp`/`initializeAuth`/`getFirestore`/`getStorage`;
  os demais módulos importam `app`/`auth`/`db`/`storage` exportados. Sem `getAnalytics` (quebra no RN).

## Catálogo (seed local)

`CATEGORY_DATA` em `src/data/discover-data.ts` — 7 categorias, 3 itens cada; permanece seed local
nesta fase (`businessId` = `ServiceItem.id`). `ServiceItem` tem `distance` (metros), `rating`
(float), `recency` (índice) para suportar os três filtros de ordenação.

## Decisões técnicas relevantes

| Decisão | Motivo |
|---------|--------|
| `style` inline para imagens, não `className` | Preflight CSS do Tailwind sobrescreve `height: auto` em `<img>` no web |
| `onStartShouldSetResponder` no wrapper do botão favoritar | `e.stopPropagation()` não funciona no React Native web |
| `source={{ html }}` no WebView do mapa | Google Maps Embed exige `<iframe>` — `source={{ uri }}` falha com "must be used in an iframe" |
| Cards animados com `position: absolute` | Permite reordenação suave sem remover e reinserir elementos no DOM |
| Screens recebem `topInset`/`bottomInset` via props | Screens não dependem de `useSafeAreaInsets()` — responsabilidade do wrapper de rota |
| Firebase JS SDK (não `@react-native-firebase`) | Mantém o app rodando no Expo Go sem build nativo |
| Pickers e `files.ts` isolados em `useUserDocuments` | Preserva a pureza da `DocumentsScreen` (duas camadas) |
| `serverTimestamp()` tolerado como nulo no cliente | O timestamp só resolve após o round-trip; evita `.toMillis()` em `createdAt` nulo |
