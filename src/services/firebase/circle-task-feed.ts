import type { Unsubscribe } from 'firebase/firestore'

import { observeMembers, observeOwnMember } from './circles'
import { observeTasks } from './tasks'
import type { CircleMemberDoc, TaskDoc } from './types'

/** What the Explore screen needs to know about one circle: who the viewer is there and its tasks. */
export type CircleTaskFeed = {
  /** Still waiting for the first answer (membership, then tasks and members). */
  loading: boolean
  /** The viewer's own member doc in this circle, once known. */
  member: CircleMemberDoc | null
  /** The circle's tasks — empty unless the viewer is an active member with `ver-rotina`. */
  tasks: TaskDoc[]
  /** Active and pending members (for the assignee names and the "Atribuir" options). */
  members: CircleMemberDoc[]
  /** Could not be read for a reason other than lacking access (e.g. no connection). */
  error: boolean
}

const isPermissionDenied = (error: unknown) => (error as { code?: string } | null)?.code === 'permission-denied'

/** Whether the viewer may read the circle's routine (the rules deny the tasks otherwise). */
export const canSeeRoutine = (member: CircleMemberDoc | null) =>
  member?.status === 'ativo' && member.permissions.includes('ver-rotina')

/**
 * Follow one circle for the Explore "next tasks" section, live. The viewer's membership comes
 * first: only an active member with `ver-rotina` also gets the tasks and members listeners, so no
 * read is attempted that the rules would refuse (and a circle the viewer can't read is simply
 * reported as `member` without access). Calls `onChange` with the full state every time it changes.
 */
export function observeCircleTaskFeed(
  circleId: string,
  uid: string,
  onChange: (feed: CircleTaskFeed) => void
): Unsubscribe {
  let feed: CircleTaskFeed = { loading: true, member: null, tasks: [], members: [], error: false }
  let stopTasks: Unsubscribe | null = null
  let stopMembers: Unsubscribe | null = null
  let tasksReady = false
  let membersReady = false

  const emit = (patch: Partial<CircleTaskFeed>) => {
    feed = { ...feed, ...patch }
    onChange(feed)
  }
  const stopDetails = () => {
    stopTasks?.()
    stopMembers?.()
    stopTasks = null
    stopMembers = null
    tasksReady = false
    membersReady = false
  }
  // Loading until the details we asked for have all answered once.
  const detailsLoading = () => !(tasksReady && membersReady)
  const fail = (error: unknown) => emit({ loading: false, error: !isPermissionDenied(error) })

  const stopMember = observeOwnMember(
    circleId,
    uid,
    (member, state) => {
      // Offline with nothing cached: not an answer yet (the listener stays on and fires when it returns).
      if (state === 'unconfirmed') return emit({ error: true })

      if (!canSeeRoutine(member)) {
        stopDetails()
        return emit({ loading: false, member, tasks: [], members: [], error: false })
      }

      emit({ member, error: false, loading: detailsLoading() })
      if (stopTasks) return
      stopTasks = observeTasks(
        circleId,
        (tasks) => {
          tasksReady = true
          emit({ tasks, error: false, loading: detailsLoading() })
        },
        fail
      )
      stopMembers = observeMembers(
        circleId,
        (members) => {
          membersReady = true
          emit({ members, error: false, loading: detailsLoading() })
        },
        fail
      )
    },
    fail
  )

  return () => {
    stopMember()
    stopDetails()
  }
}
