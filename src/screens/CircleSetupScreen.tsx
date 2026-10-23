import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

import { FloatingNav } from '@/components/FloatingNav'
import { Logo } from '@/components/Logo'

/**
 * What Cuidados shows before the routine/health/family content is available:
 * - `create`: the user has no circle yet. An elder account creates its own circle (it is the
 *   assisted person); a family account names the assisted person. Both record a consent declaration.
 * - `pending`: joined by invite, waiting for a manager's approval.
 * - `partner`: partner accounts never take part in care circles.
 * - `loading`: resolving whether the user has a circle.
 */
export type CircleSetupMode = 'loading' | 'create' | 'pending' | 'partner'

const CONSENT_TEXT = {
  elder:
    'Autorizo o registro dos meus dados de rotina e de saúde no Elder+ e o compartilhamento com as pessoas que eu convidar, conforme as permissões que eu definir.',
  family:
    'Declaro que sou responsável pela pessoa assistida ou tenho autorização dela para registrar seus dados de rotina e de saúde no Elder+ e compartilhá-los com as pessoas que eu convidar.',
}

function Feature({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-3 mb-3">
      <View className="w-10 h-10 rounded-2xl items-center justify-center bg-navy/10">
        <MaterialIcons name={icon} size={19} color="#11375C" />
      </View>
      <Text className="font-hanken text-ink text-[13.5px] leading-5 flex-1">{text}</Text>
    </View>
  )
}

