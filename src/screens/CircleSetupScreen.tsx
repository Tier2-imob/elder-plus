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

import { ConnectionErrorCard } from '@/components/ConnectionErrorCard'
import { FloatingNav } from '@/components/FloatingNav'
import { CircleSwitcher } from '@/components/care/CircleSwitcher'
import { Logo } from '@/components/Logo'

/**
 * What Cuidados shows before the routine/health/family content is available:
 * - `create`: the user has no circle yet. An elder account creates its own circle (it is the
 *   assisted person); a family account names the assisted person. Both record a consent declaration.
 * - `pending`: joined by invite, waiting for a manager's approval.
 * - `partner`: partner accounts never take part in care circles.
 * - `loading`: resolving whether the user has a circle.
 * - `error`: the circles could not be loaded (no connection): message and "Tentar de novo".
 */
export type CircleSetupMode = 'loading' | 'create' | 'pending' | 'partner' | 'error'

/** What the acceptance step shows about an invite. */
export type InvitePreview = {
  code: string
  circleName: string
  invitedByName: string
  roleLabel: string
  /** Labels of what the person will see / edit. */
  canSee: string[]
  canEdit: string[]
  canManage: boolean
  expiresLabel: string
  /** Invite to link the assisted person's own account (they become the circle's titular). */
  isTitular: boolean
}

const JOIN_CONSENT = (circleName: string) =>
  `Concordo em acessar os dados de rotina e de saúde de ${circleName} apenas para ajudar no cuidado, ` +
  'conforme as permissões concedidas, e entendo que meu acesso pode ser revogado a qualquer momento.'

// The titular is the data subject (LGPD art. 11): they authorize the use of their own data.
const TITULAR_CONSENT = (circleName: string) =>
  `Confirmo que sou ${circleName}, a pessoa assistida deste círculo, e autorizo que meus dados de rotina e ` +
  'de saúde sejam registrados no Elder+ e compartilhados com as pessoas do círculo, conforme as permissões definidas.'

const CONSENT_TEXT = {
  elder:
    'Autorizo o registro dos meus dados de rotina e de saúde no Elder+ e o compartilhamento com as pessoas que eu convidar, conforme as permissões que eu definir.',
  family:
    'Declaro que sou responsável pela pessoa assistida ou tenho autorização dela para registrar seus dados de rotina e de saúde no Elder+ e compartilhá-los com as pessoas que eu convidar.',
}

function Feature({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    // items-start: with a large system font the text wraps to several lines and the icon stays on top.
    <View className="flex-row items-start gap-3.5 mb-4">
      <View className="w-12 h-12 rounded-2xl items-center justify-center bg-navy/10">
        <MaterialIcons name={icon} size={23} color="#11375C" />
      </View>
      <Text className="font-hanken text-ink text-base leading-6 flex-1 pt-3">{text}</Text>
    </View>
  )
}

function ConsentCheckbox({
  text,
  checked,
  invalid,
  onToggle,
}: {
  text: string
  checked: boolean
  invalid: boolean
  onToggle: () => void
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={text}
      onPress={onToggle}
      className="min-h-[56px] flex-row items-start gap-3 mt-6 px-1 py-2 active:opacity-70"
    >
      <View
        className={`w-7 h-7 rounded-lg items-center justify-center border-2 ${
          checked ? 'bg-navy border-navy' : invalid ? 'bg-white border-terracotta' : 'bg-white border-hairline'
        }`}
      >
        {checked ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
      </View>
      <Text className="flex-1 font-hanken text-ink text-[15px] leading-[22px]">{text}</Text>
    </Pressable>
  )
}

function PrimaryButton({
  label,
  icon,
  busy,
  onPress,
}: {
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
  busy: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 bg-navy mt-5 px-4 active:opacity-90"
    >
      {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name={icon} size={23} color="#FFFFFF" />}
      <Text className="font-hanken-bold text-lg text-white">{label}</Text>
    </Pressable>
  )
}

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-5"
    >
      {message}
    </Text>
  ) : null
}

function SecondaryLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[56px] items-center justify-center mt-3 rounded-2xl active:opacity-70"
      style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
    >
      <Text className="font-hanken-bold text-base text-navy">{label}</Text>
    </Pressable>
  )
}

