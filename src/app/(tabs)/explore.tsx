import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FAMILY_MEMBERS } from '@/data/care-private-data'
import { useNearestTask } from '@/hooks/useNearestTask'
import { ExploreScreen } from '@/screens/ExploreScreen'
import { useAccount } from '@/state/account-context'

export default function Explore() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account, signOut } = useAccount()
  const {
    task: nearestTask,
    done: nearestTaskDone,
    loading: taskLoading,
    toggleDone,
    reschedule,
    assign,
  } = useNearestTask(account?.uid)

  return (
    <ExploreScreen
      name={account?.name}
      showNextTask={!!account}
      nearestTask={nearestTask}
      nearestTaskDone={nearestTaskDone}
      taskLoading={taskLoading}
      familyMembers={FAMILY_MEMBERS}
      onToggleTaskDone={toggleDone}
      onRescheduleTask={reschedule}
      onAssignTask={assign}
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
        // navigate (not push): switches to the already-mounted tab instead of stacking a new screen.
        if (key === 'care') router.navigate('/care')
      }}
    />
  )
}