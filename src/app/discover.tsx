import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DiscoverScreen, type ServiceItem } from '@/screens/DiscoverScreen'
import { CATEGORY_DATA } from '@/data/discover-data'

export default function Discover() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { categoryId, categoryLabel } = useLocalSearchParams<{ categoryId: string; categoryLabel: string }>()

  const id = categoryId ?? ''
  const data = CATEGORY_DATA[id]

  return (
    <DiscoverScreen
      categoryLabel={categoryLabel ?? ''}
      items={data?.items ?? []}
      onBack={() => router.back()}
      onSelectItem={(item: ServiceItem) =>
        router.push({ pathname: '/business', params: { categoryId: id, itemId: item.id } })
      }
      topInset={insets.top}
    />
  )
}