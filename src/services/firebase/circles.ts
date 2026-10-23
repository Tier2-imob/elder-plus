import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import {
  ALL_PERMISSIONS,
  CIRCLE_LIMITS,
  type CircleRole,
  type PermissionKey,
} from '@/components/care/types'
import type { AccountRole } from '@/components/types'
import {
  checkAccountCanJoin,
  checkCanInvite,
  checkInviteUsable,
  circleError,
  countEmergencyContacts,
  makeInviteCode,
  normalizePhone,
  withImpliedPermissions,
} from '@/services/circle-rules'

import { db } from './config'
import type { CircleDoc, CircleMemberDoc, InviteDoc } from './types'

/**
 * Care circle I/O: circles/{circleId}, circles/{circleId}/members/{uid}, invites/{code} and the
 * users/{uid}.circleId pointer ("one circle per user"). Every multi-document change is a single
 * writeBatch because firestore.rules validates the documents against each other (getAfter /
 * existsAfter): e.g. accepting an invite must create the member, mark the invite used, set the
 * user's circleId and bump memberCount together.
 *
 * The data collections (tasks, medications, ...) move under the circle in a later step.
 */

const circleRef = (circleId: string) => doc(db, 'circles', circleId)
const memberRef = (circleId: string, uid: string) => doc(db, 'circles', circleId, 'members', uid)
const inviteRef = (code: string) => doc(db, 'invites', code)
const userRef = (uid: string) => doc(db, 'users', uid)

// 'estimate' so docs written on this device show a local time while the server stamp is pending.
function toCircle(snap: DocumentSnapshot<DocumentData>): CircleDoc | null {
  if (!snap.exists()) return null
  const data = snap.data({ serverTimestamps: 'estimate' })
  return {
    id: snap.id,
    subject: { name: data.subject?.name ?? '', uid: data.subject?.uid ?? null },
    createdBy: data.createdBy,
    createdAt: data.createdAt ?? null,
    memberCount: data.memberCount ?? 0,
    emergencyCount: data.emergencyCount ?? 0,
    consent: {
      by: data.consent?.by ?? data.createdBy,
      at: data.consent?.at ?? null,
      version: data.consent?.version ?? '',
    },
  }
}

function toMember(snap: DocumentSnapshot<DocumentData>): CircleMemberDoc | null {
  if (!snap.exists()) return null
  const data = snap.data({ serverTimestamps: 'estimate' })
  return {
    uid: snap.id,
    name: data.name ?? '',
    role: data.role,
    label: data.label ?? null,
    permissions: data.permissions ?? [],
    status: data.status,
    phone: data.phone ?? null,
    invitedBy: data.invitedBy ?? null,
    inviteCode: data.inviteCode ?? null,
    joinedAt: data.joinedAt ?? null,
    lastAccess: data.lastAccess ?? null,
    consent: { at: data.consent?.at ?? null, version: data.consent?.version ?? '' },
  }
}

function toInvite(snap: DocumentSnapshot<DocumentData>): InviteDoc | null {
  if (!snap.exists()) return null
  const data = snap.data({ serverTimestamps: 'estimate' })
  return {
    code: snap.id,
    circleId: data.circleId,
    circleName: data.circleName ?? '',
    role: data.role,
    label: data.label ?? null,
    permissions: data.permissions ?? [],
    createdBy: data.createdBy,
    createdByName: data.createdByName ?? '',
    createdAt: data.createdAt ?? null,
    expiresAt: data.expiresAt,
    usedBy: data.usedBy ?? null,
    usedAt: data.usedAt ?? null,
    revoked: data.revoked === true,
  }
}

// ─── Leitura ───────────────────────────────────────────────────────────────────

export async function getCircle(circleId: string): Promise<CircleDoc | null> {
  return toCircle(await getDoc(circleRef(circleId)))
}

export function observeCircle(
  circleId: string,
  onNext: (circle: CircleDoc | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(circleRef(circleId), (snap) => onNext(toCircle(snap)), onError)
}

/** All members (active and pending). Readable by active members; a pending member only reads itself. */
export function observeMembers(
  circleId: string,
  onNext: (members: CircleMemberDoc[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'circles', circleId, 'members'),
    (snap) => onNext(snap.docs.map((d) => toMember(d)).filter((m): m is CircleMemberDoc => m !== null)),
    onError
  )
}

/**
 * Subscribe to the signed-in user's own member doc (readable even while pending). `exists` is false
 * when the doc is gone; `fromCache` tells whether the server confirmed that.
 */
export function observeOwnMember(
  circleId: string,
  uid: string,
  onNext: (member: CircleMemberDoc | null, fromCache: boolean) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    memberRef(circleId, uid),
    (snap) => onNext(toMember(snap), snap.metadata.fromCache),
    onError
  )
}

/**
 * Clear a users/{uid}.circleId left behind after a manager removed or rejected the user (the
 * manager cannot write another user's profile): the user simply has no circle again.
 */
