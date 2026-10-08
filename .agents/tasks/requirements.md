# Elder — Firebase Backend Integration (Wave 1) — Requirements

## Summary

O aplicativo Elder deixa de ser um protótipo em memória e passa a ser um produto
em fase de finalização, com backend real. Até aqui, o app guardava tudo em estado
de sessão (`AccountContext` com `account`, `favorites`; avaliações e tarefas apenas
em `useState` local) e qualquer recarga descartava todos os dados. A Wave 1 troca
essa base por um backend Firebase gerenciado, mantendo intactos o fluxo de UI, a
paleta, as fontes e a arquitetura de duas camadas.

Escopo da Wave 1:

1. **Camada de serviços Firebase** nova em `src/services/firebase/` (config + init de
   singletons + módulos de domínio: auth, users, favorites, reviews, tasks, files).
2. **Fluxo de autenticação real** com e-mail + senha (cadastro e login), `AccountContext`
   apoiado em Firebase Auth com persistência, e um gate de carregamento no root layout.
3. **Favoritos por usuário no Firestore**, preservando a superfície `toggleFavorite`/
   `isFavorite` com estado local otimista.
4. **Avaliações (BusinessScreen) no Firestore**, por negócio.
5. **Tarefas de cuidado (CareScreen) no Firestore**, por usuário, com estado "concluída" persistido.
6. **Documentos do usuário no Firebase Storage** (upload, listagem, remoção) com UI nova.
7. **Catálogo permanece seed local** — não migra para o Firestore nesta wave.

Projeto Firebase alvo: `gen-lang-client-0201344960`.

### Pressupostos assumidos (a revisão de design valida)

- **A-1** O cadastro passa a exigir e-mail e senha além do nome e do tipo de conta. A UI
  atual de signup coleta apenas o nome; a Wave 1 estende essa tela/fluxo para e-mail+senha,
  sem alterar paleta, fontes ou a estrutura de duas camadas.
- **A-2** O `role` (`'elder' | 'family' | 'partner'`) continua sendo escolhido na tela
  inicial e gravado no perfil `users/{uid}`. Fluxos de destino por role permanecem como hoje
  (parceiro ainda sem portal; idoso/família caem em `/explore`).
- **A-3** O login é por e-mail+senha. Não há login social, link mágico, telefone ou MFA na Wave 1.
- **A-4** Favoritos, tarefas e documentos são por usuário (`users/{uid}/...`). Avaliações são
  globais por negócio (`businesses/{businessId}/reviews/...`), visíveis a todos os usuários.
- **A-5** O `businessId` usado em favoritos e avaliações é o `ServiceItem.id` do seed local
  (ex.: `s1`, `f2`). Não há coleção de negócios no Firestore; apenas as subcoleções de avaliações.
- **A-6** As `config.ts` traz valores padrão commitados (projeto é público por design do app Expo;
  as credenciais web do Firebase não são segredo), lidos de `process.env.EXPO_PUBLIC_FIREBASE_*`,
  com um `.env.example` documentando as chaves.
- **A-7** Mantém-se compatibilidade com Expo Go: apenas Firebase JS SDK (modular v9+),
  `@react-native-async-storage/async-storage`, `expo-document-picker` e `expo-image-picker`.
  Sem `@react-native-firebase`, sem `expo-notifications`, sem dev build.
- **A-8** Sem regras de segurança de produção endurecidas como entregável de código da Wave 1;
  o modelo de dados é desenhado para que as regras (quando aplicadas no console) sejam diretas
  (dono-só para dados por usuário; leitura pública / escrita autenticada para avaliações).
  As regras em si são configuração de console, fora da base de código.

## Functional Requirements

### FR-A — Autenticação (Firebase Authentication)

- **FR-A1** O sistema deve inicializar o Firebase Auth com persistência React Native
  (`initializeAuth` + `getReactNativePersistence(AsyncStorage)`), de modo que a sessão
  sobreviva ao fechamento e reabertura do app.
- **FR-A2** O sistema deve oferecer cadastro por e-mail + senha, capturando também nome e
  tipo de conta, e criar o perfil correspondente em `users/{uid}` no mesmo fluxo.
