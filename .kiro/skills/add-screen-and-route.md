---
name: add-screen-and-route
description: Criar uma tela nova no Elder+ respeitando a arquitetura de duas camadas (screen pura + wrapper de rota fino).
---

# Skill: Adicionar tela + rota

Use quando precisar de uma nova tela no app. A arquitetura é de **duas camadas** e não pode
ser quebrada.

## Camadas

| Arquivo | Papel | Pode importar |
|---------|-------|---------------|
| `src/screens/X Screen.tsx` | Componente **puro** de apresentação | React, react-native, `@/components/*`, `@expo/vector-icons`, tipos. **NÃO**: `expo-router`, `useSafeAreaInsets`, `firebase`, pickers. |
| `src/app/x.tsx` | **Wrapper fino** de rota | `expo-router`, `useSafeAreaInsets`, `@/state/account-context`, hooks de dados, a screen |

Regra: a screen recebe `topInset`/`bottomInset` (números) e callbacks (`onBack`, `onSelect...`,
`onNavigate`) via props. Quem lê roteador/insets/Firebase é sempre o wrapper.

## Passos

1. **Crie a screen pura** em `src/screens/`, nome `PascalCase` com sufixo `Screen`
   (ex.: `RemindersScreen.tsx`). Props tipadas inline. Nada de navegação dentro dela.
2. **Crie o wrapper** em `src/app/`, nome `kebab-case` (ex.: `reminders.tsx`). Ele:
   - lê `useRouter()`, `useSafeAreaInsets()`, `useLocalSearchParams()` quando preciso;
   - lê dados via `useAccount()` e/ou um hook de `src/hooks/`;
   - passa tudo para a screen por props.
3. **Registre a rota** em `src/app/_layout.tsx`, adicionando `<Stack.Screen name="reminders" />`
   na lista do `RootNavigator`.
4. Se a rota é protegida (exige login), **não** adicione o nome a `AUTH_ROUTES` — o
   `RootNavigator` já redireciona para `/` quem está deslogado fora das rotas de auth.
5. `npx tsc --noEmit` + `npx expo lint`.

## Esqueleto do wrapper (padrão real do projeto)

```tsx
// src/app/reminders.tsx
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { RemindersScreen } from '@/screens/RemindersScreen'
import { useAccount } from '@/state/account-context'

export default function Reminders() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()

  return (
    <RemindersScreen
      name={account?.name}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onBack={() => router.back()}
    />
  )
}
```

## Assinatura da screen pura

```tsx
// src/screens/RemindersScreen.tsx
import { ScrollView, Text, View } from 'react-native'

export function RemindersScreen({
  name,
  topInset = 0,
  bottomInset = 0,
  onBack,
}: {
  name?: string
  topInset?: number
  bottomInset?: number
  onBack: () => void
}) {
  // ...UI com className (NativeWind). Ver skill ui-design-system.
}
```

## Checklist de aceite

- [ ] Screen não importa `expo-router`, `useSafeAreaInsets`, `firebase` nem pickers
- [ ] Wrapper passa insets como props numéricas
- [ ] Rota registrada no `_layout.tsx`
- [ ] `tsc --noEmit` e `expo lint` limpos
