# Implementation Plan — Aceite explícito de Termos & Privacidade + registro de consentimento LGPD

Escopo: fluxo de cadastro e-mail/senha do Elder+, com consistência no path de cadastro Google.
Stack confirmada: Expo SDK 57, Expo Router 57, React Native 0.86, NativeWind 4, Firebase 13, TypeScript ~6.0. Sem framework de testes no projeto — verificação é `npx tsc --noEmit` + `npx expo lint`.

## Decisões de design (com justificativa)

- **Local do TERMS_VERSION**: adicionar `export const TERMS_VERSION = '1.0'` em `src/constants/constants.ts`. Esse já é o módulo de constantes compartilhado do app e não importa Firebase, então o wrapper (`signup.tsx`) e o contexto podem importá-lo sem violar fronteiras. A tela `SignupScreen` já importa `ROLE_CONTEXT` daqui, mas por regra ela NÃO importará `TERMS_VERSION` — a versão de registro é injetada pelo wrapper/contexto, nunca pela tela pura. Alternativa descartada: módulo novo `src/constants/terms.ts` — desnecessário, acrescenta arquivo sem ganho; `constants.ts` é o ponto natural.
- **Como o aceite trafega**: a tela é pura e não conhece a versão dos termos. Ela só reporta o fato booleano do aceite via `onContinue({ name, email, password, acceptedTerms: true })`. O wrapper/contexto é quem conhece e injeta `TERMS_VERSION`; a camada de serviço (`users.ts`) carimba `termsAcceptedAt` com `serverTimestamp()`. Isso mantém a tela pura e o timestamp confiável (gerado no servidor, não no cliente).
- **Assinatura de `createProfile`**: `termsVersion` e `termsAcceptedAt` serão parâmetros OBRIGATÓRIOS, para forçar que ambos os call sites (e-mail e Google signup) registrem consentimento — um modelo de dados consistente. `termsAcceptedAt` é passado como o sentinela `serverTimestamp()` (tipo `FieldValue`), carimbado dentro de `createProfile`.
- **Controle de aceite**: não há componente checkbox existente no código. Será construído inline na tela com `Pressable` + `accessibilityRole="checkbox"` + `accessibilityState={{ checked: accepted }}`, seguindo o design system (navy/terracotta/hairline, `font-hanken*`, cantos arredondados, bordas `border-hairline`) já usado nos inputs e botões da tela.

## Caminho de threading (ponta a ponta)

`SignupScreen` (estado `accepted`, envia `acceptedTerms`) → `signup.tsx` `handleContinue` (recebe `acceptedTerms`, chama `signUp`) → `account-context.signUp` (importa `TERMS_VERSION`, repassa `termsVersion`) → `auth.signUp` (repassa a `createProfile`) → `users.createProfile` (escreve `termsVersion` + `termsAcceptedAt: serverTimestamp()` em `users/{uid}`).

Path Google: `signup.tsx` `handleGoogle` → `context.signInWithGoogle({ mode:'signup', role })` → `auth.signInWithGoogle` (no branch de NOVO usuário, chama `createProfile` com `termsVersion: TERMS_VERSION` + `termsAcceptedAt: serverTimestamp()`).

---

## Itens

- [ ] 1. Adicionar a fonte única da versão dos termos em `src/constants/constants.ts`.
      Acrescentar `export const TERMS_VERSION = '1.0'` com um comentário explicando que bumpar o valor significa uma nova revisão dos termos que exige novo consentimento do usuário. Não alterar `ROLE_CONTEXT`.
      Files: src/constants/constants.ts
      Verify: `npx tsc --noEmit` — sem erros novos.

- [ ] 2. Estender o modelo de dados do perfil em `src/services/firebase/types.ts`.
      Adicionar a `UserProfile` os campos `termsAcceptedAt: Timestamp | null` e `termsVersion: string`. Manter `createdAt` como está. `Timestamp` já é importado de `firebase/firestore` no arquivo.
      Files: src/services/firebase/types.ts
      Verify: `npx tsc --noEmit` — o tipo compila; itens 3 e 4 passam a precisar fornecer/ler os campos (esperado — serão corrigidos nos próximos passos).

