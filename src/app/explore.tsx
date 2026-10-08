import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ExploreScreen } from '@/screens/ExploreScreen'
import { useAccount } from '@/state/account-context'

export default function Explore() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account, signOut } = useAccount()

  return (
    <ExploreScreen
      name={account?.name}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onLogout={async () => {
        await signOut()
      }}
      onOpenDocuments={() => router.push('/documents')}
      onSelectCategory={(category) =>
        router.push({
          pathname: '/discover',
          params: { categoryId: category.id, categoryLabel: category.label },
        })
      }
      onSelectBusiness={(item) =>
        router.push({
          pathname: '/business',
          params: { categoryId: item.categoryId, itemId: item.id },
        })
      }
      onNavigate={(key) => {
        if (key === 'care') router.push('/care')
      }}
    />
  )
}