import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BusinessScreen } from '@/screens/BusinessScreen'
import { CATEGORY_DATA } from '@/data/discover-data'
import type { ServiceItem } from '@/screens/DiscoverScreen'

export default function Business() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { categoryId, itemId } = useLocalSearchParams<{ categoryId: string; itemId: string }>()

  const items = CATEGORY_DATA[categoryId ?? '']?.items ?? []
  const item = items.find((i: ServiceItem) => i.id === itemId)

  if (!item) return null

  return (
    <BusinessScreen
      item={item}
      onBack={() => router.back()}
      topInset={insets.top}
    />
  )
}