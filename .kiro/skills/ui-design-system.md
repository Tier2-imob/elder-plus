---
name: ui-design-system
description: Montar ou alterar UI no Elder+ mantendo o design system (paleta, tipografia, componentes-padrão, acessibilidade para público maduro).
---

# Skill: Design system

Use ao criar/alterar qualquer UI. O público é maduro: **minimalismo e acessibilidade primeiro**.

## Princípios

- Layout enxuto; **um único elemento de ousadia por tela** (ex.: card navy, asset laranja).
- Tudo interativo com **alvo de toque mínimo 56px de altura**.
- Nunca abaixo de `text-xs` para informação primária.
- **NativeWind only** (`className`). Nunca `StyleSheet.create`. `style` inline só para dinâmico
  (cor runtime, `translateY` animado, dimensão de imagem).

## Paleta (em `tailwind.config.js → theme.extend.colors`)

| Token | Hex | Uso |
|-------|-----|-----|
| `navy` | `#11375C` | primária: texto, ações, fundos de destaque |
| `offwhite` | `#FDF9F6` | fundo de tela |
| `terracotta` | `#DD7C54` | acento quente: CTA secundário, ativo, favorito |
| `ink` | `#16283A` | texto de corpo |
| `muted` | `#6B7A85` | texto secundário, placeholder |
| `hairline` | `#E4DCD3` | bordas, divisores |

Derivados inline: ícone navy `bg-navy/10`; ícone terracotta `bg-terracotta/10`; busca em card navy
`bg-white/10`; chip inativo `#70879D`; concluído/verde `#388E3C` (check), `#C8E6C9` (fundo),
`#F5FBF5` (card). **Não introduza cores novas fora disso.**

## Tipografia (Hanken Grotesk, 4 pesos)

| Classe | Uso |
|--------|-----|
| `font-hanken-extrabold` | título principal — **um por tela** |
| `font-hanken-bold` | subtítulos, nomes de card, rótulos de seção |
| `font-hanken-medium` | labels de campo, chips ativos |
| `font-hanken` | corpo, descrições, placeholders |

## Cantos

Cards de listagem `rounded-2xl` · cards de tarefa (CareScreen) `rounded-3xl` · botão principal
`rounded-2xl` · pills/chips `rounded-full` · ícone quadrado `rounded-2xl` (46–56px) ou `rounded-xl`
(34–38px) · botão circular (voltar/favoritar) `rounded-full`.

## Componentes-padrão (copie estes)

Card de listagem:
```tsx
<Pressable className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white active:opacity-70">
  <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
    <MaterialIcons name={icon} size={22} color="#11375C" />
  </View>
  <View className="flex-1">
    <Text className="font-hanken-bold text-navy text-[15px]">Título</Text>
    <Text className="font-hanken text-muted text-[12.5px]">Subtítulo</Text>
  </View>
</Pressable>
```

Botão de ação principal:
```tsx
<Pressable className="min-h-[56px] rounded-2xl bg-navy flex-row items-center justify-center gap-2.5 active:opacity-90">
  <Text className="font-hanken-bold text-white text-base">Rótulo</Text>
</Pressable>
```

Botão circular:
```tsx
<Pressable className="w-[38px] h-[38px] rounded-full border border-hairline bg-white items-center justify-center active:opacity-70">
  <MaterialIcons name="arrow-back" size={18} color="#11375C" />
</Pressable>
```

## Logo

Sempre o componente, nunca `<Image>` direto: `import { Logo } from '@/components/Logo'`.
`<Logo size="sm" />` (80×24, topo de telas internas), `md` (112×32), `lg` (144×40). O componente
usa `style` inline para dimensão — **nunca `className` de tamanho em imagem** (o preflight do
Tailwind sobrescreve `height` no web).

## Ícones, mapas, animação

- Ícones: `@expo/vector-icons/MaterialIcons`. Não desenhar SVG quando houver glyph equivalente.
- Mapa: `react-native-webview` com iframe do Google Maps Embed (não `react-native-maps`).
- Animação: `react-native-reanimated` — `useSharedValue` + `useAnimatedStyle` + `withTiming`.
  Efeito padrão `duration: 320, easing: Easing.out(Easing.cubic)`.

## FloatingNav

Pill navy centralizado, `bottom: insets.bottom + 20`. Aba ativa: fundo terracotta + ícone branco +
label; inativa: transparente + ícone `rgba(255,255,255,0.5)`. Presente em Explore e Care.

## Checklist de aceite

- [ ] Só tokens da paleta; nenhuma cor nova
- [ ] Um `font-hanken-extrabold` por tela
- [ ] Interativos com ≥56px de altura
- [ ] `className` para estilo; `style` inline só para dinâmico
- [ ] Logo via componente
