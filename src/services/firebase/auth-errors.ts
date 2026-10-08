/**
 * Map a thrown auth/signup error to a readable Portuguese message. Reads a `code` field when
 * present (FirebaseError and the app sentinels both carry one) and never surfaces a raw code.
 */
const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está em uso. Tente entrar ou use outro e-mail.',
  'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido. Verifique e tente novamente.',
  'auth/invalid-credential': 'E-mail ou senha incorretos. Verifique e tente novamente.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos. Verifique e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
  'app/partner-not-available': 'O Portal do Parceiro ainda não está disponível. Em breve!',
  'app/profile-write-failed': 'Não foi possível concluir o cadastro. Tente novamente.',
}

const FALLBACK = 'Algo deu errado. Tente novamente.'

export function toPtMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code?: unknown }).code
    if (typeof code === 'string' && code in MESSAGES) return MESSAGES[code]
  }
  return FALLBACK
}
