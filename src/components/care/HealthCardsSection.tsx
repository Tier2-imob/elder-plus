import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native'

import type { HealthCard } from './types'

const GAP = 12
const CARD_HEIGHT = 196

/**
 * "Cartões do plano de saúde": a row of cards you swipe through, one centered at a time.
 *
 * Order: the "adicionar cartão" card first, then the registered cards (the first one registered
 * right after it, later ones to its right). With no card, the add card is alone and centered; once
 * there is a card, the row opens on it. A viewer who can't edit sees the cards without the add
 * card and without the pencil.
 */
export function HealthCardsSection({
  cards,
  loading = false,
  error,
  onAdd,
  onEdit,
  readOnly = false,
}: {
  cards: HealthCard[]
  loading?: boolean
  error?: string
  onAdd: () => void
  onEdit: (card: HealthCard) => void
  /** Viewer without `editar-saude`. */
  readOnly?: boolean
}) {
  const scroll = useRef<ScrollView>(null)
  const [width, setWidth] = useState(0)
  // Where the first registered card sits: after the add card, or at the start for a viewer without it.
  const firstCardIndex = readOnly ? 0 : 1
  const hasCards = cards.length > 0
  const didOpenOnCard = useRef(false)

  const cardWidth = Math.max(0, width - 48)
  const interval = cardWidth + GAP
  const sidePadding = Math.max(0, (width - cardWidth) / 2)

  // Open on the first registered card; and when the very first card is added, bring it to the center.
  useEffect(() => {
    if (!hasCards) {
      didOpenOnCard.current = false
      return
    }
    if (width === 0 || didOpenOnCard.current) return
    didOpenOnCard.current = true
    scroll.current?.scrollTo({ x: firstCardIndex * interval, animated: false })
  }, [hasCards, width, firstCardIndex, interval])

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width)
  }

  if (loading && !hasCards) {
    return <Text className="font-hanken text-muted text-sm px-1 py-4">Carregando cartões…</Text>
  }

  return (
    <View onLayout={handleLayout}>
      {error ? <Text className="font-hanken-medium text-terracotta text-[13px] mb-3">{error}</Text> : null}

      {width > 0 ? (
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          snapToAlignment="start"
          decelerationRate="fast"
          // Bleed to the screen edges so the neighbouring cards peek in from both sides.
          style={{ marginHorizontal: -24 }}
          contentContainerStyle={{ paddingHorizontal: 24 + sidePadding, gap: GAP }}
        >
          {readOnly ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar cartão do plano de saúde"
              onPress={onAdd}
              className="rounded-3xl border-2 border-dashed items-center justify-center px-6 active:opacity-70"
              style={{
                width: cardWidth,
                height: CARD_HEIGHT,
                borderColor: '#11375C',
                backgroundColor: 'rgba(17,55,92,0.04)',
              }}
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center bg-navy/10 mb-3">
                <MaterialIcons name="add" size={26} color="#11375C" />
              </View>
              <Text className="font-hanken-bold text-navy text-[17px] mb-1">Adicionar cartão</Text>
              {hasCards ? null : (
                <Text className="font-hanken text-muted text-[14px] leading-5 text-center">
                  Nenhum cartão do plano de saúde cadastrado. Toque aqui para adicionar o primeiro.
                </Text>
              )}
            </Pressable>
          )}

          {cards.map((card) => (
            <View
              key={card.id}
              className="rounded-3xl bg-navy p-5 justify-between"
              style={{ width: cardWidth, height: CARD_HEIGHT }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="font-hanken-extrabold text-white text-[20px] leading-6" numberOfLines={1}>
                    {card.operator}
                  </Text>
                </View>
                {readOnly ? (
                  <MaterialIcons name="health-and-safety" size={24} color="#FFFFFF" />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar o cartão ${card.operator}`}
                    onPress={() => onEdit(card)}
                    hitSlop={10}
                    className="w-9 h-9 rounded-full items-center justify-center active:opacity-60"
                    style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
                  >
                    <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              <View>
                <Text className="font-hanken text-white/70 text-[12px] uppercase tracking-widest mb-0.5">
                  Carteirinha
                </Text>
                <Text className="font-hanken-bold text-white text-[20px] mb-2" numberOfLines={1}>
                  {card.number}
                </Text>
                <View className="flex-row items-end justify-between">
                  <Text className="font-hanken-medium text-white/90 text-[14px] flex-1 mr-3" numberOfLines={1}>
                    {card.holder}
                  </Text>
                  {card.code ? (
                    <Text className="font-hanken-medium text-white/90 text-[14px]" numberOfLines={1}>
                      Cód. {card.code}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}

          {readOnly && !hasCards ? (
            <View
              className="rounded-3xl border border-hairline bg-white items-center justify-center px-6"
              style={{ width: cardWidth, height: CARD_HEIGHT }}
            >
              <MaterialIcons name="health-and-safety" size={28} color="#11375C" />
              <Text className="font-hanken text-muted text-[14px] text-center mt-2">
                Nenhum cartão do plano de saúde cadastrado.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  )
}