/** "Tenho um convite": type the code, review what the invite grants, consent and join. */
function JoinForm({
  onLookup,
  onAccept,
  onBack,
}: {
  onLookup: (code: string) => Promise<InvitePreview>
  onAccept: (code: string) => Promise<void>
  onBack: () => void
}) {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  async function lookup() {
    if (busy) return
    if (!code.trim()) {
      setError('Digite o código que você recebeu.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      setPreview(await onLookup(code))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível encontrar o convite.')
    } finally {
      setBusy(false)
    }
  }

  async function accept() {
    if (busy || !preview) return
    setAttempted(true)
    if (!accepted) return
    setBusy(true)
    setError(undefined)
    try {
      await onAccept(preview.code)
      // Success: the user becomes a pending member and the parent shows "Aguardando aprovação".
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar no círculo.')
      setBusy(false)
    }
  }

  if (!preview) {
    return (
      <View>
        <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-3">
          Entrar com convite
        </Text>
        <Text className="font-hanken text-muted text-[17px] leading-6 mb-6">
          Digite o código que a pessoa que cuida do círculo enviou para você.
        </Text>
        <Text className="font-hanken-medium text-navy text-[15px] mb-2">Código do convite</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="ELDER-XXXX-XXXX"
          placeholderTextColor="#6B7A85"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={lookup}
          accessibilityLabel="Código do convite"
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-bold text-[19px] tracking-widest text-ink"
        />
        <ErrorText message={error} />
        <PrimaryButton label="Continuar" icon="arrow-forward" busy={busy} onPress={lookup} />
        <SecondaryLink label="Voltar" onPress={onBack} />
      </View>
    )
  }

  const consent = preview.isTitular ? TITULAR_CONSENT(preview.circleName) : JOIN_CONSENT(preview.circleName)
  return (
    <View>
      <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-3">
        Círculo de {preview.circleName}
      </Text>
      <Text className="font-hanken text-muted text-[17px] leading-6 mb-5">
        {preview.isTitular
          ? `${preview.invitedByName} convidou você para vincular sua conta como a pessoa assistida deste círculo. ` +
            'Você terá acesso a tudo e poderá convidar e aprovar pessoas.'
          : `${preview.invitedByName} convidou você como ${preview.roleLabel}.`}
      </Text>

      <View className="rounded-3xl border border-hairline bg-white p-5">
        <Text className="font-hanken-bold text-navy text-base mb-2">Você vai poder</Text>
        {[
          ...preview.canSee.map((label) => ({ icon: 'visibility' as const, text: `Ver ${label}` })),
          ...preview.canEdit.map((label) => ({ icon: 'edit' as const, text: `Editar ${label}` })),
          ...(preview.canManage ? [{ icon: 'group' as const, text: 'Convidar e aprovar pessoas' }] : []),
        ].map((item) => (
          <View key={item.text} className="flex-row items-center gap-3 py-1.5">
            <MaterialIcons name={item.icon} size={20} color="#11375C" />
            <Text className="font-hanken text-ink text-base">{item.text}</Text>
          </View>
        ))}
        <Text className="font-hanken text-muted text-sm mt-3">Convite válido até {preview.expiresLabel}.</Text>
      </View>

      <ConsentCheckbox
        text={consent}
        checked={accepted}
        invalid={attempted && !accepted}
        onToggle={() => setAccepted((prev) => !prev)}
      />
      {attempted && !accepted ? (
        <Text accessibilityLiveRegion="polite" className="font-hanken-medium text-terracotta text-sm leading-5 mt-1 px-1">
          Para entrar, confirme a declaração acima.
        </Text>
      ) : null}

      <ErrorText message={error} />
      <PrimaryButton label="Entrar no círculo" icon="group-add" busy={busy} onPress={accept} />
      <Text className="font-hanken text-muted text-sm leading-5 text-center mt-4 px-2">
        Depois de entrar, um administrador do círculo precisa aprovar seu acesso.
      </Text>
      <SecondaryLink
        label="Usar outro código"
        onPress={() => {
          setPreview(null)
          setAccepted(false)
          setAttempted(false)
          setError(undefined)
        }}
      />
    </View>
  )
}

