import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useNextTasks } from '@/hooks/useNextTasks'
import { useUserLocation } from '@/hooks/useUserLocation'
import { ExploreScreen } from '@/screens/ExploreScreen'
import { useAccount } from '@/state/account-context'
import { useCircle } from '@/state/circle-context'

export default function Explore() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const { circleLoading, circleLoadError, retryCircle, circles } = useCircle()
  // The next task of every circle the user takes part in.
  const next = useNextTasks(account?.uid, circles)
  const location = useUserLocation()

  return (
    <ExploreScreen
      name={account?.name}
      // The section is there from the first frame: while the circles load it says "carregando"
      // (instead of appearing late, or claiming there is no task).
      showNextTasks={circleLoading || next.entries.length > 0}
      nextTasksLoading={circleLoading}
      nextTasks={next.entries}
      onToggleTaskDone={next.toggleDone}
      onRescheduleTask={next.reschedule}
      onAssignTask={next.assign}
      onChangeTaskCategory={next.changeCategory}
      onDeleteTask={next.remove}
      mapCenter={location.coords}
      locationStatus={location.status}
      onEnableLocation={location.enable}
      topInset={insets.top}
      bottomInset={insets.bottom}
      connectionError={circleLoadError}
      onRetry={retryCircle}
      onOpenAccount={() => router.push('/account')}
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
    />
  )
}