import { AccountRole } from "@/components/types";

/**
 * Versão corrente dos Termos de Uso e Política de Privacidade aceitos no cadastro.
 * Registrada em `users/{uid}.termsVersion` junto do carimbo de aceite (LGPD).
 * Ao bumpar este valor, considera-se uma NOVA revisão dos termos: usuários que
 * aceitaram uma versão anterior precisam consentir novamente.
 */
export const TERMS_VERSION = '1.0'

/**
 * Versão do texto de consentimento do círculo de cuidado: a declaração de quem cria o círculo
 * ("sou responsável / tenho autorização da pessoa assistida") e o aceite de quem entra por convite.
 * Registrada junto do carimbo do servidor (LGPD art. 11 — dados de saúde).
 */
export const CIRCLE_CONSENT_VERSION = '1.0'

/**
 * Chave do Google Maps Embed API, lida do ambiente (.env local / variáveis do EAS) — nunca
 * versionada. Vazia, o mapa mostra um placeholder. Restringir a chave à Maps Embed API no console.
 */
export const GOOGLE_MAPS_EMBED_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

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