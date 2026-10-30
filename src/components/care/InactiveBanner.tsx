import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

/**
 * Shown on every tab of an inactive circle: its data is kept but read-only. A manager gets the
 * "Reativar" action; everyone else just sees why nothing can be edited.
 */
export function InactiveBanner({
  personName,
  sinceLabel,
  onReactivate,
}: {
  personName: string
  /** "28/10" — when it was inactivated. */
  sinceLabel?: string
  /** Manager only; rejects with a user-facing PT message. */
  onReactivate?: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  async function reactivate() {
    if (!onReactivate || busy) return
    setBusy(true)
    setError(undefined)
    try {
      await onReactivate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível reativar o círculo.')
      setBusy(false)
    }
  }

  return (
    <View
      accessible
      accessibilityLabel={`Círculo de ${personName} inativo. Os dados estão guardados e só podem ser lidos.`}
      className="rounded-3xl p-5 mb-5"
      style={{ backgroundColor: 'rgba(221,124,84,0.12)', borderWidth: 1.4, borderColor: '#DD7C54' }}
    >
      <View className="flex-row items-center gap-3 mb-2">
        <MaterialIcons name="pause-circle-outline" size={26} color="#9F4E2E" />
        <Text accessibilityRole="header" className="flex-1 font-hanken-extrabold text-[#9F4E2E] text-lg">
          Círculo inativo{sinceLabel ? ` desde ${sinceLabel}` : ''}
        </Text>
      </View>
      <Text className="font-hanken text-ink text-[15px] leading-[22px]">
        Os dados de {personName} estão guardados, mas o círculo está somente para leitura.
        {onReactivate ? ' Reative para voltar a editar.' : ' Quem gerencia o círculo pode reativá-lo.'}
      </Text>
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          className="font-hanken-medium text-terracotta text-[15px] leading-[22px] mt-3"
        >
          {error}
        </Text>
      ) : null}
      {onReactivate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reativar o círculo"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={reactivate}
          className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl mt-4 bg-navy active:opacity-90"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name="play-circle-outline" size={22} color="#FFFFFF" />
          )}
          <Text className="font-hanken-bold text-base text-white">Reativar círculo</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
