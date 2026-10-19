# Elder+ — Skills

Guias de execução de tarefa para o app Elder+ (Expo + React Native + Firebase).
Diferem dos *steering* (que descrevem "como o projeto é"): cada skill aqui descreve
**como executar uma tarefa recorrente** com fidelidade aos padrões reais do código.

> Contexto importante: desde a Onda 1, o Elder+ deixou de ser protótipo em memória e
> passou a ser um produto com backend Firebase (Auth + Firestore + Storage). Vários
> steering antigos ainda descrevem o estado de protótipo — quando houver conflito, o
> código real do branch `feat/firebase-core` e estas skills têm precedência.

## Antes de qualquer tarefa (obrigatório)

1. **Nunca confie na memória para APIs Expo/Firebase/RN.** O Expo quebra APIs a cada SDK.
   Leia a major do `expo` em `package.json` (hoje SDK 57) e consulte
   `https://docs.expo.dev/versions/v57.0.0/` e `https://docs.expo.dev/llms.txt`.
   Para a SDK JS do Firebase, use a API modular v9+ e confirme em
   `https://firebase.google.com/docs`.
2. **Instale dependências com `npx expo install <pkg>`** — nunca `npm/yarn add` direto.
3. **Rode `npx tsc --noEmit` e `npx expo lint` antes de declarar qualquer tarefa concluída.**
4. **Não rode `npx expo start` como processo bloqueante** num agente — peça ao humano rodar.

## Índice de skills

| Skill | Quando usar |
|-------|-------------|
| [add-screen-and-route.md](./add-screen-and-route.md) | Criar uma tela nova (screen pura + wrapper de rota) |
| [firebase-service-and-hook.md](./firebase-service-and-hook.md) | Persistir um novo tipo de dado no Firestore/Storage |
| [auth-and-session.md](./auth-and-session.md) | Mexer em cadastro, login, sessão, perfil ou proteção de rota |
| [ui-design-system.md](./ui-design-system.md) | Montar/alterar UI mantendo o design system |
| [verify-and-ship.md](./verify-and-ship.md) | Verificar, commitar e integrar com segurança |

## Invariantes que nenhuma tarefa pode violar

- **Screens são puras.** `src/screens/*.tsx` não importam `expo-router`, `useSafeAreaInsets`,
  nem nada de `firebase`/pickers. Recebem tudo via props. Firebase vive em
  `src/services/firebase/` e é consumido por hooks (`src/hooks/`) e wrappers (`src/app/`).
- **Um `AccountProvider` só**, na raiz (`src/app/_layout.tsx`). Nunca aninhar outro.
- **Sem `getAnalytics`** em lugar nenhum (quebra em React Native).
- **`config.ts` é o único arquivo que inicializa o Firebase** (`initializeApp`/`initializeAuth`/
  `getFirestore`/`getStorage`).
- **NativeWind only** para estilo (`className`), nunca `StyleSheet.create`. `style` inline só
  para valores dinâmicos (cores runtime, `translateY` animado, dimensões de imagem).
- **Paleta e tipografia fixas** (navy `#11375C`, offwhite `#FDF9F6`, terracotta `#DD7C54`,
  Hanken Grotesk em 4 pesos). Não introduzir cores/fontes novas.
- **Parceiro (`partner`) é bloqueado no cadastro** antes de qualquer chamada Firebase (Onda 1).
