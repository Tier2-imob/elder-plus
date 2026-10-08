# Elder — Tasks

> O protótipo evoluiu para produto com backend Firebase. A Wave 1 abaixo cobre Authentication,
> Firestore e Storage. A Wave 2 reserva FCM/push e o Portal do Parceiro.

## Protótipo (UI) — Concluídas ✅

- [x] Configurar Expo + Expo Router + NativeWind + Hanken Grotesk
- [x] `LoginScreen` — seleção de tipo de conta com três RoleCards
- [x] `SignupScreen` — cadastro com pill de contexto
- [x] `AccountContext` — estado compartilhado entre telas
- [x] `ExploreScreen` — card de boas-vindas, busca funcional, grid de categorias, "Perto de você", FloatingNav
- [x] `DiscoverScreen` — listagem por categoria, filtros animados, mapa WebView, botão de favoritar
- [x] `BusinessScreen` — hero, sheet, favorito, formulário de avaliação
- [x] `CareScreen` — toggle Hoje/Semana, TaskCards generosos, conclusão com check verde, FloatingNav
- [x] `FloatingNav` — pill flutuante alternando entre Explorar e Cuidados
- [x] `Logo` — componente com dimensões inline (sem bug de preflight CSS)

## Wave 1 — Backend Firebase (em finalização)

- [x] `src/services/firebase/config.ts` — singletons `app`/`auth`/`db`/`storage` (sem `getAnalytics`)
- [x] `src/services/firebase/auth.ts` + `auth-errors.ts` — signUp/signIn/logout/observeAuth e mensagens em PT
- [x] `src/services/firebase/users.ts` — perfil em `users/{uid}`, `normalizeRole` (fallback 'family')
- [x] `src/services/firebase/favorites.ts` — favoritos em `users/{uid}/favorites`
- [x] `src/services/firebase/reviews.ts` — avaliações em `businesses/{businessId}/reviews`
- [x] `src/services/firebase/tasks.ts` — tarefas em `users/{uid}/tasks` com seed inicial
- [x] `src/services/firebase/files.ts` — upload/list/delete em `users/{uid}/documents/` (Storage)
- [x] `AccountContext` reescrito sobre Firebase Auth (sessão persistida; favoritos otimistas)
- [x] `_layout.tsx` com `RootNavigator` (dono dos redirects de auth) + rotas `login`/`documents`
- [x] `SignupScreen` com nome + e-mail + senha; `AuthLoginScreen` (e-mail/senha)
- [x] Partner bloqueado no cadastro na Wave 1 (sem conta/perfil criados)
- [x] `useBusinessReviews` / `useCareTasks` — hooks ligando serviços às telas puras
- [x] `useUserDocuments` + `DocumentsScreen` + `documents.tsx` — documentos no Storage
- [x] `ExploreScreen` — ícones de pasta ("Meus documentos") e sair ("Sair") no cabeçalho
- [x] `tsc --noEmit` e `expo lint` sem erros
- [ ] Smoke test manual no Expo Go: cadastro/login reais, leitura/escrita no Firestore e um upload+list no Storage (valida `storageBucket`; não coberto por tsc/lint)
- [ ] Aplicar as regras de segurança do Firestore/Storage no console (não versionadas na Wave 1)

## Pendentes (Wave 2 e melhorias de produto)

- [ ] **Notificações push (Firebase Cloud Messaging)** — reservado para a Wave 2

- [ ] **Portal do Parceiro** (Wave 2) — tela de destino para o fluxo "Comércio e parceiros" após cadastro (bloqueado na Wave 1)
  - [ ] Tela home do parceiro (catálogo de serviços fictício)
  - [ ] Tela de leads/orçamentos recebidos (lista fictícia)
  - [ ] Tela de resultados/analytics (gráficos ilustrativos)
  - [ ] Registrar rota `/partner` no `_layout.tsx`
  - [ ] Conectar `signup.tsx`: quando `role === 'partner'`, navegar para `/partner`

- [ ] **Imagem no hero da BusinessScreen**
  - [ ] Substituir `View bg-navy/20` por `Image` quando o asset estiver disponível
  - [ ] Adicionar campo `heroImage` opcional em `ServiceItem`

- [ ] **Ilustração no card de boas-vindas da ExploreScreen**
  - [ ] Adicionar prop `backgroundIllustration` opcional ao `ExploreScreen`
  - [ ] Renderizar como `Image position: absolute` atrás do conteúdo

- [ ] **Tela "Perto de você" expandida**
  - [ ] Os três cards de "Perto de você" na ExploreScreen devem navegar para a BusinessScreen correspondente

- [x] **Persistência entre sessões** — resolvido na Wave 1 via Firebase (Auth + Firestore + Storage)
