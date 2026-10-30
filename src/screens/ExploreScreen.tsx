import { FloatingNav } from '@/components/FloatingNav'
import { Logo } from '@/components/Logo'
import { MapEmbed } from '@/components/MapEmbed'
import { TaskCard } from '@/components/care/TaskCard'
import type { FamilyMember, Task, TaskCategory } from '@/components/care/types'
import { CATEGORY_DATA } from '@/data/discover-data'
import type { ServiceItem } from '@/screens/DiscoverScreen'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

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

type SearchResult = ServiceItem & { categoryId: string }

const ALL_ITEMS: SearchResult[] = Object.entries(CATEGORY_DATA).flatMap(([categoryId, data]) =>
  data.items.map((item) => ({ ...item, categoryId }))
)

const PATROCINADOS: SearchResult[] = [
  { ...CATEGORY_DATA.saude.items[0], categoryId: 'saude' },
  { ...CATEGORY_DATA.farmacias.items[0], categoryId: 'farmacias' },
  { ...CATEGORY_DATA.lazer.items[0], categoryId: 'lazer' },
]

function distanceLabel(distance: number) {
  return distance >= 1000
    ? `${(distance / 1000).toFixed(1).replace('.', ',')} km`
    : `${distance} m`
}

export function ExploreScreen({
  name,
  showNextTask = false,
  nearestTask = null,
  nearestTaskDone = false,
  taskLoading = false,
  familyMembers = [],
  onToggleTaskDone,
  onRescheduleTask,
  onAssignTask,
  onChangeTaskCategory,
  onDeleteTask,
  taskReadOnly = false,
  topInset = 0,
  bottomInset = 0,
  onSelectCategory,
  onSelectBusiness,
  onNavigate,
  onOpenDocuments,
  onOpenAccount,
  mapCenter = null,
  locationStatus = 'ready',
  onEnableLocation,
}: {
  name?: string
  showNextTask?: boolean
  nearestTask?: Task | null
  nearestTaskDone?: boolean
  taskLoading?: boolean
  familyMembers?: FamilyMember[]
  onToggleTaskDone?: (taskId: string) => void
  onRescheduleTask?: (taskId: string, time: string) => void
  onAssignTask?: (taskId: string, assignee: string) => void
  onChangeTaskCategory?: (taskId: string, category: TaskCategory) => void
  onDeleteTask?: (taskId: string) => void
  /** Viewer can see but not edit the routine. */
  taskReadOnly?: boolean
  topInset?: number
  bottomInset?: number
  onSelectCategory: (category: Category) => void
  onSelectBusiness: (item: SearchResult) => void
  onNavigate: (key: string) => void
  onOpenDocuments?: () => void
  onOpenAccount?: () => void
  /** User's approximate position; the map centres on it when present. */
  mapCenter?: { latitude: number; longitude: number } | null
  /** `unsupported` (build without the location module) just shows the map without centring. */
  locationStatus?: 'locating' | 'ready' | 'denied' | 'unavailable' | 'unsupported'
  /** Ask for the location permission again (or open the settings). */
  onEnableLocation?: () => void
}) {
  const greeting = name ? `Bem-vindo(a), ${name}` : 'Bem-vindo(a) de volta'
  const [query, setQuery] = useState('')

  // Filtros da busca (dentro do card expandido): categoria (null = "Todos") e ordenar por distância.
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [sortByDistance, setSortByDistance] = useState(false)

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return ALL_ITEMS.filter((item) => item.name.toLowerCase().includes(q))
  }, [query])

  const showResults = query.trim().length >= 2

  // Aplica os filtros locais sobre os resultados já computados (que carregam categoryId e distance).
  const filteredResults = useMemo<SearchResult[]>(() => {
    let list = filterCategory
      ? results.filter((item) => item.categoryId === filterCategory)
      : results
    if (sortByDistance) {
      list = [...list].sort((a, b) => a.distance - b.distance)
    }
    return list
  }, [results, filterCategory, sortByDistance])

  return (
    <View className="flex-1 bg-offwhite">
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: topInset + 20, paddingBottom: bottomInset + 100 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between px-7 mb-5">
        {/* Profile button: the icon and the Elder+ mark are one tap target ("Minha conta", where
            signing out lives). */}
        {onOpenAccount ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minha conta"
            onPress={onOpenAccount}
            className="min-h-[48px] flex-row items-center gap-2 pr-2 active:opacity-60"
          >
            <MaterialIcons name="account-circle" size={30} color="#11375C" />
            <Logo size="sm" style={{ width: 80, height: 24 }} />
          </Pressable>
        ) : (
          <Logo size="sm" style={{ width: 80, height: 24 }} />
        )}
        {onOpenDocuments ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Meus documentos"
                     onPress={onOpenDocuments} hitSlop={8} className="active:opacity-60">
            <MaterialIcons name="folder" size={24} color="#11375C" />
          </Pressable>
        ) : null}
      </View>
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
            <View className="mt-3">
              {/* Filtros de busca acima dos resultados (dentro do card expandido) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8 }}
                className="mb-3"
              >
                {[{ id: null as string | null, label: 'Todos' }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.label }))].map((chip) => {
                  const active = filterCategory === chip.id
                  return (
                    <Pressable
                      key={chip.id ?? 'todos'}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrar por ${chip.label}`}
                      onPress={() => setFilterCategory(chip.id)}
                      className={`rounded-full px-3.5 py-2 ${active ? 'bg-white/25' : 'bg-white/10'} active:opacity-70`}
                    >
                      <Text className={`text-xs ${active ? 'font-hanken-medium text-white' : 'font-hanken text-white/70'}`}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ordenar por distância"
                onPress={() => setSortByDistance((prev) => !prev)}
                className={`self-start flex-row items-center gap-1.5 rounded-full px-3.5 py-2 mb-3 ${sortByDistance ? 'bg-white/25' : 'bg-white/10'} active:opacity-70`}
              >
                <MaterialIcons name="near-me" size={14} color={sortByDistance ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
                <Text className={`text-xs ${sortByDistance ? 'font-hanken-medium text-white' : 'font-hanken text-white/70'}`}>
                  Mais próximo
                </Text>
              </Pressable>

              <View className="rounded-2xl overflow-hidden">
              {filteredResults.length === 0 ? (
                <View className="bg-white/10 px-4 py-3">
                  <Text className="font-hanken text-white/60 text-sm">Nenhum resultado encontrado.</Text>
                </View>
              ) : (
                filteredResults.map((item, index) => (
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
            </View>
          )}
        </View>

        {/* Próxima tarefa — só quando há usuário logado */}
        {showNextTask ? (
          // TaskCard carries its own mb-4, so the section trims its margin to keep the same 28px gap.
          <View className={!taskLoading && nearestTask ? 'mb-3' : 'mb-7'}>
            <Text className="font-hanken-bold text-navy text-3xl mb-2">Próxima tarefa</Text>
            {taskLoading ? (
              <View className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white">
                <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
                  <MaterialIcons name="schedule" size={22} color="#11375C" />
                </View>
                <View className="flex-1">
                  <Text className="font-hanken text-muted text-[13px]">Carregando…</Text>
                </View>
              </View>
            ) : nearestTask ? (
              // Mesmo card da tela Cuidados (formato e ações: concluir, adiar, atribuir).
              <TaskCard
                task={nearestTask}
                done={nearestTaskDone}
                members={familyMembers}
                onToggleDone={() => onToggleTaskDone?.(nearestTask.id)}
                onReschedule={(time) => onRescheduleTask?.(nearestTask.id, time)}
                onAssign={(assignee) => onAssignTask?.(nearestTask.id, assignee)}
                onChangeCategory={
                  onChangeTaskCategory ? (category) => onChangeTaskCategory(nearestTask.id, category) : undefined
                }
                onDelete={onDeleteTask ? () => onDeleteTask(nearestTask.id) : undefined}
                readOnly={taskReadOnly}
              />
            ) : (
              <View className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white">
                <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
                  <MaterialIcons name="event-available" size={22} color="#11375C" />
                </View>
                <View className="flex-1">
                  <Text className="font-hanken text-muted text-[13px]">Nenhuma tarefa pendente</Text>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Categorias */}
        <Text className="font-hanken-bold text-navy text-3xl mb-3">Explore por categoria</Text>
        {/* justify-between: 2 × 47% + gap never summed to 100%, leaving the right column short of the
            edge every other section aligns to. */}
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-7">
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.label}
              onPress={() => onSelectCategory(category)}
              className="w-[48%] items-center rounded-2xl border border-hairline bg-white px-3 py-5 active:opacity-70"
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

        {/* Mapa (Google Maps Embed) */}
        <View className="mb-7">
          <Text className="font-hanken-bold text-navy text-[15px] mb-3">Serviços perto de você</Text>
          <View
            className="overflow-hidden border border-hairline"
            style={{ height: 200, borderRadius: 20 }}
          >
            {/* Wait for the first position so the map does not load twice (somewhere else, then here). */}
            {locationStatus === 'locating' && !mapCenter ? (
              <View className="flex-1 items-center justify-center bg-white" accessible accessibilityLabel="Buscando sua localização">
                <MaterialIcons name="my-location" size={26} color="#6B7A85" />
              </View>
            ) : (
              <MapEmbed query="Farmácia" center={mapCenter} />
            )}
          </View>
          {(locationStatus === 'denied' || locationStatus === 'unavailable') && onEnableLocation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                locationStatus === 'denied'
                  ? 'Permitir localização para ver serviços perto de você'
                  : 'Tentar localizar de novo'
              }
              onPress={onEnableLocation}
              className="min-h-[56px] flex-row items-center gap-3 mt-3 px-4 rounded-2xl border border-hairline bg-white active:opacity-70"
            >
              <MaterialIcons name="location-off" size={22} color="#DD7C54" />
              <Text className="flex-1 font-hanken text-ink text-sm leading-5">
                {locationStatus === 'denied'
                  ? 'Permita a localização para ver os serviços perto de você.'
                  : 'Não conseguimos sua localização. Toque para tentar de novo.'}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#6B7A85" />
            </Pressable>
          ) : null}
        </View>

        {/* Perto de você */}
        <Text className="font-hanken-bold text-navy text-3xl mb-3">Patrocinados</Text>
        <View>
          {PATROCINADOS.map((service) => (
            <Pressable
              key={service.id}
              accessibilityRole="button"
              accessibilityLabel={service.name}
              onPress={() => onSelectBusiness(service)}
              className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white mb-3 active:opacity-70"
            >
              <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-terracotta/10">
                <MaterialIcons name={service.icon} size={22} color="#DD7C54" />
              </View>
              <View className="flex-1">
                <Text className="font-hanken-bold text-navy text-[15px] mb-0.5">{service.name}</Text>
                <Text className="font-hanken text-muted text-[12.5px]">{service.tag}</Text>
              </View>
              <Text className="font-hanken-medium text-muted text-xs">{distanceLabel(service.distance)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    <FloatingNav active="explore" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}