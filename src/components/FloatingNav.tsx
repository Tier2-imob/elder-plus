import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Pressable, Text, View } from 'react-native'

export type NavKey = 'explore' | 'care' | 'favorites'

type NavItem = {
  key: NavKey
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const NAV_ITEMS: NavItem[] = [
  { key: 'explore', label: 'Explorar', icon: 'search' },
  { key: 'care', label: 'Cuidados', icon: 'volunteer-activism' },
  { key: 'favorites', label: 'Favoritos', icon: 'favorite' },
]

/**
 * The floating bottom navigation: a compact pill where only the selected item shows its name, on a
 * terracotta background. Rendered once by the tabs layout.
 */
export function FloatingNav({
  active,
  onPress,
  bottomInset = 0,
}: {
  active: NavKey
  onPress: (key: NavKey) => void
  bottomInset?: number
}) {
  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: bottomInset + 20 }}
      pointerEvents="box-none"
    >
      <View
        className="flex-row items-center gap-1 bg-navy rounded-full px-2 py-2"
        style={{
          shadowColor: '#11375C',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onPress(item.key)}
              className="flex-row items-center gap-2 px-5 py-3 rounded-full active:opacity-80"
              style={{ backgroundColor: isActive ? '#DD7C54' : 'transparent' }}
            >
              <MaterialIcons
                name={item.icon}
                size={18}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
              />
              {isActive && <Text className="font-hanken-bold text-white text-sm">{item.label}</Text>}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
