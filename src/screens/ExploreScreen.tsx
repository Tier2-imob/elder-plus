import { useState, useMemo } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Logo } from '@/components/Logo'
import { FloatingNav } from '@/components/FloatingNav'
import { CATEGORY_DATA } from '@/data/discover-data'
import type { ServiceItem } from '@/screens/DiscoverScreen'

type Category = {
  id: string
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const CATEGORIES: Category[] = [
  { id: 'saude',    label: 'Saúde e cuidado',    icon: 'favorite-border' },
  { id: 'farmacias', label: 'Farmácias',          icon: 'local-pharmacy' },
  { id: 'moradia',  label: 'Moradia',             icon: 'home-work' },
  { id: 'produtos', label: 'Produtos',            icon: 'shopping-bag' },
  { id: 'servicos', label: 'Serviços',            icon: 'handyman' },
  { id: 'lazer',    label: 'Lazer e bem-estar',   icon: 'directions-walk' },
]

type NearbyService = {
  id: string
  name: string
  category: string
  distance: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const NEARBY: NearbyService[] = [
  { id: '1', name: 'Clínica Vida Ativa', category: 'Saúde e cuidado', distance: '800 m',  icon: 'favorite-border' },
  { id: '2', name: 'Farmácia Popular',   category: 'Farmácias',        distance: '1,2 km', icon: 'local-pharmacy' },
  { id: '3', name: 'Espaço Bem Viver',   category: 'Lazer e bem-estar', distance: '2 km',  icon: 'directions-walk' },
]

// Todos os negócios de todas as categorias, enriquecidos com o categoryId
type SearchResult = ServiceItem & { categoryId: string }

const ALL_ITEMS: SearchResult[] = Object.entries(CATEGORY_DATA).flatMap(([categoryId, data]) =>
  data.items.map((item) => ({ ...item, categoryId }))
)

export function ExploreScreen({
  name,
  topInset = 0,
  bottomInset = 0,
  onSelectCategory,
  onSelectBusiness,
  onNavigate,
}: {
  name?: string
  topInset?: number
  bottomInset?: number
  onSelectCategory: (category: Category) => void
  onSelectBusiness: (item: SearchResult) => void
  onNavigate: (key: string) => void
}) {
  const greeting = name ? `Bem-vindo(a), ${name}` : 'Bem-vindo(a) de volta'
  const [query, setQuery] = useState('')

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return ALL_ITEMS.filter((item) => item.name.toLowerCase().includes(q))
  }, [query])

  const showResults = query.trim().length >= 2

  return (
    <View className="flex-1 bg-offwhite">
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: topInset + 20, paddingBottom: bottomInset + 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <Logo size="sm" style={{ width: 80, height: 24, marginLeft: 28, marginBottom: 20 }} />
      <View className="px-6">
        {/* Card de boas-vindas com busca funcional */}
        <View className="rounded-2xl bg-navy p-5 mb-7">
          <Text className="font-hanken-bold text-white text-lg mb-1">{greeting}</Text>
          <Text className="font-hanken text-white/70 text-sm leading-5 mb-4">
            O que você precisa encontrar hoje?
          </Text>

          <View className="flex-row items-center gap-2.5 rounded-2xl bg-white/10 px-4 py-3.5">
            <MaterialIcons name="search" size={20} color="#FFFFFF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar serviços, farmácias, moradia…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 font-hanken text-white text-sm"
              style={{ color: '#FFFFFF' }}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            )}
          </View>

          {/* Resultados da busca */}
          {showResults && (
            <View className="mt-3 rounded-2xl overflow-hidden">
              {results.length === 0 ? (
                <View className="bg-white/10 px-4 py-3">
                  <Text className="font-hanken text-white/60 text-sm">Nenhum resultado encontrado.</Text>
                </View>
              ) : (
                results.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => { setQuery(''); onSelectBusiness(item) }}
                    className="flex-row items-center gap-3 px-4 py-3 active:opacity-70"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderTopWidth: index > 0 ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <MaterialIcons name={item.icon} size={18} color="rgba(255,255,255,0.8)" />
                    <View className="flex-1">
                      <Text className="font-hanken-bold text-white text-sm">{item.name}</Text>
                      <Text className="font-hanken text-white/60 text-xs">{item.tag}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>

        {/* Categorias */}
        <Text className="font-hanken-bold text-navy text-base mb-3">Explore por categoria</Text>
        <View className="flex-row flex-wrap gap-3 mb-7">
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.label}
              onPress={() => onSelectCategory(category)}
              className="w-[47%] items-center rounded-2xl border border-hairline bg-white px-3 py-5 active:opacity-70"
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center bg-navy/10 mb-2.5">
                <MaterialIcons name={category.icon} size={22} color="#11375C" />
              </View>
              <Text className="font-hanken-bold text-navy text-[13px] text-center leading-4">
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Perto de você */}
        <Text className="font-hanken-bold text-navy text-base mb-3">Perto de você</Text>
        <View>
          {NEARBY.map((service) => (
            <Pressable
              key={service.id}
              accessibilityRole="button"
              accessibilityLabel={service.name}
              className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white mb-3 active:opacity-70"
            >
              <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-terracotta/10">
                <MaterialIcons name={service.icon} size={22} color="#DD7C54" />
              </View>
              <View className="flex-1">
                <Text className="font-hanken-bold text-navy text-[15px] mb-0.5">{service.name}</Text>
                <Text className="font-hanken text-muted text-[12.5px]">{service.category}</Text>
              </View>
              <Text className="font-hanken-medium text-muted text-xs">{service.distance}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    <FloatingNav active="explore" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}