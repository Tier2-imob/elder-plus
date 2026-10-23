import {
  ALL_PERMISSIONS,
  CIRCLE_LIMITS,
  type CircleRole,
  type PermissionKey,
} from '@/components/care/types'
import type { AccountRole } from '@/components/types'
import type { CircleDoc, CircleMemberDoc, InviteDoc } from '@/services/firebase/types'

/**
 * Care-circle business rules (client side, no I/O). The UI uses them to hide/disable actions and
 * the service uses them to fail fast with a clear error; firestore.rules enforces the same rules
 * on the server, which stays the source of truth.
 */

/** Error codes thrown by the circles service, translated to PT by `circleErrorMessage`. */
export type CircleErrorCode =
  | 'circle/partner-not-allowed'
  | 'circle/already-in-circle'
  | 'circle/full'
  | 'circle/emergency-full'
  | 'circle/invite-not-found'
  | 'circle/invite-expired'
  | 'circle/invite-used'
  | 'circle/invite-revoked'
  | 'circle/titular-exists'
  | 'circle/not-allowed'
  | 'circle/last-manager'

export function circleError(code: CircleErrorCode): Error & { code: CircleErrorCode } {
  const error = new Error(code) as Error & { code: CircleErrorCode }
  error.code = code
  return error
}

const MESSAGES: Record<CircleErrorCode, string> = {
  'circle/partner-not-allowed': 'Contas de comércio e parceiros não participam de círculos de cuidado.',
  'circle/already-in-circle': 'Você já participa de um círculo. Saia dele para entrar em outro.',
  'circle/full': `O círculo já tem ${CIRCLE_LIMITS.maxMembers} membros, o limite atual.`,
  'circle/emergency-full': `O círculo já tem ${CIRCLE_LIMITS.maxEmergencyContacts} contatos de emergência.`,
  'circle/invite-not-found': 'Código de convite não encontrado. Confira e tente novamente.',
  'circle/invite-expired': 'Este convite expirou. Peça um novo a quem convidou você.',
  'circle/invite-used': 'Este convite já foi usado.',
  'circle/invite-revoked': 'Este convite foi cancelado.',
  'circle/titular-exists': 'A pessoa assistida já tem uma conta vinculada a este círculo.',
  'circle/not-allowed': 'Você não tem permissão para esta ação.',
  'circle/last-manager': 'Você é a última pessoa que gerencia o círculo. Transfira essa função antes de sair.',
}

export function circleErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  if (code && code in MESSAGES) return MESSAGES[code as CircleErrorCode]
  // Firestore rules rejected the write (e.g. rules not published yet, or a stale state).
  if (code === 'permission-denied') return 'O servidor recusou esta ação. Tente novamente em instantes.'
  return 'Não foi possível concluir. Verifique sua conexão e tente novamente.'
}

// ─── Permissões ────────────────────────────────────────────────────────────────

/** "Editar implica ver": adds ver-* for every editar-*, de-duplicated, in ALL_PERMISSIONS order. */
export function withImpliedPermissions(permissions: PermissionKey[]): PermissionKey[] {
  const set = new Set(permissions)
  if (set.has('editar-rotina')) set.add('ver-rotina')
  if (set.has('editar-saude')) set.add('ver-saude')
  return ALL_PERMISSIONS.filter((p) => set.has(p))
}

export function hasPermission(member: CircleMemberDoc | null | undefined, permission: PermissionKey) {
  return !!member && member.status === 'ativo' && member.permissions.includes(permission)
}

export const canManage = (member: CircleMemberDoc | null | undefined) =>
  hasPermission(member, 'gerenciar-membros')

/** Nobody grants a permission they do not hold. */
export function canGrant(granter: CircleMemberDoc, permissions: PermissionKey[]): boolean {
  return permissions.every((p) => granter.permissions.includes(p))
}

/**
 * Can `actor` change `target`'s role/permissions or remove them? Managers only, never on
 * themselves, and the titular with an account is untouchable once active.
 */
export function canEditMember(actor: CircleMemberDoc | null | undefined, target: CircleMemberDoc): boolean {
  if (!actor || !canManage(actor) || actor.uid === target.uid) return false
  return !(target.role === 'titular' && target.status === 'ativo')
}

/** Can `member` leave? Never the titular; never the last active manager. */
export function canLeave(member: CircleMemberDoc, members: CircleMemberDoc[]): CircleErrorCode | null {
  if (member.role === 'titular') return 'circle/not-allowed'
  if (canManage(member) && members.filter((m) => m.uid !== member.uid && canManage(m)).length === 0) {
    return 'circle/last-manager'
  }
  return null
}

/** Can this tasks' responsible person be `member`? Active and able to see the routine. */
export const isAssignable = (member: CircleMemberDoc) => hasPermission(member, 'ver-rotina')

// ─── Criação, convite e aceite ─────────────────────────────────────────────────

/** Who may create or join a circle at all. */
export function checkAccountCanJoin(accountRole: AccountRole, currentCircleId: string | null): CircleErrorCode | null {
  if (accountRole === 'partner') return 'circle/partner-not-allowed'
  if (currentCircleId) return 'circle/already-in-circle'
  return null
}

/** Can `actor` issue an invite for `role` with `permissions` in `circle` right now? */
export function checkCanInvite(
  actor: CircleMemberDoc | null | undefined,
  circle: CircleDoc,
  role: CircleRole,
  permissions: PermissionKey[]
): CircleErrorCode | null {
  if (!actor || !canManage(actor) || !canGrant(actor, permissions)) return 'circle/not-allowed'
  if (circle.memberCount >= CIRCLE_LIMITS.maxMembers) return 'circle/full'
  // A titular invite only makes sense while the titular is nominal.
  if (role === 'titular' && circle.subject.uid !== null) return 'circle/titular-exists'
  return null
}

export function checkInviteUsable(invite: InviteDoc | null, now: Date = new Date()): CircleErrorCode | null {
  if (!invite) return 'circle/invite-not-found'
  if (invite.revoked) return 'circle/invite-revoked'
  if (invite.usedBy) return 'circle/invite-used'
  if (invite.expiresAt.toMillis() <= now.getTime()) return 'circle/invite-expired'
  return null
}

// Sem 0/O e 1/I/L, que se confundem ao ditar ou digitar.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

/**
 * Invite code like "ELDER-K7QM-3WZP" (31^8 ≈ 8.5e11 combinations). Math.random is enough here: the
 * threat is guessing codes by brute force, which the code space, the client lockout and the
 * manager's approval of every new member cover — not predicting another device's PRNG.
 */
export function makeInviteCode(): string {
  let raw = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return `ELDER-${raw.slice(0, 4)}-${raw.slice(4)}`
}

/** Normalize what the user typed ("elder k7qm3wzp", "K7QM-3WZP") to the stored code format. */
export function normalizeInviteCode(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/^ELDER/, '').replace(/[^A-Z0-9]/g, '')
  if (raw.length !== CODE_LENGTH || [...raw].some((c) => !CODE_ALPHABET.includes(c))) return null
  return `ELDER-${raw.slice(0, 4)}-${raw.slice(4)}`
}
