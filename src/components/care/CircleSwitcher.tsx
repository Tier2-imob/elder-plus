import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Pressable, ScrollView, Text } from 'react-native'

/**
 * Circle selector for users in more than one care circle: one pill per circle ("Dona Maria",
 * "Seu João") and, when allowed, "+ Adicionar". Renders nothing with a single circle and nothing
 * to add.
 */
export function CircleSwitcher({
  circles,
  activeCircleId,
  onSelect,
  onAdd,
}: {
  circles: { id: string; name: string }[]
  activeCircleId: string | null
  onSelect: (circleId: string) => void
  /** Absent when no other circle can be added (limit, no care profile). */
  onAdd?: () => void
}) {
  if (circles.length < 2 && !onAdd) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      className="mb-4"
      accessibilityLabel="Círculos de cuidado"
    >
      {circles.map((c) => {
        const active = c.id === activeCircleId
        return (
          <Pressable
            key={c.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Círculo de ${c.name}`}
            onPress={() => onSelect(c.id)}
            className="min-h-[48px] flex-row items-center gap-1.5 px-4 rounded-full active:opacity-70"
            style={{
              backgroundColor: active ? '#11375C' : 'rgba(17,55,92,0.06)',
              borderWidth: 1.4,
              borderColor: active ? '#11375C' : '#E4DCD3',
            }}
          >
            <MaterialIcons name="diversity-3" size={18} color={active ? '#FFFFFF' : '#11375C'} />
            <Text className="font-hanken-bold text-[15px]" style={{ color: active ? '#FFFFFF' : '#11375C' }}>
              {c.name}
            </Text>
          </Pressable>
        )
      })}
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar outro círculo de cuidado"
          onPress={onAdd}
          className="min-h-[48px] flex-row items-center gap-1 px-4 rounded-full border border-dashed active:opacity-70"
          style={{ borderColor: '#11375C' }}
        >
          <MaterialIcons name="add" size={18} color="#11375C" />
          <Text className="font-hanken-bold text-[15px] text-navy">Adicionar</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}
