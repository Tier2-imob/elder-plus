import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { CIRCLE_ROLE_LABELS, type FamilyMember } from '@/components/care/types';
import type { AccountRole } from '@/components/types';
import { CIRCLE_CONSENT_VERSION } from '@/constants/constants';
import * as circles from '@/services/firebase/circles';
import { migrateLegacyCareData } from '@/services/firebase/legacy-migration';
import type { CircleDoc, CircleMemberDoc } from '@/services/firebase/types';
import * as users from '@/services/firebase/users';

type CircleAccount = { uid: string; name: string; role: AccountRole } | null

type CircleValue = {
  /**
   * True until we know whether the user has a circle (and, if so, their membership in it), and
   * while the creator's pre-circle data is being moved into it.
   */
  circleLoading: boolean
  circle: CircleDoc | null
  /** The signed-in user's own member doc (active or pending), or null without a circle. */
  membership: CircleMemberDoc | null
  /** Every member, active and pending. Empty while the user's own membership is pending. */
  members: CircleMemberDoc[]
  /**
   * Create the user's circle (an `elder` account is the titular itself; any other account names
   * the assisted person). Throws circle/* errors for the screen to explain.
   */
  createCircle: (subjectName?: string) => Promise<void>
}

const CircleContext = createContext<CircleValue | undefined>(undefined)

/**
 * The signed-in user's care circle, live: users/{uid}.circleId → own member doc → circle doc and,
 * once active, the member list. A pointer left behind after a manager removed the user is cleared
 * as soon as the server confirms the member doc is gone.
 */
export function CircleProvider({ account, children }: { account: CircleAccount; children: ReactNode }) {
  const uid = account?.uid

  // undefined = not known yet (loading); null = known to be absent.
  const [circleId, setCircleId] = useState<string | null | undefined>(undefined)
  const [membership, setMembership] = useState<CircleMemberDoc | null | undefined>(undefined)
  const [circle, setCircle] = useState<CircleDoc | null | undefined>(undefined)
  const [members, setMembers] = useState<CircleMemberDoc[]>([])

  // Reset during render when the account or the circle changes (same pattern as CareTasksProvider).
  const [keyedFor, setKeyedFor] = useState({ uid, circleId })
  if (keyedFor.uid !== uid) {
    setKeyedFor({ uid, circleId: undefined })
    setCircleId(undefined)
    setMembership(undefined)
    setCircle(undefined)
    setMembers([])
  } else if (keyedFor.circleId !== circleId) {
    setKeyedFor({ uid, circleId })
    setMembership(circleId ? undefined : null)
    setCircle(circleId ? undefined : null)
    setMembers([])
  }

  useEffect(() => {
    if (!uid) return
    return users.observeCircleId(uid, setCircleId, (e) => {
      console.warn('observeCircleId failed', e)
      setCircleId(null)
    })
  }, [uid])

  const clearedStaleFor = useRef<string | null>(null)

  useEffect(() => {
    if (!uid || !circleId) return
    const stopMember = circles.observeOwnMember(
      circleId,
      uid,
      (member, fromCache) => {
        setMembership(member)
        if (!member && !fromCache && clearedStaleFor.current !== circleId) {
          clearedStaleFor.current = circleId
          circles.clearStaleCircle(uid).catch((e) => console.warn('clearStaleCircle failed', e))
        }
      },
      (e) => {
        console.warn('observeOwnMember failed', e)
        setMembership(null)
      }
    )
    const stopCircle = circles.observeCircle(circleId, setCircle, (e) => {
      // Expected right after a removal: the user can no longer read the circle.
      console.warn('observeCircle failed', e)
      setCircle(null)
    })
    return () => {
      stopMember()
      stopCircle()
    }
  }, [uid, circleId])

  const isActive = membership?.status === 'ativo'

  useEffect(() => {
    if (!circleId || !isActive) return
    return circles.observeMembers(circleId, setMembers, (e) => {
      console.warn('observeMembers failed', e)
      setMembers([])
    })
  }, [circleId, isActive])

  // Last access, once per circle per app session.
  const touchedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!uid || !circleId || !isActive || touchedFor.current === circleId) return
    touchedFor.current = circleId
    circles.touchLastAccess(circleId, uid).catch((e) => console.warn('touchLastAccess failed', e))
  }, [uid, circleId, isActive])

  // The creator's care data from before circles (users/{uid}/tasks, medications, doses) moves into
  // their circle once. Invited members never migrate: their old data is not this circle's. A
  // failure does not block the app (the data stays where it was and is retried on the next start).
  const needsMigration = !!uid && !!circleId && isActive && circle?.createdBy === uid
  const [migratedFor, setMigratedFor] = useState<string | null>(null)
  useEffect(() => {
    if (!uid || !circleId || !needsMigration || migratedFor === circleId) return
    let active = true
    migrateLegacyCareData(uid, circleId)
      .then((moved) => {
        if (moved) console.log(`migrated ${moved} legacy care docs into circle ${circleId}`)
      })
      .catch((e) => console.warn('migrateLegacyCareData failed', e))
      .finally(() => {
        if (active) setMigratedFor(circleId)
      })
    return () => {
      active = false
    }
  }, [uid, circleId, needsMigration, migratedFor])
  const migrating = needsMigration && migratedFor !== circleId

  const createCircle = useCallback(
    async (subjectName?: string): Promise<void> => {
      if (!account) throw new Error('No signed-in user')
      await circles.createCircle({
        uid: account.uid,
        name: account.name,
        accountRole: account.role,
        currentCircleId: circleId ?? null,
        subjectName,
        consentVersion: CIRCLE_CONSENT_VERSION,
      })
    },
    [account, circleId]
  )

  // A failed circle read resolves to null (treated as "no circle"), so this never sticks.
  const circleLoading =
    !!uid &&
    (circleId === undefined ||
      migrating ||
      (!!circleId && (membership === undefined || (!!membership && circle === undefined))))

  const value = useMemo<CircleValue>(
    () => ({
      circleLoading,
      circle: membership ? (circle ?? null) : null,
      membership: membership ?? null,
      members,
      createCircle,
    }),
    [circleLoading, circle, membership, members, createCircle]
  )

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>
}

export function useCircle() {
  const context = useContext(CircleContext)
  if (!context) {
    throw new Error('useCircle precisa ser usado dentro de um CircleProvider')
  }
  return context
}

/** "hoje, 09:12" · "ontem, 18:40" · "21/10, 14:05". */
function formatLastAccess(date: Date | null): string {
  if (!date) return '—'
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days === 0) return `hoje, ${time}`
  if (days === 1) return `ontem, ${time}`
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}, ${time}`
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Member doc → the card shape the Família tab renders. */
export function toFamilyMember(member: CircleMemberDoc): FamilyMember {
  const roleLabel = CIRCLE_ROLE_LABELS[member.role] ?? member.role
  return {
    id: member.uid,
    name: member.name,
    role: member.label ? `${member.label} — ${roleLabel}` : roleLabel,
    initials: initialsOf(member.name),
    lastAccess: member.status === 'pendente' ? 'aguardando aprovação' : formatLastAccess(member.lastAccess?.toDate() ?? null),
    permissions: member.permissions,
  }
}