export async function clearStaleCircle(uid: string): Promise<void> {
  await updateDoc(userRef(uid), { circleId: null })
}

// ─── Criação ───────────────────────────────────────────────────────────────────

/**
 * Create the user's circle. An `elder` account becomes the titular itself; any other account
 * becomes the admin of a circle whose titular is nominal (`subjectName`). The creator's consent
 * declaration is stamped by the server.
 */
export async function createCircle(input: {
  uid: string
  name: string
  accountRole: AccountRole
  currentCircleId: string | null
  subjectName?: string
  consentVersion: string
}): Promise<string> {
  const blocked = checkAccountCanJoin(input.accountRole, input.currentCircleId)
  if (blocked) throw circleError(blocked)

  const isTitular = input.accountRole === 'elder'
  const ref = doc(collection(db, 'circles'))
  const batch = writeBatch(db)
  batch.set(ref, {
    subject: {
      name: isTitular ? input.name : (input.subjectName ?? '').trim(),
      uid: isTitular ? input.uid : null,
    },
    createdBy: input.uid,
    createdAt: serverTimestamp(),
    memberCount: 1,
    emergencyCount: 0,
    consent: { by: input.uid, at: serverTimestamp(), version: input.consentVersion },
  })
  batch.set(memberRef(ref.id, input.uid), {
    name: input.name,
    role: (isTitular ? 'titular' : 'admin') satisfies CircleRole,
    label: null,
    // Everything except `emergencia`: being an emergency contact needs a phone and is granted later.
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'emergencia'),
    status: 'ativo',
    phone: null,
    invitedBy: null,
    inviteCode: null,
    joinedAt: serverTimestamp(),
    lastAccess: serverTimestamp(),
    consent: { at: serverTimestamp(), version: input.consentVersion },
  })
  batch.update(userRef(input.uid), { circleId: ref.id })
  await batch.commit()
  return ref.id
}

// ─── Convites ──────────────────────────────────────────────────────────────────

/** Issue a single-use invite valid for CIRCLE_LIMITS.inviteValidityDays. Returns the code. */
export async function createInvite(input: {
  circle: CircleDoc
  actor: CircleMemberDoc
  role: CircleRole
  label?: string
  permissions: PermissionKey[]
}): Promise<string> {
  // `emergencia` is never granted by invite: it needs a phone and counts against the 3-contact
  // limit, which the accept batch cannot update — it is set later when editing the member.
  const permissions = withImpliedPermissions(
    (input.role === 'titular' ? ALL_PERMISSIONS : input.permissions).filter((p) => p !== 'emergencia')
  )
  const blocked = checkCanInvite(input.actor, input.circle, input.role, permissions)
  if (blocked) throw circleError(blocked)

  // A collision is astronomically unlikely, but writing over an existing code would be an update
  // (rejected by the rules), so pick a free one first.
  let code = makeInviteCode()
  for (let attempt = 0; attempt < 3 && (await getDoc(inviteRef(code))).exists(); attempt++) {
    code = makeInviteCode()
  }

  const validityMs = CIRCLE_LIMITS.inviteValidityDays * 24 * 60 * 60 * 1000
  await setDoc(inviteRef(code), {
    circleId: input.circle.id,
    circleName: input.circle.subject.name,
    role: input.role,
    label: input.label?.trim() || null,
    permissions,
    createdBy: input.actor.uid,
    createdByName: input.actor.name,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + validityMs),
    usedBy: null,
    usedAt: null,
    revoked: false,
  })
  return code
}

export async function getInvite(code: string): Promise<InviteDoc | null> {
  return toInvite(await getDoc(inviteRef(code)))
}

/** Invites issued for the circle (managers only), newest first. */
export async function listCircleInvites(circleId: string): Promise<InviteDoc[]> {
  const snap = await getDocs(query(collection(db, 'invites'), where('circleId', '==', circleId)))
  return snap.docs
    .map((d) => toInvite(d))
    .filter((i): i is InviteDoc => i !== null)
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
}

export async function revokeInvite(code: string): Promise<void> {
  await updateDoc(inviteRef(code), { revoked: true })
}

/**
 * Accept an invite: the user joins as `pendente` (sees nothing until a manager approves), the
 * invite is consumed and the user's circleId is set — all in one batch. Fails fast with a
 * circle/* error code for the cases the acceptance screen explains.
 */
