import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CATEGORY_DATA } from '@/data/discover-data'
import { useBusinessReviews } from '@/hooks/useBusinessReviews'
import { BusinessScreen } from '@/screens/BusinessScreen'
import type { ServiceItem } from '@/screens/DiscoverScreen'

export default function Business() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { categoryId, itemId } = useLocalSearchParams<{ categoryId: string; itemId: string }>()

  const items = CATEGORY_DATA[categoryId ?? '']?.items ?? []
  const item = items.find((i: ServiceItem) => i.id === itemId)

  const { reviews, loading, submitting, submitReview } = useBusinessReviews(item?.id ?? '')

  if (!item) return null

  return (
    <BusinessScreen
      item={item}
      onBack={() => router.back()}
      topInset={insets.top}
      reviews={reviews}
      reviewsLoading={loading}
      submitting={submitting}
      onSubmitReview={submitReview}
    />
  )
}