- [ ] 3. Estender `createProfile` e `getProfile` em `src/services/firebase/users.ts`.
      `createProfile`: adicionar ao objeto `input` os parâmetros obrigatórios `termsVersion: string` e `termsAcceptedAt: FieldValue` (importar `FieldValue` de `firebase/firestore`); gravar no doc `users/{uid}` `termsVersion: input.termsVersion` e `termsAcceptedAt: input.termsAcceptedAt` (que será `serverTimestamp()` vindo do caller). Manter `createdAt: serverTimestamp()`. `getProfile`: ler de volta `termsVersion: data.termsVersion ?? ''` e `termsAcceptedAt: data.termsAcceptedAt ?? null`.
      Files: src/services/firebase/users.ts
      Verify: `npx tsc --noEmit` — `users.ts` compila; os dois call sites de `createProfile` em `auth.ts` agora acusam erro de parâmetros faltando (esperado — corrigido no item 4).

- [ ] 4. Atualizar os DOIS call sites de `createProfile` e a assinatura de `signUp` em `src/services/firebase/auth.ts`.
      Importar `serverTimestamp` de `firebase/firestore`. Estender `signUp` para aceitar `termsVersion: string` no input e repassá-lo a `createProfile` junto com `termsAcceptedAt: serverTimestamp()`. No branch de NOVO usuário de `signInWithGoogle` (mode:'signup'), passar `termsVersion: TERMS_VERSION` (importar de `@/constants/constants`) e `termsAcceptedAt: serverTimestamp()`. Não alterar o partner-block nem a limpeza de usuário órfão em nenhum dos dois paths.
      Files: src/services/firebase/auth.ts
      Verify: `npx tsc --noEmit` — ambos os call sites compilam; `signUp` agora exige `termsVersion`, o que faz o contexto (item 5) acusar erro até ser atualizado (esperado).

- [ ] 5. Threading no contexto: atualizar `signUp` em `src/state/account-context.tsx`.
      Importar `TERMS_VERSION` de `@/constants/constants`. Estender a assinatura de `signUp` em `AccountContextValue` e na implementação para aceitar `acceptedTerms: boolean` no input; repassar `termsVersion: TERMS_VERSION` a `auth.signUp`. Defesa em profundidade: se `acceptedTerms !== true`, lançar um erro com `code = 'app/terms-not-accepted'` ANTES de qualquer chamada Firebase (espelhando o padrão do partner-block). NÃO importar `firebase/auth` nem `firebase/firestore`. Não alterar `resolveAccount`, o guard `provisioningUidsRef`, nem o fluxo do `signInWithGoogle` do contexto.
      Files: src/state/account-context.tsx
      Verify: `npx tsc --noEmit` — contexto compila; o wrapper (item 6) agora precisa fornecer `acceptedTerms` (esperado).

- [ ] 6. Atualizar o wrapper `src/app/signup.tsx` para repassar o aceite.
      Alterar `handleContinue` para aceitar `{ name, email, password, acceptedTerms }` de `onContinue` e repassar `acceptedTerms` para `signUp({ name, role, email, password, acceptedTerms })`. O path Google (`handleGoogle`) não muda (o aceite nele já é tratado em `auth.signInWithGoogle`). Não introduzir navegação (RootNavigator continua o único dono).
      Files: src/app/signup.tsx
      Verify: `npx tsc --noEmit` — wrapper compila; o prop `onContinue` da tela agora é mais largo, exigindo o item 7.

- [ ] 7. Adicionar o controle de aceite explícito e acessível em `src/screens/SignupScreen.tsx`.
      Adicionar estado local `const [accepted, setAccepted] = useState(false)`. Estender a assinatura de `onContinue` do prop para `(input: { name: string; email: string; password: string; acceptedTerms: boolean }) => void`. Substituir a frase passiva atual ("Ao continuar, você concorda com os Termos e a Privacidade do Elder.") por uma linha de aceite: um `Pressable` com `accessibilityRole="checkbox"`, `accessibilityState={{ checked: accepted }}`, `accessibilityLabel` em PT-BR claro (ex: "Aceito os Termos de Uso e a Política de Privacidade do Elder+"), que faz toggle de `accepted`; um indicador visual de check (MaterialIcons `check-box` / `check-box-outline-blank`, ou caixa `border-hairline` arredondada preenchida em navy quando marcada) e o texto referenciando "Termos de Uso" e "Política de Privacidade" do Elder+. Estender o memo `canContinue` para também exigir `accepted` (continua dependendo de nome>1, email regex, senha>=6, `!submitting`). Em `handleContinue`, bloquear se `!accepted` (defesa em profundidade) e chamar `onContinue({ name: name.trim(), email: email.trim(), password, acceptedTerms: true })`. NÃO importar Firebase nem `TERMS_VERSION`; manter a tela pura. Seguir o estilo dos inputs/botões existentes (navy/terracotta/hairline, `font-hanken*`, cantos arredondados).
      Files: src/screens/SignupScreen.tsx
      Verify: `npx tsc --noEmit` — todo o projeto compila limpo (toda a cadeia de threading está completa).

