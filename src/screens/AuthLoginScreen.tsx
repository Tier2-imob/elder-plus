import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export function AuthLoginScreen({
  topInset = 0,
  onSubmit,
  onBack,
  submitting = false,
  errorMessage,
}: {
  topInset?: number;
  onSubmit: (input: { email: string; password: string }) => void | Promise<void>;
  onBack: () => void;
  submitting?: boolean;
  errorMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextInput>(null);
  // Deliberately NO regex / NO length>=6 — the server validates the credentials, so a legitimate
  // pre-existing account whose password predates any rule is never wrongly blocked.
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !submitting,
    [email, password, submitting]
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
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />
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
      </View>
    </View>
  );
}
