import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Pressable, Text, View } from 'react-native'

/**
 * Connection failure: a clear message and "Tentar de novo". Used wherever the app could not load
 * what it needs (circles, tasks) instead of pretending there is nothing.
 */
export function ConnectionErrorCard({
  message = 'Não foi possível carregar. Verifique sua conexão com a internet e tente de novo.',
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <View
      className="rounded-3xl p-5"
      style={{ backgroundColor: 'rgba(221,124,84,0.10)', borderWidth: 1.4, borderColor: '#DD7C54' }}
    >
      <View className="flex-row items-center gap-3 mb-2">
        <MaterialIcons name="wifi-off" size={26} color="#9F4E2E" />
        <Text accessibilityRole="header" className="flex-1 font-hanken-extrabold text-[#9F4E2E] text-lg">
          Sem conexão
        </Text>
      </View>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="font-hanken text-ink text-[15px] leading-[22px]"
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tentar de novo"
        onPress={onRetry}
        className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl mt-4 bg-navy active:opacity-90"
      >
        <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
        <Text className="font-hanken-bold text-base text-white">Tentar de novo</Text>
      </Pressable>
    </View>
  )
}