- **FR-A3** O sistema deve oferecer uma rota de login real para usuários existentes
  (e-mail + senha), hoje inexistente — o botão "Já tenho conta — Entrar" passa a ter destino.
- **FR-A4** O `AccountContext` deve ser reescrito sobre o Firebase Auth: observar
  `onAuthStateChanged`, carregar o perfil do usuário autenticado e expor
  `account: { name, role, uid } | null`, `loading: boolean`, `signUp`, `signIn` e `signOut`.
- **FR-A5** O root layout (`src/app/_layout.tsx`) deve exibir um gate de splash/carregamento
  enquanto fontes e estado de auth são resolvidos, e só então rotear para a tela adequada
  (sessão ativa → app; sem sessão → login).
- **FR-A6** O sistema deve permitir logout, limpando a sessão persistida e retornando ao login.

### FR-U — Perfil do usuário (Firestore `users/{uid}`)

- **FR-U1** O sistema deve criar um documento `users/{uid}` no cadastro contendo ao menos
  `name`, `role` e `createdAt`.
- **FR-U2** O sistema deve ler o perfil após autenticação e popular `account` com `{ name, role, uid }`.
- **FR-U3** O tipo `AccountRole` existente (`'elder' | 'family' | 'partner'`) deve ser a fonte
  de verdade do campo `role`; valores fora desse conjunto são rejeitados/normalizados.

### FR-F — Favoritos (Firestore, por usuário)

- **FR-F1** O sistema deve persistir favoritos por usuário no Firestore (sob `users/{uid}`),
  substituindo o `Set<string>` apenas em memória.
- **FR-F2** O `AccountContext` deve manter a superfície pública `toggleFavorite(id)` e
  `isFavorite(id)` inalterada, de modo que `BusinessScreen` e `DiscoverScreen` não precisem mudar sua API de consumo.
- **FR-F3** O estado de favorito deve ser otimista: a UI reflete a troca imediatamente e
  sincroniza com o Firestore em segundo plano, revertendo em caso de falha de escrita.
- **FR-F4** Os favoritos devem ser carregados na inicialização da sessão e refletir de forma
  consistente entre `DiscoverScreen` e `BusinessScreen`.

### FR-R — Avaliações (Firestore, por negócio)

- **FR-R1** O sistema deve ler as avaliações de um negócio a partir do Firestore
  (`businesses/{businessId}/reviews`) na `BusinessScreen`, substituindo `INITIAL_REVIEWS`.
- **FR-R2** O sistema deve gravar nova avaliação no Firestore com `rating`, `comment`,
  autor (nome do perfil) e `createdAt`, mantendo a UI de estrelas + comentário atual.
- **FR-R3** A média e a contagem de avaliações exibidas devem derivar dos dados do Firestore.
- **FR-R4** A nova avaliação deve aparecer no topo da lista após o envio (ordenação por `createdAt` desc).

### FR-T — Tarefas de cuidado (Firestore, por usuário)

- **FR-T1** O sistema deve persistir as tarefas de cuidado por usuário no Firestore
  (sob `users/{uid}`), com o estado "concluída" persistente entre sessões.
- **FR-T2** A `CareScreen` deve carregar as tarefas e seus estados `done` do Firestore,
  mantendo as views "Hoje" e "Semana" e o comportamento visual atual (check verde, texto riscado, card permanece).
- **FR-T3** Marcar uma tarefa como concluída deve persistir no Firestore; a marcação atual é
  irreversível na UI (`disabled` após concluir) e esse comportamento é preservado nesta wave.
- **FR-T4** Caso o usuário não tenha tarefas gravadas, o sistema deve semear as tarefas iniciais
  (equivalentes às `TASKS` atuais) no primeiro acesso, para preservar a experiência atual.

### FR-S — Documentos (Firebase Storage, por usuário)

- **FR-S1** O sistema deve permitir upload de arquivos (exames, receitas e afins) para o
  Firebase Storage sob `users/{uid}/documents/`, usando `expo-document-picker` e/ou `expo-image-picker`.
