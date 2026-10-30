import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

type NavKey = 'explore' | 'care'

type NavItem = {
  key: NavKey
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
}

const NAV_ITEMS: NavItem[] = [
  { key: 'explore', label: 'Explorar', icon: 'search' },
  { key: 'care', label: 'Cuidados', icon: 'volunteer-activism' },
]

const PADDING = 6
const ITEM_HEIGHT = 56 // the touch-target minimum of the design system
const SLIDE_MS = 280
const INACTIVE_OPACITY = 0.7 // white at 70% on navy still passes 4.5:1 text contrast

function NavButton({
  item,
  index,
  position,
  active,
  onPress,
  onLayout,
}: {
  item: NavItem
  index: number
  /** Animated index of the selected item (0 → 1 while the indicator slides). */
  position: SharedValue<number>
  active: boolean
  onPress: () => void
  onLayout: (x: number, width: number) => void
}) {
  // The label and icon fade between "selected" (full white) and "not selected" (dimmed white).
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      position.value,
      [index - 1, index, index + 1],
      [INACTIVE_OPACITY, 1, INACTIVE_OPACITY],
      Extrapolation.CLAMP
    ),
  }))

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      className="flex-row items-center justify-center rounded-full active:opacity-80"
      style={{ height: ITEM_HEIGHT, paddingHorizontal: 20 }}
    >
      <Animated.View style={style} className="flex-row items-center gap-2">
        <MaterialIcons name={item.icon} size={22} color="#FFFFFF" />
        <Text className="font-hanken-bold text-white text-[15px]">{item.label}</Text>
      </Animated.View>
    </Pressable>
  )
}

/**
 * The floating bottom navigation. Every item always shows its icon and its name; the selected one
 * sits on a terracotta pill that slides smoothly to the new selection (and the labels fade between
 * selected and not). Rendered once by the tabs layout, so it persists across screens and the
 * transition is actually seen. With "reduce motion" on, the change is immediate.
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
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.key === active))

  const position = useSharedValue(activeIndex)
  // Where each item sits inside the pill (from onLayout), so the indicator can slide between them.
  const xs = useSharedValue<number[]>(NAV_ITEMS.map(() => 0))
  const widths = useSharedValue<number[]>(NAV_ITEMS.map(() => 0))

  useEffect(() => {
    position.value = reduceMotion
      ? activeIndex
      : withTiming(activeIndex, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) })
  }, [activeIndex, reduceMotion, position])

  const indicatorStyle = useAnimatedStyle(() => ({
    // Hidden until the items have been measured, so it never flashes at the wrong place.
    opacity: widths.value[0] > 0 ? 1 : 0,
    width: interpolate(position.value, [0, 1], [widths.value[0], widths.value[1]]),
    transform: [{ translateX: interpolate(position.value, [0, 1], [xs.value[0], xs.value[1]]) }],
  }))

  const measure = (index: number, x: number, width: number) => {
    const nextXs = [...xs.get()]
    const nextWidths = [...widths.get()]
    nextXs[index] = x
    nextWidths[index] = width
    xs.set(nextXs)
    widths.set(nextWidths)
  }

  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: bottomInset + 20 }}
      pointerEvents="box-none"
    >
      <View
        accessibilityRole="tablist"
        className="flex-row items-center bg-navy rounded-full"
        style={{
          padding: PADDING,
          shadowColor: '#11375C',
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full"
          style={[{ top: PADDING, left: 0, height: ITEM_HEIGHT, backgroundColor: '#DD7C54' }, indicatorStyle]}
        />
        {NAV_ITEMS.map((item, index) => (
          <NavButton
            key={item.key}
            item={item}
            index={index}
            position={position}
            active={item.key === active}
            onPress={() => onPress(item.key)}
            onLayout={(x, width) => measure(index, x, width)}
          />
        ))}
      </View>
    </View>
  )
}
