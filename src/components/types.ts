import MaterialIcons from "@expo/vector-icons/MaterialIcons"

//** Tipo de contas de acesso */
export type AccountRole = 'elder' | 'family' | 'partner'

//** Botão de login */
export type RoleRowProps = {
    icon: keyof typeof MaterialIcons.glyphMap
    title: string
    description: string
    tone: 'navy' | 'terracotta'
    isLast? : boolean
    onPress: () => void
}