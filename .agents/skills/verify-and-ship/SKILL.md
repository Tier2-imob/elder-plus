---
name: verify-and-ship
description: Verificar, commitar e integrar mudanças no Elder+ com segurança — gates obrigatórios e fluxo de branch/worktree.
---

# Skill: Verificar e integrar

Use ao fechar qualquer tarefa. Verificação não é opcional e um gate verde de lint/tsc **não**
prova comportamento de runtime do Firebase.

## Onde você está trabalhando

O desenvolvimento ativo acontece no **worktree** do branch de feature, não na raiz:
`c:\Users\savio\OneDrive\Tier2\Elder\elder\.worktrees\firebase-core` (branch `feat/firebase-core`).
A raiz do repositório fica no `main`. Rode comandos e commits a partir do worktree.

## Gates obrigatórios (antes de dizer "pronto")

```bash
npx tsc --noEmit     # 0 erros
npx expo lint        # 0 erros (warnings pré-existentes em arquivos não tocados são toleráveis)
```

Opcional de diagnóstico: `npx expo-doctor`, `npx expo install --fix`.

**Não** rode `npx expo start` como processo bloqueante num agente — isso é um dev server de longa
duração. Peça ao humano para rodar o smoke test.

## O que tsc/lint NÃO provam

Credenciais, `storageBucket`, regras de segurança e persistência só se validam **rodando o app**
(Expo Go) com os serviços ativados no console. Ao concluir uma tarefa que toca o Firebase, declare
explicitamente **o que foi verificado por inspeção vs. executado**, e liste o smoke test que o
humano precisa fazer:

- cadastro elder/family → `/explore`; parceiro bloqueado
- login + persistência de sessão após relançar o app
- o dado novo persiste e sobrevive a restart
- (Storage) um upload+listar+excluir real — único jeito de provar o `storageBucket`

## Dependências

Sempre `npx expo install <pkg>` (resolve versão compatível com a SDK). Nunca `npm/yarn/pnpm add`
direto. Depois de adicionar lib com código nativo, lembre que **Expo Go só tem os módulos
embutidos** — push/FCM e afins exigem development build (fora de escopo até a Onda 2).

## Git — segurança

- **Nunca** commite sem o humano pedir, quando a instrução for ambígua.
- Prefira `git add <arquivos>` específicos a `git add .`.
- Sinalize arquivos que possam ter segredo antes de commitar. (Chaves web do Firebase não são
  segredo, mas ficam via env em `config.ts` por higiene.)
- **Nunca** faça push direto no `main`. Trabalhe no branch de feature.
- Não use operações destrutivas (`push --force`, `reset --hard`, `clean -f`, `branch -D`) sem
  autorização explícita. Não altere `git config`. Não pule hooks (`--no-verify`).
- Mensagens de commit claras e escopadas por feature.

## Integração

- O remoto é `origin` → `https://github.com/Tier2-imob/elder-plus.git`.
- Publicar o branch: `git push -u origin feat/firebase-core`.
- **Não integre ao `main` sem o smoke test passar.** Quando integrar, prefira PR no GitHub
  (rastreável) a um fast-forward local silencioso. A decisão de integrar é do humano.

## Steering desatualizado

Vários steering em `.kiro/steering` ainda descrevem o Elder+ como protótipo em memória
(sem backend/auth/persistência). Isso ficou **obsoleto** após a Onda 1. Quando um steering
conflitar com o código real do branch ou com estas skills, o código e as skills vencem — e vale
sinalizar ao humano que o steering precisa ser atualizado.

## Checklist de aceite

- [ ] `tsc --noEmit` e `expo lint` limpos
- [ ] Declarado o que foi verificado por inspeção vs. executado
- [ ] Smoke test de runtime listado para o humano (se tocou Firebase)
- [ ] Dependências via `npx expo install`
- [ ] Sem commit/integração não autorizados; nada direto no `main`
