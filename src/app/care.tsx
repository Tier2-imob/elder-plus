import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CareScreen } from '@/screens/CareScreen'

export default function Care() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <CareScreen
      topInset={insets.top}
      bottomInset={insets.bottom}
      onNavigate={(key) => {
        if (key === 'explore') router.replace('/explore')
      }}
    />
  )
}