- **FR-S2** O sistema deve listar os documentos do usuário com nome e, quando disponível, metadados básicos.
- **FR-S3** O sistema deve permitir remover um documento do Storage.
- **FR-S4** A UI de documentos deve ser uma screen pura nova + wrapper de rota + hook/serviço,
  respeitando a arquitetura de duas camadas; a screen não importa Firebase diretamente.

### FR-X — Camada de serviços e arquitetura

- **FR-X1** Toda a integração com Firebase deve viver em `src/services/firebase/` com:
  `config.ts` (env-based), inicialização de app/auth/firestore/storage como singletons,
  `auth.ts`, `users.ts`, `favorites.ts`, `reviews.ts`, `tasks.ts`, `files.ts`.
- **FR-X2** As screens puras (`src/screens/*.tsx`) não devem importar Firebase; o consumo
  acontece via `AccountContext`/hooks e via wrappers de rota (`src/app/*.tsx`).
- **FR-X3** A separação wrapper/screen deve ser preservada: wrappers detêm router e safe-area
  insets e injetam dados/callbacks por props; screens recebem `topInset`/`bottomInset` e callbacks.
- **FR-X4** A inicialização do Firebase deve usar apenas `initializeApp`, Auth, Firestore e
  Storage. `getAnalytics` não deve ser usado (quebra em RN).
- **FR-X5** As dependências devem ser adicionadas via `npx expo install`: `firebase`,
  `@react-native-async-storage/async-storage`, `expo-document-picker`, `expo-image-picker`.
  A app deve continuar funcionando em Expo Go.

## Non-Functional Requirements

- **NFR-1 (Persistência)** Dados de usuário (perfil, favoritos, tarefas, documentos) devem
  sobreviver a recargas e reinstalações, enquanto a sessão autenticada estiver válida. Isso
  revoga explicitamente o critério antigo "nenhum dado persiste entre sessões".
- **NFR-2 (Compatibilidade Expo Go)** Nenhum módulo nativo fora dos permitidos; stack restrita
  ao Firebase JS SDK modular v9+ e aos pacotes Expo listados. Sem dev build na Wave 1.
- **NFR-3 (Verificação)** `npx expo lint` e `npx tsc --noEmit` devem passar. Não há framework de
  testes e nenhum deve ser adicionado. Não executar `npx expo start` nem servidores de longa duração.
- **NFR-4 (Design preservado)** Paleta (navy `#11375C`, offwhite `#FDF9F6`, terracotta `#DD7C54`)
  e tipografia Hanken Grotesk permanecem inalteradas. Nenhuma mudança visual de design.
- **NFR-5 (Configuração)** Chaves Firebase lidas de `process.env.EXPO_PUBLIC_FIREBASE_*` com
  defaults commitados e `.env.example` documentando as variáveis.
- **NFR-6 (Resiliência de UI)** Operações de rede (login, cadastro, leitura/escrita de dados,
  upload) devem comunicar estados de carregamento e erro ao usuário sem travar a UI.
- **NFR-7 (Fonte de API)** APIs Expo/Firebase/RN devem ser confirmadas na documentação versionada
  (Expo SDK 57 em `https://docs.expo.dev/versions/v57.0.0/`; Firebase JS SDK em
  `https://firebase.google.com/docs`), não da memória — em especial o caminho de import de
  `getReactNativePersistence` na versão instalada do `firebase`.

## Acceptance Criteria

Autenticação e sessão:

1. Com o app recém-instalado e sem sessão, abrir o app leva à tela de login após o gate de splash.
2. Um usuário consegue se cadastrar com nome, e-mail e senha, escolhendo um tipo de conta, e é
   levado ao destino correto (idoso/família → `/explore`; parceiro mantém comportamento atual).
3. Após o cadastro, existe um documento `users/{uid}` com `name`, `role` e `createdAt`.
4. Um usuário existente consegue entrar pela rota de login com e-mail e senha.
5. Fechar e reabrir o app mantém o usuário autenticado (persistência via AsyncStorage), sem novo login.
6. Executar logout limpa a sessão e retorna à tela de login.
7. Credenciais inválidas (e-mail já em uso, senha fraca, usuário/senha incorretos) produzem
   mensagem de erro legível, sem crash e sem travar a UI.