- [ ] 8. Verificação final do projeto inteiro.
      Rodar typecheck e lint completos e garantir que nenhum item regrediu (cadastro e-mail ainda cria perfil + navega via RootNavigator; Google signup intacto com o race-fix do contexto; contexto não importa `firebase/auth`; tela pura sem Firebase).
      Files: (nenhum — apenas verificação)
      Verify: `npx tsc --noEmit` sem erros E `npx expo lint` sem erros/avisos novos.

## Lacunas e suposições

- **Rotas/telas de Termos e Privacidade**: não existem rotas dedicadas para exibir o texto dos termos. O escopo desta tarefa é o aceite + registro, não o conteúdo legal. Suposição: o label/linha de aceite referencia "Termos de Uso" e "Política de Privacidade" como texto; links para telas dedicadas ficam fora de escopo (podem ser adicionados depois sem alterar o modelo de consentimento).
- **Regras do Firestore**: a tarefa não pede alteração de security rules; os dois campos novos são gravados pelo mesmo caminho autenticado que já grava `createdAt`. Sem mudança de regras.
- **Perfis legados**: usuários criados antes desta mudança não terão os campos. `getProfile` usa fallback (`?? ''` / `?? null`), então não quebra a leitura de perfis antigos.

---

## Verification note

Executado em: Windows / PowerShell, na raiz do projeto.

- `npx tsc --noEmit` → **Exit Code 0** (sem erros).
- `npx expo lint` → **Exit Code 0**, 0 erros / 1 aviso — apenas o aviso pré-existente de `react-hooks/exhaustive-deps` em `src/screens/DiscoverScreen.tsx:53` (`translateY`), aceito pelo escopo da tarefa. Nenhum aviso novo introduzido.

`TERMS_VERSION`: valor **`'1.0'`**, definido em **`src/constants/constants.ts`** (exportado como `export const TERMS_VERSION`), com comentário de que bumpar o valor é uma nova revisão que exige novo consentimento.

Arquivos alterados:
- `src/constants/constants.ts` — adicionado `export const TERMS_VERSION = '1.0'`.
- `src/services/firebase/types.ts` — `UserProfile` ganhou `termsAcceptedAt: Timestamp | null` e `termsVersion: string`.
- `src/services/firebase/users.ts` — `createProfile` recebe e grava `termsVersion` + `termsAcceptedAt` (params obrigatórios; `termsAcceptedAt` é `FieldValue`/`serverTimestamp()` do caller); `getProfile` lê de volta os campos com fallback.
- `src/services/firebase/auth.ts` — importa `serverTimestamp` e `TERMS_VERSION`; `signUp` aceita `termsVersion` e carimba `termsAcceptedAt: serverTimestamp()`; o branch de novo usuário de `signInWithGoogle` passa `termsVersion: TERMS_VERSION` + `termsAcceptedAt: serverTimestamp()`. Partner-block e orphan-cleanup intactos nos dois paths.
- `src/services/firebase/auth-errors.ts` — mensagem PT-BR para `app/terms-not-accepted`.
- `src/state/account-context.tsx` — importa `TERMS_VERSION`; `signUp` aceita `acceptedTerms`, bloqueia com `app/terms-not-accepted` (defesa em profundidade) antes de qualquer chamada Firebase, e repassa `termsVersion: TERMS_VERSION`. `resolveAccount`/`provisioningUidsRef`/fluxo Google inalterados. Não importa `firebase/auth`.
- `src/app/signup.tsx` — `handleContinue` recebe e repassa `acceptedTerms`. Sem navegação (RootNavigator segue único dono).
- `src/screens/SignupScreen.tsx` — tela pura (sem Firebase): estado `accepted`, linha de aceite `Pressable` com `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}` + `accessibilityLabel` PT-BR, `canContinue` passa a exigir `accepted`, `handleContinue` bloqueia se `!accepted` e envia `acceptedTerms: true`.
