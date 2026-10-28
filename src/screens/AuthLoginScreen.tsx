import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

export function AuthLoginScreen({
  topInset = 0,
  onSubmit,
  onGoogle,
  onBack,
  onForgotPassword,
  submitting = false,
  errorMessage,
  notice,
  disabled = false,
}: {
  topInset?: number;
  onSubmit: (input: { email: string; password: string }) => void | Promise<void>;
  onGoogle: () => void | Promise<void>;
  onBack: () => void;
  /** Receives the e-mail typed so far, to prefill the reset screen. */
  onForgotPassword: (email: string) => void;
  submitting?: boolean;
  errorMessage?: string;
  /** Informational banner, e.g. the session ended because the password changed. */
  notice?: string;
  // Externally-forced disabled state (e.g. temporary login lockout). Keeps the screen pure: the
  // wrapper decides WHEN to block; the screen just reflects it in the submit button.
  disabled?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextInput>(null);
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !submitting && !disabled,
    [email, password, submitting, disabled]
  );

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ email: email.trim(), password });
  }

  return (
    <View className="flex-1 bg-offwhite w-full h-full">
      <View className="px-6" style={{ paddingTop: topInset + 16 }}>
        <View className="flex-row items-center justify-between mb-7">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            className="w-[42px] h-[42px] rounded-full items-center justify-center bg-white border border-hairline active:opacity-70"
          >
            <MaterialIcons name="arrow-back" size={20} color="#11375C" />
          </Pressable>
        </View>

        {notice ? (
          <View
            accessible
            accessibilityRole="alert"
            className="flex-row items-start gap-3 rounded-2xl p-4 mb-5"
            style={{ backgroundColor: 'rgba(17,55,92,0.07)' }}
          >
            <MaterialIcons name="lock-reset" size={22} color="#11375C" />
            <Text className="flex-1 font-hanken text-ink text-[15px] leading-[22px]">{notice}</Text>
          </View>
        ) : null}

        <Text className="font-hanken-extrabold text-navy text-2xl leading-8 mb-2.5">Bem-vindo de volta</Text>
        <Text className="font-hanken text-muted text-sm leading-5 mb-7 max-w-[280px]">
          Entre com o e-mail e a senha da sua conta Elder.
        </Text>

        <Text className="font-hanken-medium text-navy text-xs mb-2">Seu e-mail</Text>
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
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />

        <Text className="font-hanken-medium text-navy text-xs mb-2 mt-5">Sua senha</Text>
        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          placeholderTextColor="#6B7A85"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Esqueci minha senha"
          onPress={() => onForgotPassword(email.trim())}
          className="min-h-[48px] self-end justify-center px-1 mt-1 active:opacity-60"
        >
          <Text className="font-hanken-bold text-terracotta text-[15px]">Esqueci minha senha</Text>
        </Pressable>
      </View>

      <View className="px-6 pb-7 mt-auto">
        {errorMessage ? (
          <Text className="font-hanken-medium text-terracotta text-[13px] text-center mb-3">{errorMessage}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Entrar"
          disabled={!canSubmit}
          onPress={handleSubmit}
          className={`min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 ${
            canSubmit ? "bg-navy active:opacity-90" : "bg-hairline"
          }`}
        >
          <Text className={`font-hanken-bold text-base ${canSubmit ? "text-white" : "text-terracotta"}`}>Entrar</Text>
          {submitting ? (
            <ActivityIndicator size="small" color={canSubmit ? "#FFFFFF" : "#6B7A85"} />
          ) : (
            <MaterialIcons name="arrow-forward" size={19} color={canSubmit ? "#FFFFFF" : "#6B7A85"} />
          )}
        </Pressable>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-hairline" />
          <Text className="font-hanken text-muted text-xs mx-3">ou</Text>
          <View className="flex-1 h-px bg-hairline" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar com Google"
          disabled={submitting}
          onPress={onGoogle}
          className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 border border-hairline bg-white active:opacity-70"
        >
          <MaterialIcons name="account-circle" size={20} color="#11375C" />
          <Text className="font-hanken-bold text-navy text-base">Continuar com Google</Text>
        </Pressable>
      </View>
    </View>
  );
}
