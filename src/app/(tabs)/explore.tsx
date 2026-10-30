import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useNearestTask } from '@/hooks/useNearestTask'
import { useUserLocation } from '@/hooks/useUserLocation'
import { ExploreScreen } from '@/screens/ExploreScreen'
import { canEditCircleData, hasPermission, isAssignable } from '@/services/circle-rules'
import { useAccount } from '@/state/account-context'
import { toFamilyMember, useCircle } from '@/state/circle-context'

export default function Explore() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const {
    task: nearestTask,
    done: nearestTaskDone,
    loading: taskLoading,
    toggleDone,
    reschedule,
    assign,
    changeCategory,
    remove,
  } = useNearestTask(account?.uid)
  const { circle, membership, members, circleLoadError, retryCircle } = useCircle()
  const location = useUserLocation()

  return (
    <ExploreScreen
      name={account?.name}
      // The card needs a circle the viewer can read the routine of.
      showNextTask={hasPermission(membership, 'ver-rotina')}
      taskReadOnly={!canEditCircleData(membership, circle, 'editar-rotina')}
      nearestTask={nearestTask}
      nearestTaskDone={nearestTaskDone}
      taskLoading={taskLoading}
      familyMembers={members.filter(isAssignable).map((m) => toFamilyMember(m, membership))}
      onToggleTaskDone={toggleDone}
      onRescheduleTask={reschedule}
      onAssignTask={assign}
      onChangeTaskCategory={changeCategory}
      onDeleteTask={remove}
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