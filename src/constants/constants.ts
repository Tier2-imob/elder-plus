import { AccountRole } from "@/components/types";

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