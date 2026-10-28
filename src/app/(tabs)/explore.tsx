import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useNearestTask } from '@/hooks/useNearestTask'
import { ExploreScreen } from '@/screens/ExploreScreen'
import { hasPermission, isAssignable } from '@/services/circle-rules'
import { useAccount } from '@/state/account-context'
import { toFamilyMember, useCircle } from '@/state/circle-context'

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
    changeCategory,
    remove,
  } = useNearestTask(account?.uid)
  const { membership, members } = useCircle()

  return (
    <ExploreScreen
      name={account?.name}
      // The card needs a circle the viewer can read the routine of.
      showNextTask={hasPermission(membership, 'ver-rotina')}
      taskReadOnly={!hasPermission(membership, 'editar-rotina')}
      nearestTask={nearestTask}
      nearestTaskDone={nearestTaskDone}
      taskLoading={taskLoading}
      familyMembers={members.filter(isAssignable).map((m) => toFamilyMember(m, membership))}
      onToggleTaskDone={toggleDone}
      onRescheduleTask={reschedule}
      onAssignTask={assign}
      onChangeTaskCategory={changeCategory}
      onDeleteTask={remove}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onOpenAccount={() => router.push('/account')}
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