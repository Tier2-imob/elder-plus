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

import {
  CIRCLE_ROLE_LABELS,
  type CircleRole,
  type FamilyMember,
  type PermissionKey,
} from '@/components/care/types';
import type { AccountRole } from '@/components/types';
import { CIRCLE_CONSENT_VERSION } from '@/constants/constants';
import { assertNotLockedOut, clearLockout, registerFailedAttempt } from '@/services/auth-lockout';
import {
  canDissolve,
  canEditMember,
  canLeave,
  canManage,
  checkAccountCanJoin,
  checkInviteUsable,
  circleError,
  isInactive,
  normalizeInviteCode,
} from '@/services/circle-rules';
import * as circles from '@/services/firebase/circles';
import { migrateLegacyCareData } from '@/services/firebase/legacy-migration';
import type { CircleDoc, CircleMemberDoc, InviteDoc } from '@/services/firebase/types';
import * as users from '@/services/firebase/users';
import { readCache, writeCache } from '@/services/local-cache';

type CircleAccount = { uid: string; name: string; roles: AccountRole[] } | null

/** A circle the user takes part in, as the circle selector lists it. */
export type CircleSummary = { id: string; name: string; inactive: boolean }

type CircleValue = {
  /**
   * True until we know whether the user has a circle (and, if so, their membership in it), and
   * while the creator's pre-circle data is being moved into it.
   */
  circleLoading: boolean
  /** Every circle the user takes part in (for the selector), in the order they joined. */
  circles: CircleSummary[]
  /** The circle the screens show (the user's choice, kept on the device). */
  activeCircleId: string | null
  /** The shown circle is inactive: read-only, nothing can be written until a manager reactivates it. */
  circleInactive: boolean
  /** Inactivate the shown circle (data is kept; manager only). */
  inactivateCircle: () => Promise<void>
  /** Reactivate the shown circle (manager only). */
  reactivateCircle: () => Promise<void>
  selectCircle: (circleId: string) => void
  /**
   * Show the setup screen to create or join another circle even though the user has circles
   * (cancel goes back). Not offered past the circle limit or without a care profile.
   */
  addingCircle: boolean
  canAddCircle: boolean
  startAddingCircle: () => void
  cancelAddingCircle: () => void
  /** The account's profiles (elder, family, partner), live. */
  roles: AccountRole[]
  /** Elder profile without a circle of their own yet: may create one as the assisted person. */
  canCreateForSelf: boolean
  /** Family profile: may create a circle for someone they care for. */
  canCreateForOther: boolean
  circle: CircleDoc | null
  /** The signed-in user's own member doc (active or pending), or null without a circle. */
  membership: CircleMemberDoc | null
  /** Every member, active and pending. Empty while the user's own membership is pending. */
  members: CircleMemberDoc[]
  /**
   * Create a circle: `forSelf` = the user is the assisted person (elder profile); otherwise around
   * `subjectName`, a managed person without an account. Throws circle/* errors for the screen.
   */
  createCircle: (input: { forSelf: boolean; subjectName?: string }) => Promise<void>

  // ─── Convites (quem gerencia) ───
  /** Open invites (not used, not revoked, not expired), newest first. Managers only. */
  invites: InviteDoc[]
  createInvite: (input: { role: CircleRole; label?: string; permissions: PermissionKey[] }) => Promise<InviteDoc>
  revokeInvite: (code: string) => Promise<void>
  approveMember: (uid: string) => Promise<void>
  /** Reject a pending member or remove an active one. */
  removeMember: (uid: string) => Promise<void>
  /** Change another member's role, relation and permissions. */
  updateMember: (
    uid: string,
    changes: { role: CircleRole; label: string | null; permissions: PermissionKey[] }
  ) => Promise<void>

  // ─── O próprio membro ───
  /** Leave the circle (blocked for the titular and the last manager — see canLeave). */
  leaveCircle: () => Promise<void>
  /** Set or clear one's own phone (needed to be an emergency contact). */
  updateMyPhone: (phone: string) => Promise<void>
  /** Leave a circle you are alone in, deleting it and all its data (see canDissolve). */
  dissolveCircle: () => Promise<void>

  // ─── Convidado ───
  /** Find a usable invite by what the user typed. Throws circle/* or lockout errors. */
  lookupInvite: (typedCode: string) => Promise<InviteDoc>
  /** Join as pending with the consent recorded. */
  acceptInvite: (code: string) => Promise<void>
  /** Withdraw one's own pending request. */
  cancelPending: () => Promise<void>
}

