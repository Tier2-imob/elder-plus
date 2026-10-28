import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import type { AccountRole } from '@/components/types'

const PROFILES: {
  role: AccountRole
  title: string
  description: string
  icon: keyof typeof MaterialIcons.glyphMap
}[] = [
  {
    role: 'family',
    title: 'Família',
    description: 'Cuidar de alguém: criar o círculo de cuidado da pessoa ou entrar por convite.',
    icon: 'family-restroom',
  },
  {
    role: 'elder',
    title: 'Idoso',
    description: 'Ter o seu próprio círculo de cuidado, como a pessoa assistida.',
    icon: 'accessibility-new',
  },
  {
    role: 'partner',
    title: 'Comércio e parceiros',
    description: 'Anunciar serviços no Elder+.',
    icon: 'storefront',
  },
]

/**
 * "Minha conta": the account's profiles (one account can be both Idoso and Família) and sign out.
 * Partner is shown only when the account has it (it is chosen at signup).
 */
export function AccountScreen({
  name,
  roles,
  topInset = 0,
  onAddProfile,
  onSignOut,
  onBack,
}: {
  name: string
  roles: AccountRole[]
  topInset?: number
  /** Rejects with a user-facing PT message. */
  onAddProfile: (role: Exclude<AccountRole, 'partner'>) => Promise<void>
  onSignOut: () => void
  onBack: () => void
}) {
  const [busy, setBusy] = useState<AccountRole | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | undefined>(undefined)

  async function add(role: Exclude<AccountRole, 'partner'>, title: string) {
    if (busy) return
    setBusy(role)
    setMessage(undefined)
    try {
      await onAddProfile(role)
      setMessage({ text: `Perfil ${title} adicionado.`, error: false })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Não foi possível adicionar o perfil.', error: true })
    } finally {
      setBusy(null)
    }
  }

  return (
    <View className="flex-1 bg-offwhite">
      <ScrollView contentContainerStyle={{ paddingTop: topInset + 16, paddingHorizontal: 24, paddingBottom: 32 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          className="w-14 h-14 rounded-full items-center justify-center bg-white border border-hairline mb-7 active:opacity-70"
        >
          <MaterialIcons name="arrow-back" size={22} color="#11375C" />
        </Pressable>

        <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-1">
          Minha conta
        </Text>
        <Text className="font-hanken text-muted text-[17px] mb-7">{name}</Text>

        <Text accessibilityRole="header" className="font-hanken-bold text-navy text-lg mb-1">
          Meus perfis
        </Text>
        <Text className="font-hanken text-muted text-[15px] leading-[22px] mb-4">
          Uma mesma conta pode ter mais de um perfil. Por exemplo: ter o seu círculo como pessoa assistida e também
          cuidar de um familiar.
        </Text>

        {PROFILES.filter((p) => p.role !== 'partner' || roles.includes('partner')).map((p) => {
          const has = roles.includes(p.role)
          return (
            <View key={p.role} className="rounded-3xl border border-hairline bg-white p-5 mb-3">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-navy/10">
                  <MaterialIcons name={p.icon} size={24} color="#11375C" />
                </View>
                <Text className="flex-1 font-hanken-extrabold text-navy text-[17px]">{p.title}</Text>
                {has ? (
                  <View className="px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(56,142,60,0.12)' }}>
                    <Text className="font-hanken-bold text-sm" style={{ color: '#388E3C' }}>
                      Ativo
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="font-hanken text-ink text-[15px] leading-[22px]">{p.description}</Text>
              {!has && p.role !== 'partner' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar o perfil ${p.title}`}
                  accessibilityState={{ busy: busy === p.role, disabled: !!busy }}
                  disabled={!!busy}
                  onPress={() => add(p.role as Exclude<AccountRole, 'partner'>, p.title)}
                  className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl mt-4 bg-navy active:opacity-90"
                >
                  {busy === p.role ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="add" size={21} color="#FFFFFF" />
                  )}
                  <Text className="font-hanken-bold text-base text-white">Adicionar perfil</Text>
                </Pressable>
              ) : null}
            </View>
          )
        })}

        {message ? (
          <Text
            accessibilityRole={message.error ? 'alert' : undefined}
            accessibilityLiveRegion="polite"
            className="font-hanken-medium text-[15px] leading-[22px] text-center mt-2"
            style={{ color: message.error ? '#DD7C54' : '#388E3C' }}
          >
            {message.text}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={onSignOut}
          className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl mt-6 active:opacity-70"
          style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
        >
          <MaterialIcons name="logout" size={21} color="#11375C" />
          <Text className="font-hanken-bold text-base text-navy">Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
