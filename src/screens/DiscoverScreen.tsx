import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { WebView } from 'react-native-webview'
import { Logo } from '@/components/Logo'
import { useAccount } from '@/state/account-context'

const CHIP_INACTIVE = '#70879d'

type Filter = { id: string; label: string }
const FILTERS: Filter[] = [
  { id: 'nearby', label: 'Mais próximo' },
  { id: 'rated',  label: 'Mais avaliados' },
  { id: 'recent', label: 'Recentes' },
]

export type ServiceItem = {
  id: string
  name: string
  tag: string
  distance: number
  rating: number
  recency: number
  icon: keyof typeof MaterialIcons.glyphMap
}

function sortItems(items: ServiceItem[], filter: string): ServiceItem[] {
  const copy = [...items]
  if (filter === 'nearby') return copy.sort((a, b) => a.distance - b.distance)
  if (filter === 'rated')  return copy.sort((a, b) => b.rating - a.rating)
  if (filter === 'recent') return copy.sort((a, b) => b.recency - a.recency)
  return copy
}

const CARD_HEIGHT = 92
const CARD_GAP    = 12

function ServiceCard({
  item,
  targetY,
  onPress,
}: {
  item: ServiceItem
  targetY: number
  onPress: () => void
}) {
  const { isFavorite, toggleFavorite } = useAccount()
  const translateY = useSharedValue(targetY)

  useEffect(() => {
    translateY.value = withTiming(targetY, { duration: 320, easing: Easing.out(Easing.cubic) })
  }, [targetY])

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))

  const distanceLabel =
    item.distance >= 1000
      ? `${(item.distance / 1000).toFixed(1).replace('.', ',')} km`
      : `${item.distance} m`

  const fav = isFavorite(item.id)

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0 }, animStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onPress={onPress}
        className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white active:opacity-70"
      >
        <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
          <MaterialIcons name={item.icon} size={22} color="#11375C" />
        </View>
        <View className="flex-1">
          <Text className="font-hanken-bold text-navy text-[15px] mb-0.5">{item.name}</Text>
          <Text className="font-hanken text-muted text-[12px]">{item.tag}</Text>
          <View className="flex-row items-center gap-1 mt-1">
            <MaterialIcons name="star" size={11} color="#DD7C54" />
            <Text className="font-hanken-medium text-[11px] text-muted">
              {item.rating.toFixed(1)} · {distanceLabel}
            </Text>
          </View>
        </View>
        {/* View com onStartShouldSetResponder impede que o toque no favoritar
            propague para o Pressable pai — funciona tanto em mobile quanto web. */}
        <View onStartShouldSetResponder={() => true}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={8}
            className="w-9 h-9 rounded-full border border-hairline bg-offwhite items-center justify-center active:opacity-70"
          >
            <MaterialIcons name={fav ? 'favorite' : 'favorite-border'} size={17} color={fav ? '#DD7C54' : '#70879d'} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  )
}

export function DiscoverScreen({
  categoryLabel,
  items,
  onBack,
  onSelectItem,
  topInset = 0,
}: {
  categoryLabel: string
  items: ServiceItem[]
  onBack: () => void
  onSelectItem: (item: ServiceItem) => void
  topInset?: number
}) {
  const [activeFilter, setActiveFilter] = useState('nearby')
  const sorted = sortItems(items, activeFilter)

  const positionMap: Record<string, number> = {}
  sorted.forEach((item, index) => { positionMap[item.id] = index * (CARD_HEIGHT + CARD_GAP) })
  const listHeight = sorted.length * (CARD_HEIGHT + CARD_GAP) - CARD_GAP

  return (
    <View className="flex-1 bg-offwhite">
      <View className="flex-row items-center justify-between px-6 pb-4 bg-offwhite" style={{ paddingTop: topInset + 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          className="w-[38px] h-[38px] rounded-full border border-hairline bg-white items-center justify-center active:opacity-70"
        >
          <MaterialIcons name="arrow-back" size={18} color="#11375C" />
        </Pressable>
        <Logo size="sm" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 mb-4">
          <Text className="font-hanken-extrabold text-navy text-2xl">{categoryLabel}</Text>
        </View>

        <View className="mx-6 mb-6 rounded-2xl border border-hairline bg-white px-4 pt-3 pb-4">
          <Text className="font-hanken-bold text-navy text-xs mb-3 uppercase tracking-widest">Filtros</Text>
          <View className="flex-row gap-2">
            {FILTERS.map((filter) => {
              const isActive = filter.id === activeFilter
              return (
                <Pressable
                  key={filter.id}
                  accessibilityRole="button"
                  onPress={() => setActiveFilter(filter.id)}
                  className="flex-1 items-center py-2.5 rounded-full active:opacity-70"
                  style={{ backgroundColor: isActive ? '#DD7C54' : 'transparent', borderWidth: 1.4, borderColor: isActive ? '#DD7C54' : CHIP_INACTIVE }}
                >
                  <Text className="font-hanken-medium text-xs text-center" style={{ color: isActive ? '#FFFFFF' : CHIP_INACTIVE }} numberOfLines={1}>
                    {filter.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View className="px-6" style={{ height: listHeight }}>
          {items.map((item) => (
            <ServiceCard
              key={item.id}
              item={item}
              targetY={positionMap[item.id]}
              onPress={() => onSelectItem(item)}
            />
          ))}
        </View>

        {/* Mapa — iframe do Google Maps Embed dentro de um HTML local,
            contornando a restrição "must be used in an iframe" do Maps Embed API. */}
        <View className="px-6 mt-6">
          <Text className="font-hanken-bold text-navy text-base mb-3">Ver no mapa</Text>
          <View
            className="overflow-hidden border border-hairline"
            style={{ height: 220, borderRadius: 20 }}
          >
            <WebView
              originWhitelist={['*']}
              source={{
                html: `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe
    src="https://www.google.com/maps/embed/v1/search?key=AIzaSyBrcRjYlfjw4ojqOPSHCIX0v7d0JorpZog&q=${encodeURIComponent(categoryLabel)}&zoom=14"
    allowfullscreen
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade">
  </iframe>
</body>
</html>`,
              }}
              style={{ flex: 1 }}
              javaScriptEnabled
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}