import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

export type NavKey = 'explore' | 'care' | 'favorites'

type NavItem = {
  key: NavKey
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const NAV_ITEMS: NavItem[] = [
  { key: 'explore', label: 'Explorar', icon: 'search' },
  { key: 'care', label: 'Cuidados', icon: 'medical-services' },
  { key: 'favorites', label: 'Favoritos', icon: 'favorite' },
]

const SLIDE_MS = 280

type Rect = { x: number; y: number; width: number; height: number }

/**
 * The floating bottom navigation: a compact pill where only the selected item shows its name, on a
 * terracotta highlight that slides (and resizes) to the newly selected item. Rendered once by the
 * tabs layout, so it persists across screens and the transition is seen. With "reduce motion" on,
 * the highlight jumps.
 *
 * The items have different widths (the selected one carries its name), so each reports its rect
 * through onLayout (kept in React state, merged functionally so no report is lost) and the highlight
 * follows the selected one's rect.
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
  const reduceMotion = useReducedMotion()
  const [rects, setRects] = useState<Partial<Record<NavKey, Rect>>>({})
  const target = rects[active]

  const x = useSharedValue(0)
  const width = useSharedValue(0)
  const placed = useRef(false)

  useEffect(() => {
    if (!target) return
    if (!placed.current || reduceMotion) {
      // First measurement (or reduced motion): put the highlight there, no sliding.
      x.value = target.x
      width.value = target.width
      placed.current = true
      return
    }
    const timing = { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }
    x.value = withTiming(target.x, timing)
    width.value = withTiming(target.width, timing)
  }, [target, reduceMotion, x, width])

  const highlightStyle = useAnimatedStyle(() => ({
    width: width.value,
    transform: [{ translateX: x.value }],
  }))

  function handleLayout(key: NavKey, event: LayoutChangeEvent) {
    const { x: left, y, width: w, height } = event.nativeEvent.layout
    setRects((prev) => {
      const old = prev[key]
      if (old && old.x === left && old.y === y && old.width === w && old.height === height) return prev
      return { ...prev, [key]: { x: left, y, width: w, height } }
    })
  }

  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: bottomInset + 40 }}
      pointerEvents="box-none"
    >
      <View
        className="flex-row items-center gap-1.5 bg-navy rounded-full px-2.5 py-2.5"
        style={{
          shadowColor: '#11375C',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        {/* The terracotta highlight sits behind the items and follows the selected one. */}
        {target ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: target.y,
                height: target.height,
                borderRadius: target.height / 2,
                backgroundColor: '#DD7C54',
              },
              highlightStyle,
            ]}
          />
        ) : null}

        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onPress(item.key)}
              onLayout={(event) => handleLayout(item.key, event)}
              className="flex-row items-center gap-2 px-6 py-3.5 rounded-full active:opacity-80"
              // Until the first measurement there is no highlight yet: paint the selected item itself.
              style={{ backgroundColor: !target && isActive ? '#DD7C54' : 'transparent' }}
            >
              <MaterialIcons
                name={item.icon}
                size={22}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
              />
              {isActive && <Text className="font-hanken-bold text-white text-base">{item.label}</Text>}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
