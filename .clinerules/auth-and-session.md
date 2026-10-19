---
name: auth-and-session
description: Alterar cadastro, login, sessão, perfil ou proteção de rota no Elder+ sem quebrar o fluxo de auth do Firebase.
---

# Skill: Autenticação e sessão

Use ao mexer em qualquer coisa de identidade: cadastro, login, logout, perfil, persistência de
sessão, redirecionamento por estado de auth.

## Peças e responsabilidades

| Arquivo | Papel |
|---------|-------|
| `src/services/firebase/auth.ts` | `signUp`/`signIn`/`logout`/`observeAuth` — único (com config) a importar `firebase/auth` |
| `src/services/firebase/users.ts` | `createProfile`/`getProfile`/`normalizeRole` — perfil em `users/{uid}` |
| `src/state/account-context.tsx` | Estado global de sessão; assina `observeAuth`, carrega perfil; expõe `useAccount()` |
| `src/app/_layout.tsx` | `RootNavigator` — **único dono** da navegação por estado de auth + gate de splash |
| `src/screens/SignupScreen.tsx` / `AuthLoginScreen.tsx` | Telas **puras**: coletam campos, chamam callbacks |
| `src/app/signup.tsx` / `login.tsx` | Wrappers que chamam `signUp`/`signIn` do contexto |

## Contrato do `useAccount()` (estado atual, pós-Onda 1)

```ts
account: { name: string; role: AccountRole; uid: string } | null
loading: boolean
signUp: (input: { name; role; email; password }) => Promise<void>
signIn: (input: { email; password }) => Promise<void>
signOut: () => Promise<void>
favorites: Set<string>; toggleFavorite(id): void; isFavorite(id): boolean
```

> Nota: steering antigo descreve `setAccount` e `account` sem `uid`. Isso é pré-Firebase e está
> **obsoleto** — o contrato real é o acima. `setAccount` não existe mais.

## Regras invioláveis

1. **O contexto consome `auth.ts`**, nunca importa `firebase/auth` direto. Mantém a fronteira de
   camada e evita múltiplas inicializações.
2. **`RootNavigator` é o único que navega por estado de auth.** Wrappers de signup/login **não**
   fazem `router.replace` para rota protegida — só setam `submitting`/`errorMessage` locais. Logado
   numa rota de auth → vai para `/explore`; deslogado fora de auth → volta para `/`.
3. **Gate de splash duplo**: a splash nativa só esconde quando `fontsReady && !loading`. Nunca
   mostrar frame pré-auth.
4. **Parceiro bloqueado no cadastro**: `signUp` normaliza o role e, se `partner`, lança
   `app/partner-not-available` **antes de qualquer chamada Firebase** — nenhum usuário/perfil de
   parceiro é criado. (Até o Portal do Parceiro existir.)
5. **Limpeza de usuário órfão**: se a escrita do perfil falhar após criar o usuário no Auth,
   `auth.signUp` faz `deleteUser` (fallback `signOut`) antes de rejeitar, liberando o email.
6. **Persistência de sessão** usa `getReactNativePersistence(AsyncStorage)` (SDK), importado do
   pacote interno `@firebase/auth` em `config.ts` — é uma fábrica que retorna uma classe
   `Persistence` real, então `initializeAuth` não lança "Expected a class definition". Os tipos vêm
   do entry RN via `paths` no `tsconfig.json` (`@firebase/auth` →
   `./node_modules/@firebase/auth/dist/rn/index.rn.d.ts`); não reintroduza o adaptador de objeto
   escrito à mão. O guard de inicialização só pode engolir `auth/already-initialized` (Fast Refresh)
   e deve re-lançar qualquer outra falha real — nunca um `catch` cego que mascare o erro.

## `AUTH_ROUTES`

`['index', 'login', 'signup']`. Rota nova pública entra aqui; rota protegida **não** entra (fica
coberta pelo redirect de deslogado).

## Validação de formulário (padrão)

- Signup: nome `> 1` char, email por regex simples, senha `>= 6`, mais `!submitting`. Botão
  desabilitado até `canContinue`.
- Login: validação fraca no cliente (ambos campos não vazios); o servidor valida de fato.
- Erros do Firebase viram mensagem em PT no `errorMessage` da tela (não vaze `code` cru ao usuário).

## Checklist de aceite

- [ ] Contexto não importa `firebase/auth` direto
- [ ] Nenhum wrapper navega por auth (só o `RootNavigator`)
- [ ] Parceiro continua bloqueado antes de tocar o Firebase
- [ ] Splash só esconde com `fontsReady && !loading`
- [ ] `tsc --noEmit` e `expo lint` limpos
