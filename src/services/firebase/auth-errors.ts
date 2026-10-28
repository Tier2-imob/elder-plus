const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este e-mail já está em uso. Tente entrar ou use outro e-mail.',
  'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido. Verifique e tente novamente.',
  'auth/invalid-credential': 'E-mail ou senha incorretos. Verifique e tente novamente.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos. Verifique e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique e tente novamente.',
  'auth/missing-email': 'Digite seu e-mail.',
  // Redefinição de senha (o link é aberto fora do app, na página do Firebase)
  'auth/expired-action-code': 'Este link expirou. Peça um novo link de redefinição.',
  'auth/invalid-action-code': 'Este link é inválido ou já foi usado. Peça um novo link de redefinição.',
  'app/too-many-attempts': 'Muitas tentativas. Tente novamente em alguns instantes.',
  'app/partner-not-available': 'O Portal do Parceiro ainda não está disponível. Em breve!',
  'app/terms-not-accepted':
    'Para continuar, aceite os Termos de Uso e a Política de Privacidade do Elder+.',
  'app/profile-write-failed': 'Não foi possível concluir o cadastro. Tente novamente.',
  // Entrada com Google
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail usando outro método de entrada.',
  'auth/popup-closed-by-user': 'A entrada com o Google foi interrompida. Tente novamente.',
  'app/google-play-services-unavailable':
    'O Google Play Services está indisponível ou desatualizado. Atualize e tente novamente.',
  'app/google-signin-failed': 'Não foi possível entrar com o Google. Tente novamente.',
  'app/no-profile':
    'Não encontramos uma conta Elder para esta conta Google. Faça seu cadastro primeiro.',
}

const FALLBACK = 'Algo deu errado. Tente novamente.'

export function toPtMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code?: unknown }).code
    // Client-side lockout carries the remaining wait in seconds — interpolate it so the user sees
    // exactly how long to wait. Falls back to the static message if the field is missing.
    if (code === 'app/too-many-attempts') {
      const remaining = (e as { remainingSeconds?: unknown }).remainingSeconds
      if (typeof remaining === 'number' && Number.isFinite(remaining) && remaining > 0) {
        return `Muitas tentativas. Tente novamente em ${remaining}s.`
      }
    }
    if (typeof code === 'string' && code in MESSAGES) return MESSAGES[code]
  }
  return FALLBACK
}
