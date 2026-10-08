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
      // Entrada de Documentos (Firebase Storage) oculta por ora: o Storage não
      // foi ativado no console e o plano de uso dos documentos ainda vai amadurecer.
      // Para reativar, descomente a linha abaixo (a tela/rota/service já existem).
      // onOpenDocuments={() => router.push('/documents')}
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