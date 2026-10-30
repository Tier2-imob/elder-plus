import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CATEGORY_DATA } from '@/data/discover-data'
import { FavoritesScreen, type FavoriteBusiness } from '@/screens/FavoritesScreen'
import { useAccount } from '@/state/account-context'

const ALL_BUSINESSES: FavoriteBusiness[] = Object.entries(CATEGORY_DATA).flatMap(([categoryId, data]) =>
  data.items.map((item) => ({ ...item, categoryId }))
)

export default function Favorites() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { favorites, toggleFavorite } = useAccount()

  // Businesses that were favorited and still exist in the catalog (ids are unique across categories).
  const items = ALL_BUSINESSES.filter((business) => favorites.has(business.id))

  return (
    <FavoritesScreen
      items={items}
      onOpen={(business) =>
        router.push({ pathname: '/business', params: { categoryId: business.categoryId, itemId: business.id } })
      }
      onRemove={(business) => toggleFavorite(business.id)}
      onExplore={() => router.navigate('/explore')}
      topInset={insets.top}
      bottomInset={insets.bottom}
    />
  )
}