export async function acceptInvite(input: {
  uid: string
  name: string
  accountRole: AccountRole
  currentCircleId: string | null
  code: string
  consentVersion: string
}): Promise<InviteDoc> {
  const blocked = checkAccountCanJoin(input.accountRole, input.currentCircleId)
  if (blocked) throw circleError(blocked)

  const invite = await getInvite(input.code)
  const unusable = checkInviteUsable(invite)
  if (unusable || !invite) throw circleError(unusable ?? 'circle/invite-not-found')

  const batch = writeBatch(db)
  batch.set(memberRef(invite.circleId, input.uid), {
    name: input.name,
    role: invite.role,
    label: invite.label,
    permissions: invite.permissions,
    status: 'pendente',
    phone: null,
    invitedBy: invite.createdBy,
    inviteCode: invite.code,
    joinedAt: serverTimestamp(),
    lastAccess: serverTimestamp(),
    consent: { at: serverTimestamp(), version: input.consentVersion },
  })
  batch.update(inviteRef(invite.code), { usedBy: input.uid, usedAt: serverTimestamp() })
  batch.update(userRef(input.uid), { circleId: invite.circleId })
  batch.update(circleRef(invite.circleId), { memberCount: increment(1) })
  await batch.commit()
  return invite
}

// ─── Gestão de membros (quem tem gerenciar-membros) ───────────────────────────

/** Approve a pending member. Approving a titular invite links the account to the circle's subject. */
export async function approveMember(circleId: string, member: CircleMemberDoc): Promise<void> {
  const batch = writeBatch(db)
  batch.update(memberRef(circleId, member.uid), { status: 'ativo' })
  if (member.role === 'titular') batch.update(circleRef(circleId), { 'subject.uid': member.uid })
  await batch.commit()
}

/**
 * Reject a pending member or remove an active one. Their users/{uid}.circleId cannot be written
 * by the manager; `clearStaleCircle` clears it on the removed user's next access.
 *
 * `emergencyCount` is recounted from the member list (`members`, everyone in the circle) instead of
 * decremented: circles created before this recount started with the creator holding `emergencia`
 * but a count of 0, and incrementing would carry that error forever.
 */
export async function removeMember(
  circleId: string,
  member: CircleMemberDoc,
  members: CircleMemberDoc[]
): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(memberRef(circleId, member.uid))
  batch.update(circleRef(circleId), {
    memberCount: increment(-1),
    emergencyCount: countEmergencyContacts(members, member.uid),
  })
  await batch.commit()
}

/**
 * Change another member's role, label and permissions (editar implies ver). Becoming an emergency
 * contact needs the member's phone and a free slot (CIRCLE_LIMITS.maxEmergencyContacts); the
 * circle's `emergencyCount` is rewritten from the actual members.
 */
export async function updateMember(
  circle: CircleDoc,
  member: CircleMemberDoc,
  changes: { role: CircleRole; label: string | null; permissions: PermissionKey[] },
  members: CircleMemberDoc[]
): Promise<void> {
  const permissions = withImpliedPermissions(changes.permissions)
  const isEmergency = permissions.includes('emergencia')
  const others = countEmergencyContacts(members, member.uid)
  if (isEmergency && !member.permissions.includes('emergencia')) {
    if (!member.phone) throw circleError('circle/emergency-needs-phone')
    if (others >= CIRCLE_LIMITS.maxEmergencyContacts) throw circleError('circle/emergency-full')
  }

  const batch = writeBatch(db)
  batch.update(memberRef(circle.id, member.uid), {
    role: changes.role,
    label: changes.label?.trim() || null,
    permissions,
  })
  batch.update(circleRef(circle.id), { emergencyCount: Math.min(others + (isEmergency ? 1 : 0), CIRCLE_LIMITS.maxEmergencyContacts) })
  await batch.commit()
}

// ─── O próprio membro ──────────────────────────────────────────────────────────

/**
 * Leave the circle (never the titular; the last manager must transfer first — see canLeave). The
 * rules only let a leaver lower `emergencyCount` by one, so it is decremented — clamped at 0 for
 * circles whose count was never raised for the creator.
 */
export async function leaveCircle(circle: CircleDoc, member: CircleMemberDoc): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(memberRef(circle.id, member.uid))
  batch.update(circleRef(circle.id), {
    memberCount: increment(-1),
    emergencyCount: Math.max(0, circle.emergencyCount - (member.permissions.includes('emergencia') ? 1 : 0)),
  })
  batch.update(userRef(member.uid), { circleId: null })
  await batch.commit()
}

export async function touchLastAccess(circleId: string, uid: string): Promise<void> {
  await updateDoc(memberRef(circleId, uid), { lastAccess: serverTimestamp() })
}

/**
 * The member's own phone (only the member can write it). Empty clears it — not allowed while they
 * are an emergency contact, who must stay reachable.
 */
export async function updateOwnPhone(circleId: string, member: CircleMemberDoc, input: string): Promise<void> {
  const trimmed = input.trim()
  if (!trimmed && member.permissions.includes('emergencia')) throw circleError('circle/emergency-needs-phone')
  const phone = trimmed ? normalizePhone(trimmed) : null
  if (trimmed && !phone) throw circleError('circle/invalid-phone')
  await updateDoc(memberRef(circleId, member.uid), { phone })
}