Perfil e `AccountContext`:

8. Após autenticação, `useAccount().account` expõe `{ name, role, uid }`; sem sessão expõe `null`.
9. `useAccount().loading` é `true` enquanto o estado de auth/perfil é resolvido e `false` depois.
10. As assinaturas `signUp`, `signIn`, `signOut`, `toggleFavorite(id)` e `isFavorite(id)` estão
    presentes no contexto; `toggleFavorite`/`isFavorite` preservam a mesma assinatura de hoje.

Favoritos:

11. Favoritar um negócio na `DiscoverScreen` ou `BusinessScreen` atualiza a UI imediatamente
    (otimista) e persiste no Firestore sob o usuário atual.
12. O mesmo estado de favorito aparece de forma consistente entre `DiscoverScreen` e `BusinessScreen`.
13. Reabrir o app com a mesma conta mantém os favoritos marcados.
14. Uma falha de escrita de favorito reverte o estado otimista na UI.

Avaliações:

15. A `BusinessScreen` lista as avaliações do negócio vindas do Firestore
    (`businesses/{businessId}/reviews`), não mais de um array fixo.
16. Enviar uma avaliação com estrelas (>0) e comentário não vazio grava no Firestore e a avaliação
    aparece no topo da lista; o botão permanece desabilitado se faltar nota ou comentário.
17. Média e contagem exibidas correspondem aos dados persistidos.

Tarefas de cuidado:

18. A `CareScreen` carrega tarefas do usuário do Firestore e exibe as views "Hoje" e "Semana"
    com o mesmo layout atual.
19. Marcar "Concluir" persiste o estado no Firestore; reabrir o app mantém a tarefa concluída
    (check verde, título riscado, card presente).
20. Um usuário sem tarefas gravadas recebe o seed inicial no primeiro acesso.

Documentos:

21. O usuário consegue selecionar um arquivo (document picker ou imagem) e enviá-lo para
    `users/{uid}/documents/` no Storage, com indicação de progresso/estado.
22. A tela lista os documentos enviados pelo usuário atual.
23. O usuário consegue remover um documento e a lista reflete a remoção.
24. Uma falha de upload/remoção é comunicada ao usuário sem crash.

Arquitetura e verificação:

25. Nenhum arquivo em `src/screens/*.tsx` importa `firebase` direta ou indiretamente; o acesso
    passa por `src/services/firebase/*`, contexto/hooks e wrappers de rota.
26. `src/services/firebase/` contém `config.ts`, init de singletons e `auth.ts`, `users.ts`,
    `favorites.ts`, `reviews.ts`, `tasks.ts`, `files.ts`.
27. A inicialização usa apenas `initializeApp`, Auth, Firestore e Storage; não há chamada a `getAnalytics`.
28. O Auth é inicializado com persistência React Native via AsyncStorage.
29. `.env.example` lista as variáveis `EXPO_PUBLIC_FIREBASE_*` e `config.ts` as lê com defaults commitados.
30. `npx expo lint` e `npx tsc --noEmit` passam sem erros.
31. As dependências novas (`firebase`, `@react-native-async-storage/async-storage`,
    `expo-document-picker`, `expo-image-picker`) estão instaladas em versões compatíveis com o
    SDK via `npx expo install`, e o app roda em Expo Go.

## Out of Scope

- FCM / notificações push / `expo-notifications` (reservado para a Wave 2).
- Migração para dev build / Continuous Native Generation; a Wave 1 permanece em Expo Go.
- Migrar o catálogo (`CATEGORY_DATA`/`discover-data.ts`) para o Firestore — permanece seed local.
- Adicionar framework ou suíte de testes.
- Mudanças de paleta, fontes ou design visual (navy `#11375C`, offwhite `#FDF9F6`,
  terracotta `#DD7C54`, Hanken Grotesk).
- `@react-native-firebase` e `getAnalytics`.
- Portal do Parceiro (role `partner`) continua sem destino, como hoje.
- Login social, link mágico, telefone, MFA e recuperação de senha (não previstos nesta wave).
- Endurecimento/entrega de regras de segurança do Firebase como código (configuração de console).
