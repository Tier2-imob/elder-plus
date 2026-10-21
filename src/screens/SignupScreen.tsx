import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";

import type { AccountRole } from "@/components/types";
import { ROLE_CONTEXT } from "@/constants/constants";

export function SignupScreen({
  role,
  onBack,
  onContinue,
  onGoogle,
  asset,
  topInset = 0,
  submitting = false,
  errorMessage,
}: {
  role: AccountRole;
  onBack: () => void;
  onContinue: (input: { name: string; email: string; password: string; acceptedTerms: boolean }) => void;
  onGoogle: () => void | Promise<void>;
  asset?: number;
  topInset?: number;
  submitting?: boolean;
  errorMessage?: string;
}) {
  const context = ROLE_CONTEXT[role];
  const isNavy = context.tone === "navy";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const canContinue = useMemo(
    () =>
      name.trim().length > 1 &&
      /\S+@\S+\.\S+/.test(email) &&
      password.length >= 6 &&
      accepted &&
      !submitting,
    [name, email, password, accepted, submitting]
  );

  function handleContinue() {
    if (!canContinue || !accepted) return;
    onContinue({ name: name.trim(), email: email.trim(), password, acceptedTerms: true });
  }

  return (
    <View className="flex-1 bg-offwhite w-full h-full">
      {asset ? (
        <Image source={asset} className="absolute inset-0 w-full h-full" resizeMode="cover"/>
      ) : null}
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

          <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${isNavy ? "bg-navy/10" : "bg-terracotta/10"}`}>
            <View className="w-[7px] h-[7px] rounded-full bg-terracotta" />
            <Text className={`font-hanken-medium text-[12px] ${isNavy ? "text-navy" : "text-[#9F4E2E]"}`}>
              {context.label}
            </Text>
          </View>
        </View>

        <Text className="font-hanken-extrabold text-navy text-2xl leading-8 mb-2.5">Como podemos te chamar?</Text>
        <Text className="font-hanken text-muted text-sm leading-5 mb-7 max-w-[280px]">
          Usamos seu nome para personalizar sua experiência. O resto do perfil você completa quando quiser.
        </Text>

        <Text className="font-hanken-medium text-navy text-xs mb-2">Seu nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Fernanda Ramos"
          placeholderTextColor="#6B7A85"
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />
        <Text className="font-hanken text-muted text-xs mt-2">{context.nameHint}</Text>

        <Text className="font-hanken-medium text-navy text-xs mb-2 mt-5">Seu e-mail</Text>
        <TextInput
          ref={emailRef}
          value={email}
          onChangeText={setEmail}
          placeholder="Ex: fernanda@email.com"
          placeholderTextColor="#6B7A85"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />

        <Text className="font-hanken-medium text-navy text-xs mb-2 mt-5">Sua senha</Text>
        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          placeholder="Pelo menos 6 caracteres"
          placeholderTextColor="#6B7A85"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          className="min-h-[56px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 font-hanken-medium text-[15.5px] text-ink"
        />
      </View>

      <View className="px-6 pb-7 mt-auto">
        {errorMessage ? (
          <Text className="font-hanken-medium text-terracotta text-[13px] text-center mb-3">{errorMessage}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar"
          disabled={!canContinue}
          onPress={handleContinue}
          className={`min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2.5 ${
            canContinue ? "bg-navy active:opacity-90" : "bg-hairline"
          }`}
        >
          <Text className={`font-hanken-bold text-base ${canContinue ? "text-white" : "text-terracotta"}`}>Continuar</Text>
          {submitting ? (
            <ActivityIndicator size="small" color={canContinue ? "#FFFFFF" : "#6B7A85"} />
          ) : (
            <MaterialIcons name="arrow-forward" size={19} color={canContinue ? "#FFFFFF" : "#6B7A85"} />
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

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="Aceito os Termos de Uso e a Política de Privacidade do Elder+"
          onPress={() => setAccepted((prev) => !prev)}
          className="flex-row items-start gap-2.5 mt-4 px-1 active:opacity-70"
        >
          <View
            className={`w-[22px] h-[22px] rounded-[7px] items-center justify-center border-[1.6px] mt-px ${
              accepted ? "bg-navy border-navy" : "bg-white border-hairline"
            }`}
          >
            {accepted ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}
          </View>
          <Text className="flex-1 font-hanken text-muted text-[12px] leading-[17px]">
            Li e aceito os <Text className="font-hanken-bold text-navy">Termos de Uso</Text> e a{" "}
            <Text className="font-hanken-bold text-navy">Política de Privacidade</Text> do Elder+.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