const CircleContext = createContext<CircleValue | undefined>(undefined)

/** Longest the circle screen waits for the creator's legacy data migration before opening. */
const MIGRATION_WAIT_MS = 8000

/**
 * The signed-in user's care circles, live: users/{uid}.circleIds → for the active circle, own member
 * doc → circle doc and, once active, the member list. A pointer left behind after a manager removed
 * the user is cleared as soon as the server confirms the member doc is gone.
 */
export function CircleProvider({ account, children }: { account: CircleAccount; children: ReactNode }) {
  const uid = account?.uid

  // undefined = not known yet (loading).
  const [circleIds, setCircleIds] = useState<string[] | undefined>(undefined)
  const [roles, setRoles] = useState<AccountRole[]>(account?.roles ?? [])
  // The user's pick in the selector (kept on the device) and the "add another circle" flow.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addingCircle, setAddingCircle] = useState(false)

  // The circle the screens show: undefined while loading, null when none (or while adding one).
  const circleId: string | null | undefined =
    circleIds === undefined
      ? undefined
      : addingCircle
        ? null
        : selectedId && circleIds.includes(selectedId)
          ? selectedId
          : (circleIds[0] ?? null)

  const [membership, setMembership] = useState<CircleMemberDoc | null | undefined>(undefined)
  const [circle, setCircle] = useState<CircleDoc | null | undefined>(undefined)
  const [members, setMembers] = useState<CircleMemberDoc[]>([])

  // Reset during render when the account or the circle changes (same pattern as CareTasksProvider).
  const [keyedFor, setKeyedFor] = useState({ uid, circleId })
  if (keyedFor.uid !== uid) {
    setKeyedFor({ uid, circleId: undefined })
    setCircleIds(undefined)
    setSelectedId(null)
    setAddingCircle(false)
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
    return users.observeMemberships(
      uid,
      (value) => {
        setCircleIds(value.circleIds)
        setRoles(value.roles)
      },
      (e) => {
        console.warn('observeMemberships failed', e)
        setCircleIds([])
      }
    )
  }, [uid])

  // The last circle the user picked on this device.
  const activeCacheKey = uid ? `activeCircle:${uid}` : null
  useEffect(() => {
    if (!activeCacheKey) return
    let active = true
    readCache<string>(activeCacheKey).then((saved) => {
      if (active && saved) setSelectedId(saved)
    })
    return () => {
      active = false
    }
  }, [activeCacheKey])

  const selectCircle = useCallback(
    (id: string) => {
      setSelectedId(id)
      setAddingCircle(false)
      if (activeCacheKey) void writeCache(activeCacheKey, id)
    },
    [activeCacheKey]
  )

  // Names for the selector: every circle doc the user belongs to (at most CIRCLE_LIMITS.maxCircles).
  const [circleDocs, setCircleDocs] = useState<Record<string, CircleDoc>>({})
  const circleIdsKey = (circleIds ?? []).join(',')
  useEffect(() => {
    const ids = circleIdsKey ? circleIdsKey.split(',') : []
    const stops = ids.map((id) =>
      circles.observeCircle(
        id,
        (doc) => setCircleDocs((prev) => (doc ? { ...prev, [id]: doc } : prev)),
        (e) => console.warn('observeCircle (selector) failed', e)
      )
    )
    return () => stops.forEach((stop) => stop())
  }, [circleIdsKey])

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
          circles.clearStaleCircle(uid, circleId).catch((e) => console.warn('clearStaleCircle failed', e))
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
    const migration = migrateLegacyCareData(uid, circleId)
      .then((moved) => {
        if (moved) console.log(`migrated ${moved} legacy care docs into circle ${circleId}`)
      })
      .catch((e) => console.warn('migrateLegacyCareData failed', e))
    // Never hold the screen for long: after MIGRATION_WAIT_MS the circle opens anyway and the moved
    // tasks appear live when the migration finishes (the task list is an onSnapshot).
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, MIGRATION_WAIT_MS))
    void Promise.race([migration, timeout]).then(() => {
      if (active) setMigratedFor(circleId)
    })
    return () => {
      active = false
    }
  }, [uid, circleId, needsMigration, migratedFor])
  const migrating = needsMigration && migratedFor !== circleId

  // After a write that changed the user's circles committed (the server has it), apply it now
  // rather than wait for the profile listener — its server-ack snapshot proved unreliable.
  const joined = useCallback(
    (id: string) => {
      setCircleIds((prev) => [...(prev ?? []).filter((x) => x !== id), id])
      selectCircle(id)
    },
    [selectCircle]
  )
  const left = useCallback((id: string) => {
    setCircleIds((prev) => (prev ?? []).filter((x) => x !== id))
  }, [])

  // Inactive circles don't count toward the limit; a circle whose doc hasn't loaded yet counts.
  const activeCircleCount = (circleIds ?? []).filter((id) => circleDocs[id]?.status !== 'inativo').length

  const createCircle = useCallback(
    async (input: { forSelf: boolean; subjectName?: string }): Promise<void> => {
      if (!account) throw new Error('No signed-in user')
      const id = await circles.createCircle({
        uid: account.uid,
        name: account.name,
        roles,
        currentCircleIds: circleIds ?? [],
        activeCircleCount,
        forSelf: input.forSelf,
        subjectName: input.subjectName,
        consentVersion: CIRCLE_CONSENT_VERSION,
      })
      joined(id)
    },
    [account, roles, circleIds, activeCircleCount, joined]
  )

  const myCircleDocs = (circleIds ?? []).map((id) => circleDocs[id]).filter((c): c is CircleDoc => !!c)
  const canCreateForSelf = roles.includes('elder') && !myCircleDocs.some((c) => c.subject.uid === uid)
  const canCreateForOther = roles.includes('family')
  const canAddCircle =
    circleIds !== undefined && checkAccountCanJoin(roles, circleIds, undefined, activeCircleCount) === null

  // A failed circle read resolves to null (treated as "no circle"), so this never sticks.
  // ─── Convites ───────────────────────────────────────────────────────────────

  const isManager = canManage(membership)
  const [invites, setInvites] = useState<InviteDoc[]>([])
  const [invitesFor, setInvitesFor] = useState<string | null>(null)
  if (!isManager && invitesFor !== null) {
    setInvitesFor(null)
    setInvites([])
  }
  // Bumped after creating/revoking to reload the list.
  const [invitesVersion, setInvitesVersion] = useState(0)
  useEffect(() => {
    if (!circleId || !isManager) return
    let active = true
    circles
      .listCircleInvites(circleId)
      .then((all) => {
        if (!active) return
        const now = Date.now()
        setInvites(all.filter((i) => !i.usedBy && !i.revoked && i.expiresAt.toMillis() > now))
        setInvitesFor(circleId)
      })
      .catch((e) => console.warn('listCircleInvites failed', e))
    return () => {
      active = false
    }
  }, [circleId, isManager, invitesVersion])

  const createInvite = useCallback(
    async (input: { role: CircleRole; label?: string; permissions: PermissionKey[] }): Promise<InviteDoc> => {
      if (!circle || !membership) throw circleError('circle/not-allowed')
      if (isInactive(circle)) throw circleError('circle/inactive')
      const code = await circles.createInvite({ circle, actor: membership, ...input })
      setInvitesVersion((n) => n + 1)
      const invite = await circles.getInvite(code)
      if (!invite) throw circleError('circle/invite-not-found')
      return invite
    },
    [circle, membership]
  )

  const revokeInvite = useCallback(async (code: string): Promise<void> => {
    await circles.revokeInvite(code)
    setInvitesVersion((n) => n + 1)
  }, [])

  const findMember = useCallback(
    (memberUid: string) => {
      const member = members.find((m) => m.uid === memberUid)
      if (!member) throw circleError('circle/not-allowed')
      return member
    },
    [members]
  )

  const approveMember = useCallback(
    async (memberUid: string): Promise<void> => {
      if (!circleId) throw circleError('circle/not-allowed')
      if (isInactive(circle)) throw circleError('circle/inactive')
      const target = findMember(memberUid)
      // One titular per circle: the rules would refuse a second link anyway.
      if (target.role === 'titular' && circle?.subject.uid) throw circleError('circle/titular-exists')
      if (!circle) throw circleError('circle/not-allowed')
      await circles.approveMember(circle, target)
    },
    [circleId, circle, findMember]
  )

  const removeMember = useCallback(
    async (memberUid: string): Promise<void> => {
      if (!circleId) throw circleError('circle/not-allowed')
      const target = findMember(memberUid)
      // Pending members can always be refused; active ones only if editable (never the titular).
      if (target.status === 'ativo' && !canEditMember(membership, target)) throw circleError('circle/not-allowed')
      await circles.removeMember(circleId, target, members)
    },
    [circleId, findMember, membership, members]
  )

  const updateMember = useCallback(
    async (
      memberUid: string,
      changes: { role: CircleRole; label: string | null; permissions: PermissionKey[] }
    ): Promise<void> => {
      if (!circle) throw circleError('circle/not-allowed')
      if (isInactive(circle)) throw circleError('circle/inactive')
      const target = findMember(memberUid)
      if (!canEditMember(membership, target)) throw circleError('circle/not-allowed')
      await circles.updateMember(circle, target, changes, members)
    },
    [circle, findMember, membership, members]
  )

  const leave = useCallback(async (): Promise<void> => {
    if (!circle || !membership) throw circleError('circle/not-allowed')
    const blocked = canLeave(membership, members)
    if (blocked) throw circleError(blocked)
    await circles.leaveCircle(circle, membership)
    left(circle.id)
  }, [circle, membership, members, left])

  const inactivateCircle = useCallback(async (): Promise<void> => {
    if (!circle || !membership || !canManage(membership)) throw circleError('circle/not-allowed')
    await circles.setCircleActive(circle, membership, false)
  }, [circle, membership])

  const reactivateCircle = useCallback(async (): Promise<void> => {
    if (!circle || !membership || !canManage(membership)) throw circleError('circle/not-allowed')
    await circles.setCircleActive(circle, membership, true)
  }, [circle, membership])

  const dissolve = useCallback(async (): Promise<void> => {
    if (!circle || !membership || !canDissolve(membership, members, circle)) throw circleError('circle/not-allowed')
    await circles.dissolveCircle(circle, membership, members)
    left(circle.id)
  }, [circle, membership, members, left])

  const updateMyPhone = useCallback(
    async (phone: string): Promise<void> => {
      if (!circleId || !membership) throw circleError('circle/not-allowed')
      await circles.updateOwnPhone(circleId, membership, phone)
    },
    [circleId, membership]
  )

  // Wrong codes count against a per-user lockout (5 tries, then a cooldown) so codes can't be
  // guessed from the app; expired/used/revoked codes are real codes and don't count.
  const lookupInvite = useCallback(
    async (typedCode: string): Promise<InviteDoc> => {
      if (!uid) throw circleError('circle/not-allowed')
      const lockKey = `invite:${uid}`
      assertNotLockedOut(lockKey)
      const code = normalizeInviteCode(typedCode)
      const invite = code ? await circles.getInvite(code) : null
      if (!invite) {
        throw registerFailedAttempt(lockKey) ?? circleError('circle/invite-not-found')
      }
      clearLockout(lockKey)
      const unusable = checkInviteUsable(invite)
      if (unusable) throw circleError(unusable)
      return invite
    },
    [uid]
  )

  const acceptInvite = useCallback(
    async (code: string): Promise<void> => {
      if (!account) throw circleError('circle/not-allowed')
      const invite = await circles.acceptInvite({
        uid: account.uid,
        name: account.name,
        roles,
        currentCircleIds: circleIds ?? [],
        activeCircleCount,
        code,
        consentVersion: CIRCLE_CONSENT_VERSION,
      })
      joined(invite.circleId)
    },
    [account, roles, circleIds, activeCircleCount, joined]
  )

  const cancelPending = useCallback(async (): Promise<void> => {
    if (!circle || !membership || membership.status !== 'pendente') return
    await circles.leaveCircle(circle, membership)
    left(circle.id)
  }, [circle, membership, left])

  const circleLoading =
    !!uid &&
    (circleId === undefined ||
      migrating ||
      (!!circleId && (membership === undefined || (!!membership && circle === undefined))))

  const value = useMemo<CircleValue>(
    () => ({
      circleLoading,
      circles: (circleIds ?? []).map((id) => ({
        id,
        name: circleDocs[id]?.subject.name ?? '…',
        inactive: circleDocs[id]?.status === 'inativo',
      })),
      activeCircleId: circleId ?? null,
      circleInactive: isInactive(circle),
      inactivateCircle,
      reactivateCircle,
      selectCircle,
      addingCircle,
      canAddCircle,
      startAddingCircle: () => setAddingCircle(true),
      cancelAddingCircle: () => setAddingCircle(false),
      roles,
      canCreateForSelf,
      canCreateForOther,
      circle: membership ? (circle ?? null) : null,
      membership: membership ?? null,
      members,
      createCircle,
      invites,
      createInvite,
      revokeInvite,
      approveMember,
      removeMember,
      updateMember,
      lookupInvite,
      acceptInvite,
      cancelPending,
      leaveCircle: leave,
      updateMyPhone,
      dissolveCircle: dissolve,
    }),
    [
      circleLoading,
      circleIds,
      circleDocs,
      circleId,
      inactivateCircle,
      reactivateCircle,
      selectCircle,
      addingCircle,
      canAddCircle,
      roles,
      canCreateForSelf,
      canCreateForOther,
      circle,
      membership,
      members,
      createCircle,
      invites,
      createInvite,
      revokeInvite,
      approveMember,
      removeMember,
      updateMember,
      lookupInvite,
      acceptInvite,
      cancelPending,
      leave,
      updateMyPhone,
      dissolve,
    ]
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

/** Member doc → the card shape the Família tab renders, from `viewer`'s point of view. */
export function toFamilyMember(member: CircleMemberDoc, viewer?: CircleMemberDoc | null): FamilyMember {
  const roleLabel = CIRCLE_ROLE_LABELS[member.role] ?? member.role
  return {
    isSelf: !!viewer && viewer.uid === member.uid,
    editable: canEditMember(viewer, member),
    circleRole: member.role,
    label: member.label,
    phone: member.phone,
    id: member.uid,
    name: member.name,
    role: member.label ? `${member.label} — ${roleLabel}` : roleLabel,
    initials: initialsOf(member.name),
    lastAccess: member.status === 'pendente' ? 'aguardando aprovação' : formatLastAccess(member.lastAccess?.toDate() ?? null),
    permissions: member.permissions,
  }
}
