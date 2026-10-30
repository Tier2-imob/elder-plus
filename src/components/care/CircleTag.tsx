import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Text, View } from 'react-native'

/**
 * Names the care circle (the assisted person) something belongs to — used inside the Explore task
 * cards, where tasks of several circles sit together.
 */
export function CircleTag({ name }: { name: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`Círculo de ${name}`}
      className="self-start flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: 'rgba(17,55,92,0.08)' }}
    >
      <MaterialIcons name="diversity-3" size={16} color="#11375C" />
      <Text numberOfLines={1} className="font-hanken-bold text-navy text-sm">
        {name}
      </Text>
    </View>
  )
}
