import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Logo } from '@/components/Logo'
import { CATEGORY_LABELS } from '@/data/discover-data'
import type { ServiceItem } from '@/screens/DiscoverScreen'

export type FavoriteBusiness = ServiceItem & { categoryId: string }

function distanceLabel(distance: number) {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1).replace('.', ',')} km` : `${distance} m`
}

/** The businesses the user favorited, one tap from their page; the heart removes it. */
export function FavoritesScreen({
  items,
  onOpen,
  onRemove,
  onExplore,
  topInset = 0,
  bottomInset = 0,
}: {
  items: FavoriteBusiness[]
  onOpen: (item: FavoriteBusiness) => void
  onRemove: (item: FavoriteBusiness) => void
  onExplore: () => void
  topInset?: number
  bottomInset?: number
}) {
  return (
    <View className="flex-1 bg-offwhite">
      <View className="px-6 pb-4" style={{ paddingTop: topInset + 16 }}>
        <Logo size="sm" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottomInset + 120 }}
      >
        <Text accessibilityRole="header" className="font-hanken-bold text-navy text-3xl mb-1">
          Favoritos
        </Text>
        <Text className="font-hanken text-muted text-[15px] leading-[22px] mb-5">
          Os negócios que você salvou para voltar quando precisar.
        </Text>

        {items.length === 0 ? (
          <View className="items-center rounded-2xl border border-hairline bg-white px-6 py-10">
            <View className="w-[56px] h-[56px] rounded-2xl items-center justify-center bg-navy/10 mb-4">
              <MaterialIcons name="favorite-border" size={28} color="#11375C" />
            </View>
            <Text className="font-hanken-bold text-navy text-lg text-center mb-1">Nenhum favorito ainda</Text>
            <Text className="font-hanken text-muted text-[15px] leading-[22px] text-center mb-5">
              Toque no coração de um negócio para guardá-lo aqui.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onExplore}
              className="min-h-[56px] px-6 rounded-2xl items-center justify-center bg-navy active:opacity-90"
            >
              <Text className="font-hanken-bold text-white text-base">Explorar negócios</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.tag}`}
              onPress={() => onOpen(item)}
              className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white mb-3 active:opacity-70"
            >
              <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
                <MaterialIcons name={item.icon} size={22} color="#11375C" />
              </View>
              <View className="flex-1">
                <Text className="font-hanken-bold text-navy text-[15px] mb-0.5">{item.name}</Text>
                <Text className="font-hanken text-muted text-[12px]">
                  {CATEGORY_LABELS[item.categoryId] ?? item.tag} · {item.tag}
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <MaterialIcons name="star" size={11} color="#DD7C54" />
                  <Text className="font-hanken-medium text-[11px] text-muted">
                    {item.rating.toFixed(1)} · {distanceLabel(item.distance)}
                  </Text>
                </View>
              </View>
              <View onStartShouldSetResponder={() => true}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item.name} dos favoritos`}
                  onPress={() => onRemove(item)}
                  hitSlop={8}
                  className="w-9 h-9 rounded-full border border-hairline bg-offwhite items-center justify-center active:opacity-70"
                >
                  <MaterialIcons name="favorite" size={17} color="#DD7C54" />
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  )
}