function CreateForm({
  isElder,
  onCreate,
}: {
  isElder: boolean
  /** Rejects with a user-facing PT message on failure. */
  onCreate: (subjectName?: string) => Promise<void>
}) {
  const [subjectName, setSubjectName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const nameError =
    isElder || subjectName.trim().length >= 2 ? undefined : 'Digite o nome da pessoa assistida, com pelo menos 2 letras.'
  const consentError = accepted ? undefined : 'Para criar o círculo, confirme a declaração acima.'

  async function handleCreate() {
    if (submitting) return
    setAttempted(true)
    if (nameError || consentError) return
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onCreate(isElder ? undefined : subjectName.trim())
      // Success: the circle state changes and the parent swaps this screen for Cuidados.
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Não foi possível criar o círculo. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <View>
      <Text className="font-hanken-extrabold text-navy text-[23px] leading-7 mb-2">
        {isElder ? 'Crie seu círculo de cuidado' : 'Crie o círculo de cuidado'}
      </Text>
      <Text className="font-hanken text-muted text-sm leading-5 mb-6">
        {isElder
          ? 'Reúna familiares e profissionais de confiança para acompanhar sua rotina e sua saúde com você.'
          : 'O círculo reúne quem cuida da pessoa assistida: a rotina, a saúde e a família ficam num só lugar.'}
      </Text>

      <Feature icon="event-note" text="Rotina e tarefas compartilhadas, com responsável por cada uma." />
      <Feature icon="favorite-border" text="Medicamentos, doses e lembretes de saúde." />
      <Feature icon="lock-outline" text="Cada pessoa vê e edita só o que você permitir." />

      {!isElder ? (
        <>
          <Text className="font-hanken-medium text-navy text-xs mb-2 mt-4">Nome da pessoa assistida</Text>
          <TextInput
            value={subjectName}
            onChangeText={setSubjectName}
            placeholder="Ex: Dona Maria Silva"
            placeholderTextColor="#6B7A85"
            autoCapitalize="words"
            accessibilityLabel="Nome da pessoa assistida"
            accessibilityHint={attempted ? nameError : undefined}
            className={`min-h-[52px] rounded-2xl border-[1.6px] ${
              attempted && nameError ? 'border-terracotta' : 'border-hairline'
            } bg-white px-4 font-hanken-medium text-[15px] text-ink`}
          />
          {attempted && nameError ? (
            <Text className="font-hanken-medium text-terracotta text-xs mt-2">{nameError}</Text>
          ) : null}
          <Text className="font-hanken text-muted text-xs leading-4 mt-2">
            Ela não precisa ter conta no Elder+. Se tiver, você poderá vinculá-la depois.
          </Text>
        </>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={isElder ? CONSENT_TEXT.elder : CONSENT_TEXT.family}
        onPress={() => setAccepted((prev) => !prev)}
        className="flex-row items-start gap-2.5 mt-6 px-1 active:opacity-70"
      >
        <View
          className={`w-[22px] h-[22px] rounded-[7px] items-center justify-center border-[1.6px] mt-px ${
            accepted ? 'bg-navy border-navy' : attempted && consentError ? 'bg-white border-terracotta' : 'bg-white border-hairline'
          }`}
        >
          {accepted ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 font-hanken text-muted text-[12.5px] leading-[18px]">
          {isElder ? CONSENT_TEXT.elder : CONSENT_TEXT.family}
        </Text>
      </Pressable>
      {attempted && consentError ? (
        <Text className="font-hanken-medium text-terracotta text-xs mt-2 px-1">{consentError}</Text>
      ) : null}

      {submitError ? (
        <Text className="font-hanken-medium text-terracotta text-[13px] text-center mt-5">{submitError}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar círculo"
        disabled={submitting}
        onPress={handleCreate}
        className="min-h-[52px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-5 active:opacity-90"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <MaterialIcons name="group-add" size={19} color="#FFFFFF" />
        )}
        <Text className="font-hanken-bold text-base text-white">Criar círculo</Text>
      </Pressable>

      <Text className="font-hanken text-muted text-xs leading-4 text-center mt-4 px-2">
        Recebeu um convite de outra pessoa? A entrada por código chega na próxima versão do app.
      </Text>
    </View>
  )
}

function Message({ icon, title, text }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; text: string }) {
  return (
    <View className="items-center pt-10">
      <View className="w-16 h-16 rounded-3xl items-center justify-center bg-navy/10 mb-5">
        <MaterialIcons name={icon} size={30} color="#11375C" />
      </View>
      <Text className="font-hanken-extrabold text-navy text-xl text-center mb-2">{title}</Text>
      <Text className="font-hanken text-muted text-sm leading-5 text-center px-4">{text}</Text>
    </View>
  )
}

export function CircleSetupScreen({
  mode,
  isElder = false,
  circleName,
  onCreate,
  onNavigate,
  topInset = 0,
  bottomInset = 0,
}: {
  mode: CircleSetupMode
  /** Account role `elder`: creates its own circle as the assisted person. */
  isElder?: boolean
  /** Assisted person's name, shown while pending. */
  circleName?: string
  onCreate: (subjectName?: string) => Promise<void>
  onNavigate: (key: string) => void
  topInset?: number
  bottomInset?: number
}) {
  return (
    <View className="flex-1 bg-offwhite">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: topInset + 16, paddingHorizontal: 24, paddingBottom: bottomInset + 110 }}
        >
          <Logo size="sm" style={{ width: 80, height: 24, marginBottom: 28 }} />

          {mode === 'loading' ? (
            <View className="items-center pt-16">
              <ActivityIndicator color="#11375C" />
            </View>
          ) : mode === 'create' ? (
            <CreateForm isElder={isElder} onCreate={onCreate} />
          ) : mode === 'pending' ? (
            <Message
              icon="hourglass-top"
              title="Aguardando aprovação"
              text={`Você aceitou o convite${circleName ? ` para o círculo de ${circleName}` : ''}. Assim que um administrador aprovar sua entrada, a rotina e a saúde aparecem aqui.`}
            />
          ) : (
            <Message
              icon="storefront"
              title="Disponível para famílias"
              text="Os círculos de cuidado são para pessoas assistidas, familiares e profissionais de saúde. Contas de comércio e parceiros não participam deles."
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <FloatingNav active="care" onPress={onNavigate} bottomInset={bottomInset} />
    </View>
  )
}
