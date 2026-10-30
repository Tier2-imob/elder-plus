import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useEffect } from 'react'
import { Pressable, Text, View, useWindowDimensions } from 'react-native'
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

const PADDING = 6
const ITEM_HEIGHT = 56 // the touch-target minimum of the design system
const BASE_ITEM_WIDTH = 124
const SLIDE_MS = 280
const INACTIVE_OPACITY = 0.7 // white at 70% on navy still passes 4.5:1 text contrast

function NavButton({
  item,
  index,
  width,
  position,
  active,
  onPress,
}: {
  item: NavItem
  index: number
  width: number
  /** Animated index of the selected item (0 → 1 while the highlight slides). */
  position: SharedValue<number>
  active: boolean
  onPress: () => void
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
      className="items-center justify-center rounded-full active:opacity-80"
      style={{ width, height: ITEM_HEIGHT }}
    >
      {/* Inline styles only on Animated views: with a className NativeWind can drop the animated style. */}
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
        <MaterialIcons name={item.icon} size={22} color="#FFFFFF" />
        <Text numberOfLines={1} className="font-hanken-bold text-white text-[15px]">
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

/**
 * The floating bottom navigation. Every item always shows its icon and its name; the selected one
 * sits on a terracotta pill that slides smoothly to the new selection (and the labels fade between
 * selected and not). Rendered once by the tabs layout, so it persists across screens and the
 * transition is actually seen. With "reduce motion" on, the change is immediate.
 *
 * All items have the same width, so the highlight needs no measuring: it is a fixed-size pill that
 * only moves (a transform animation), and the layout is the same on every frame.
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
  const { fontScale, width: screenWidth } = useWindowDimensions()
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.key === active))

  // Wide enough for the label at the user's font size, but never wider than half the screen.
  const itemWidth = Math.round(
    Math.min(BASE_ITEM_WIDTH * Math.max(1, fontScale), (screenWidth - 32 - PADDING * 2) / NAV_ITEMS.length)
  )

  const position = useSharedValue(activeIndex)

  useEffect(() => {
    position.value = reduceMotion
      ? activeIndex
      : withTiming(activeIndex, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) })
  }, [activeIndex, reduceMotion, position])

  // Computed here, not inside the worklet: calling .map with closures on the UI thread throws.
  const slots = NAV_ITEMS.map((_, i) => i)
  const offsets = slots.map((i) => i * itemWidth)

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(position.value, slots, offsets) }],
  }))

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
        {/* The terracotta highlight: a fixed-size pill that slides to the selected item. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PADDING,
              left: PADDING,
              width: itemWidth,
              height: ITEM_HEIGHT,
              borderRadius: ITEM_HEIGHT / 2,
              backgroundColor: '#DD7C54',
            },
            highlightStyle,
          ]}
        />
        {NAV_ITEMS.map((item, index) => (
          <NavButton
            key={item.key}
            item={item}
            index={index}
            width={itemWidth}
            position={position}
            active={item.key === active}
            onPress={() => onPress(item.key)}
          />
        ))}
      </View>
    </View>
  )
}
