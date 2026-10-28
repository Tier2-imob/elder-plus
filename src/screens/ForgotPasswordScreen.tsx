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

/**
 * "Esqueci minha senha": ask for the e-mail, then confirm the link was sent. The confirmation is
 * the same whether or not the e-mail has an account (no account enumeration). Resending is only
 * offered after `cooldownSeconds` reaches 0.
 */
export function ForgotPasswordScreen({
  topInset = 0,
  initialEmail = '',
  sentTo,
  submitting = false,
  errorMessage,
  cooldownSeconds = 0,
  onSend,
  onBack,
}: {
  topInset?: number
  initialEmail?: string
  /** E-mail the link was last sent to; set = show the confirmation. */
  sentTo?: string
  submitting?: boolean
  errorMessage?: string
  cooldownSeconds?: number
  onSend: (email: string) => void
  onBack: () => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [attempted, setAttempted] = useState(false)

  const trimmed = email.trim()
  const emailError = !trimmed
    ? 'Digite seu e-mail.'
    : /\S+@\S+\.\S+/.test(trimmed)
      ? undefined
      : 'Esse e-mail não parece válido. Ex: nome@email.com'
  const canResend = cooldownSeconds <= 0 && !submitting

  function send() {
    if (submitting) return
    setAttempted(true)
    if (emailError) return
    onSend(trimmed)
  }

  return (
    <View className="flex-1 bg-offwhite">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: topInset + 16, paddingHorizontal: 24, paddingBottom: 32 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            className="w-14 h-14 rounded-full items-center justify-center bg-white border border-hairline mb-7 active:opacity-70"
          >
            <MaterialIcons name="arrow-back" size={22} color="#11375C" />
          </Pressable>

          {sentTo ? (
            <View>
              <View className="w-16 h-16 rounded-3xl items-center justify-center bg-navy/10 mb-5">
                <MaterialIcons name="mark-email-read" size={30} color="#11375C" />
              </View>
              <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-3">
                Confira seu e-mail
              </Text>
              <Text className="font-hanken text-ink text-[17px] leading-6 mb-5">
                Se houver uma conta Elder+ com <Text className="font-hanken-bold">{sentTo}</Text>, enviamos um link para
                criar uma nova senha. Ele costuma chegar em instantes.
              </Text>

              <View className="rounded-3xl border border-hairline bg-white p-5 gap-3">
                {[
                  { icon: 'schedule' as const, text: 'O link vale por 1 hora e só pode ser usado uma vez.' },
                  { icon: 'report-gmailerrorred' as const, text: 'Não encontrou? Olhe também a caixa de spam ou lixo eletrônico.' },
                  { icon: 'devices' as const, text: 'Ao criar a nova senha, o Elder+ sai da sua conta em todos os aparelhos.' },
                ].map((item) => (
                  <View key={item.text} className="flex-row items-start gap-3">
                    <MaterialIcons name={item.icon} size={21} color="#11375C" style={{ marginTop: 1 }} />
                    <Text className="flex-1 font-hanken text-ink text-base leading-6">{item.text}</Text>
                  </View>
                ))}
              </View>

              {errorMessage ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-5"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={canResend ? 'Reenviar o link' : `Reenviar o link em ${cooldownSeconds} segundos`}
                accessibilityState={{ disabled: !canResend, busy: submitting }}
                disabled={!canResend}
                onPress={() => onSend(sentTo)}
                className={`min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 mt-6 ${
                  canResend ? 'bg-navy active:opacity-90' : 'bg-hairline'
                }`}
              >
                {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text className={`font-hanken-bold text-base ${canResend ? 'text-white' : 'text-muted'}`}>
                  {canResend ? 'Reenviar o link' : `Reenviar em ${cooldownSeconds}s`}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar para entrar"
                onPress={onBack}
                className="min-h-[56px] items-center justify-center rounded-2xl mt-3 active:opacity-70"
                style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
              >
                <Text className="font-hanken-bold text-base text-navy">Voltar para entrar</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-[28px] leading-[34px] mb-3">
                Esqueceu sua senha?
              </Text>
              <Text className="font-hanken text-muted text-[17px] leading-6 mb-7">
                Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
              </Text>

              <Text className="font-hanken-medium text-navy text-[15px] mb-2">Seu e-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Ex: fernanda@email.com"
                placeholderTextColor="#6B7A85"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                autoFocus={!initialEmail}
                returnKeyType="send"
                onSubmitEditing={send}
                accessibilityLabel="Seu e-mail"
                accessibilityHint={attempted ? emailError : undefined}
                className={`min-h-[56px] rounded-2xl border-[1.6px] ${
                  attempted && emailError ? 'border-terracotta' : 'border-hairline'
                } bg-white px-4 font-hanken-medium text-[17px] text-ink`}
              />
              {attempted && emailError ? (
                <Text accessibilityLiveRegion="polite" className="font-hanken-medium text-terracotta text-sm leading-5 mt-2">
                  {emailError}
                </Text>
              ) : null}

              {errorMessage ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-5"
                >
                  {errorMessage}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar link de redefinição"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                disabled={submitting}
                onPress={send}
                className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 bg-navy mt-6 active:opacity-90"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="send" size={21} color="#FFFFFF" />
                )}
                <Text className="font-hanken-bold text-lg text-white">Enviar link</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
