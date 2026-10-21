import { AccountRole } from "@/components/types";

/**
 * Versão corrente dos Termos de Uso e Política de Privacidade aceitos no cadastro.
 * Registrada em `users/{uid}.termsVersion` junto do carimbo de aceite (LGPD).
 * Ao bumpar este valor, considera-se uma NOVA revisão dos termos: usuários que
 * aceitaram uma versão anterior precisam consentir novamente.
 */
export const TERMS_VERSION = '1.0'

export const ROLE_CONTEXT: Record<AccountRole, { label: string; nameHint: string; tone: 'navy' | 'terracota' }> = {
    elder: {
        label: 'Idoso',
        nameHint: 'É assim que vamos te chamar dentro do Elder+.',
        tone: 'navy'
    },
    family: {
        label: 'Família e pessoa assistida',
        nameHint: 'É assim que vamos te chamar dentro do Elder+.',
        tone: 'navy'
    },
    partner: {
        label: 'Comércio e parceiros',
        nameHint: 'É assim que vamos te chamar dentro do Elder+.',
        tone: 'terracota'
    }
}