function CreateForm({
  canForSelf,
  canForOther,
  onCreate,
  onHaveInvite,
}: {
  /** Elder profile without a circle of their own: may be the assisted person. */
  canForSelf: boolean
  /** Family profile: may create a circle for someone they care for. */
  canForOther: boolean
  /** Rejects with a user-facing PT message on failure. */
  onCreate: (input: { forSelf: boolean; subjectName?: string }) => Promise<void>
  onHaveInvite: () => void
}) {
  // With both profiles the user picks; with one, it's decided.
  const [forSelf, setForSelf] = useState(canForSelf && !canForOther)
  const isElder = forSelf
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
      await onCreate({ forSelf, subjectName: forSelf ? undefined : subjectName.trim() })
      // Success: the circle state changes and the parent swaps this screen for Cuidados.
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Não foi possível criar o círculo. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <View>
      <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-3">
        {isElder ? 'Crie seu círculo de cuidado' : 'Crie o círculo de cuidado'}
      </Text>
      <Text className="font-hanken text-muted text-[17px] leading-6 mb-7">
        {isElder
          ? 'Reúna familiares e profissionais de confiança para acompanhar sua rotina e sua saúde com você.'
          : 'O círculo reúne quem cuida da pessoa assistida: a rotina, a saúde e a família ficam num só lugar.'}
      </Text>

      {canForSelf && canForOther ? (
        <View className="mb-6">
          <Text className="font-hanken-medium text-navy text-[15px] mb-2">Este círculo é</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { value: true, label: 'Para mim' },
              { value: false, label: 'Para alguém que eu cuido' },
            ].map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: forSelf === option.value }}
                accessibilityLabel={option.label}
                onPress={() => setForSelf(option.value)}
                className="min-h-[48px] px-4 rounded-full items-center justify-center active:opacity-70"
                style={{
                  backgroundColor: forSelf === option.value ? '#11375C' : 'rgba(17,55,92,0.06)',
                  borderWidth: 1.4,
                  borderColor: forSelf === option.value ? '#11375C' : '#E4DCD3',
                }}
              >
                <Text
                  className="font-hanken-bold text-[15px]"
                  style={{ color: forSelf === option.value ? '#FFFFFF' : '#11375C' }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Feature icon="event-note" text="Rotina e tarefas compartilhadas, com responsável por cada uma." />
      <Feature icon="favorite-border" text="Medicamentos, doses e lembretes de saúde." />
      <Feature icon="lock-outline" text="Cada pessoa vê e edita só o que você permitir." />

      {!isElder ? (
        <>
          <Text className="font-hanken-medium text-navy text-[15px] mb-2 mt-4">Nome da pessoa assistida</Text>
          <TextInput
            value={subjectName}
            onChangeText={setSubjectName}
            placeholder="Ex: Dona Maria Silva"
            placeholderTextColor="#6B7A85"
            autoCapitalize="words"
            accessibilityLabel="Nome da pessoa assistida"
            accessibilityHint={attempted ? nameError : undefined}
            className={`min-h-[56px] rounded-2xl border-[1.6px] ${
              attempted && nameError ? 'border-terracotta' : 'border-hairline'
            } bg-white px-4 font-hanken-medium text-[17px] text-ink`}
          />
          {attempted && nameError ? (
            <Text accessibilityLiveRegion="polite" className="font-hanken-medium text-terracotta text-sm leading-5 mt-2">
              {nameError}
            </Text>
          ) : null}
          <Text className="font-hanken text-muted text-sm leading-5 mt-2">
            Ela não precisa ter conta no Elder+. Se tiver, você poderá vinculá-la depois.
          </Text>
        </>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={isElder ? CONSENT_TEXT.elder : CONSENT_TEXT.family}
        onPress={() => setAccepted((prev) => !prev)}
        className="min-h-[56px] flex-row items-start gap-3 mt-6 px-1 py-2 active:opacity-70"
      >
        <View
          className={`w-7 h-7 rounded-lg items-center justify-center border-2 ${
            accepted ? 'bg-navy border-navy' : attempted && consentError ? 'bg-white border-terracotta' : 'bg-white border-hairline'
          }`}
        >
          {accepted ? <MaterialIcons name="check" size={20} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 font-hanken text-ink text-[15px] leading-[22px]">
          {isElder ? CONSENT_TEXT.elder : CONSENT_TEXT.family}
        </Text>
      </Pressable>
      {attempted && consentError ? (
        <Text accessibilityLiveRegion="polite" className="font-hanken-medium text-terracotta text-sm leading-5 mt-1 px-1">
          {consentError}
        </Text>
      ) : null}

      {submitError ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-5"
        >
          {submitError}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar círculo"
        accessibilityState={{ busy: submitting, disabled: submitting }}
        disabled={submitting}
        onPress={handleCreate}
        className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 bg-navy mt-5 px-4 active:opacity-90"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <MaterialIcons name="group-add" size={23} color="#FFFFFF" />
        )}
        <Text className="font-hanken-bold text-lg text-white">Criar círculo</Text>
      </Pressable>

      <Text className="font-hanken text-muted text-[15px] leading-[22px] text-center mt-6 px-2">
        Alguém já cuida de um círculo e convidou você?
      </Text>
      <SecondaryLink label="Tenho um convite" onPress={onHaveInvite} />
    </View>
  )
}

function Message({
  icon,
  title,
  text,
  children,
}: {
  icon: keyof typeof MaterialIcons.glyphMap
  title: string
  text: string
  children?: React.ReactNode
}) {
  return (
    <View className="items-center pt-10">
      <View className="w-20 h-20 rounded-3xl items-center justify-center bg-navy/10 mb-6">
        <MaterialIcons name={icon} size={36} color="#11375C" />
      </View>
      <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[26px] leading-8 text-center mb-3">
        {title}
      </Text>
      <Text className="font-hanken text-muted text-[17px] leading-6 text-center px-2">{text}</Text>
      {children ? <View className="self-stretch mt-6">{children}</View> : null}
    </View>
  )
}

export function CircleSetupScreen({
  mode,
  canCreateForSelf = false,
  canCreateForOther = false,
  circleName,
  onCreate,
  onLookupInvite,
  onAcceptInvite,
  onCancelPending,
  onCancelAdding,
  onRetry,
  circleSwitcher,
  onNavigate,
  topInset = 0,
  bottomInset = 0,
}: {
  mode: CircleSetupMode
  /** Elder profile without a circle of their own: may create one as the assisted person. */
  canCreateForSelf?: boolean
  /** Family profile: may create a circle for someone they care for. */
  canCreateForOther?: boolean
  /** Assisted person's name, shown while pending. */
  circleName?: string
  onCreate: (input: { forSelf: boolean; subjectName?: string }) => Promise<void>
  /** Circle selector (users in more than one circle); absent while adding one. */
  circleSwitcher?: {
    circles: { id: string; name: string; inactive?: boolean }[]
    activeCircleId: string | null
    onSelect: (circleId: string) => void
    onAdd?: () => void
  }
  /** `error` mode: tries to load the circles again. */
  onRetry?: () => void
  /** Shown while adding another circle: goes back to the current one. */
  onCancelAdding?: () => void
  /** Reject with user-facing PT messages. */
  onLookupInvite: (code: string) => Promise<InvitePreview>
  onAcceptInvite: (code: string) => Promise<void>
  /** Withdraw a pending request (absent when it can't be withdrawn). */
  onCancelPending?: () => Promise<void>
  onNavigate: (key: string) => void
  topInset?: number
  bottomInset?: number
}) {
  const [joining, setJoining] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | undefined>(undefined)

  async function cancelPending() {
    if (!onCancelPending || cancelBusy) return
    setCancelBusy(true)
    setCancelError(undefined)
    try {
      await onCancelPending()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Não foi possível cancelar o pedido.')
      setCancelBusy(false)
    }
  }

  return (
    <View className="flex-1 bg-offwhite">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: topInset + 16, paddingHorizontal: 24, paddingBottom: bottomInset + 110 }}
        >
          <Logo size="sm" style={{ width: 80, height: 24, marginBottom: 28 }} />
          {circleSwitcher && mode === 'pending' ? <CircleSwitcher {...circleSwitcher} /> : null}

          {mode === 'error' && onRetry ? (
            <ConnectionErrorCard
              message="Não foi possível carregar os seus círculos de cuidado. Verifique sua conexão com a internet e tente de novo."
              onRetry={onRetry}
            />
          ) : mode === 'loading' ? (
            <View className="items-center pt-16" accessible accessibilityLabel="Carregando o círculo de cuidado">
              <ActivityIndicator size="large" color="#11375C" />
            </View>
          ) : mode === 'create' ? (
            <>
              {joining ? (
                <JoinForm onLookup={onLookupInvite} onAccept={onAcceptInvite} onBack={() => setJoining(false)} />
              ) : canCreateForSelf || canCreateForOther ? (
                <CreateForm
                  canForSelf={canCreateForSelf}
                  canForOther={canCreateForOther}
                  onCreate={onCreate}
                  onHaveInvite={() => setJoining(true)}
                />
              ) : (
                // Elder profile that already has its own circle: only joining by invite is left.
                <Message
                  icon="group-add"
                  title="Entrar em outro círculo"
                  text="Você já tem o seu círculo. Para cuidar de outra pessoa, adicione o perfil Família em Minha conta, ou entre com um convite."
                >
                  <SecondaryLink label="Tenho um convite" onPress={() => setJoining(true)} />
                </Message>
              )}
              {onCancelAdding ? <SecondaryLink label="Voltar para o meu círculo" onPress={onCancelAdding} /> : null}
            </>
          ) : mode === 'pending' ? (
            <Message
              icon="hourglass-top"
              title="Aguardando aprovação"
              text={`Você aceitou o convite${circleName ? ` para o círculo de ${circleName}` : ''}. Assim que um administrador aprovar sua entrada, a rotina e a saúde aparecem aqui.`}
            >
              {onCancelPending ? (
                <>
                  <ErrorText message={cancelError} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar meu pedido de entrada"
                    accessibilityState={{ busy: cancelBusy, disabled: cancelBusy }}
                    disabled={cancelBusy}
                    onPress={cancelPending}
                    className="min-h-[56px] items-center justify-center rounded-2xl mt-3 active:opacity-70"
                    style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
                  >
                    {cancelBusy ? (
                      <ActivityIndicator size="small" color="#C0392B" />
                    ) : (
                      <Text className="font-hanken-bold text-base" style={{ color: '#C0392B' }}>
                        Cancelar pedido
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : null}
            </Message>
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
