import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

import {
  formatBirthDate,
  formatPhone,
  maskBirthDate,
  maskInput,
  maskPhone,
  parseBirthDate,
  parsePhone,
} from '@/services/person-data'

/** What the fields show: the birth date as "dd/mm/aaaa" and the phone masked, both as typed. */
export type PersonFormValues = { name: string; birthDate: string; phone: string }

/** What gets saved: the stored birth date ("YYYY-MM-DD") and phone digits, or null when empty. */
export type PersonFormData = { name: string; birthDate: string | null; phone: string | null }

/** Stored person data → what the form shows (the edit form opens pre-filled with the current data). */
export function toFormValues(person: { name: string; birthDate: string | null; phone: string | null }): PersonFormValues {
  return {
    name: person.name,
    birthDate: person.birthDate ? formatBirthDate(person.birthDate) : '',
    phone: person.phone ? formatPhone(person.phone) : '',
  }
}

/**
 * Form state for the assisted person's data: the typed values, the validation errors (shown after a
 * save attempt or once a field was left), whether anything changed since `initial` (to ask before
 * discarding) and the data to save. `nameRequired` is false when the name is not asked (an elder
 * creating their own circle).
 */
export function usePersonForm(initial: PersonFormValues, { nameRequired }: { nameRequired: boolean }) {
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [touched, setTouched] = useState({ name: false, birthDate: false, phone: false })

  const birth = parseBirthDate(values.birthDate)
  const phone = parsePhone(values.phone)
  const errors = {
    name: nameRequired && values.name.trim().length < 2 ? 'Digite o nome da pessoa, com pelo menos 2 letras.' : undefined,
    birthDate: birth.error,
    phone: phone.error,
  }

  return {
    values,
    setName: (name: string) => setValues((v) => ({ ...v, name })),
    // The masks fix the format as the user types ("15031948" → "15/03/1948").
    setBirthDate: (text: string) => setValues((v) => ({ ...v, birthDate: maskInput(v.birthDate, text, maskBirthDate) })),
    setPhone: (text: string) => setValues((v) => ({ ...v, phone: maskInput(v.phone, text, maskPhone) })),
    attempted,
    touched,
    touch: (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true })),
    errors,
    valid: !errors.name && !errors.birthDate && !errors.phone,
    dirty: values.name !== initial.name || values.birthDate !== initial.birthDate || values.phone !== initial.phone,
    /** Marks that a save was attempted, so every error shows. */
    attempt: () => setAttempted(true),
    data: (): PersonFormData => ({
      name: values.name.trim(),
      birthDate: birth.value ?? null,
      phone: phone.value ?? null,
    }),
  }
}

export type PersonForm = ReturnType<typeof usePersonForm>

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <View className="mt-4">
      <Text className="font-hanken-medium text-navy text-[15px] mb-2">
        {label}
        {optional ? <Text className="font-hanken text-muted"> (opcional)</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-hanken-medium text-terracotta text-sm leading-5 mt-2">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const inputClass = (invalid: boolean) =>
  `min-h-[56px] rounded-2xl border-[1.6px] ${
    invalid ? 'border-terracotta' : 'border-hairline'
  } bg-white px-4 font-hanken-medium text-[17px] text-ink`

/**
 * The person's fields: name (when asked), birth date and phone — the last two optional, so saving
 * only needs a name. Large type and 56px inputs for the target audience.
 */
export function PersonFields({
  form,
  showName,
  namePlaceholder = 'Ex: Dona Maria Silva',
  autoFocusName = false,
}: {
  form: PersonForm
  showName: boolean
  namePlaceholder?: string
  autoFocusName?: boolean
}) {
  const show = (field: 'name' | 'birthDate' | 'phone') =>
    (form.attempted || form.touched[field]) && form.errors[field] ? form.errors[field] : undefined

  return (
    <View>
      {showName ? (
        <Field label="Nome" error={show('name')}>
          <TextInput
            value={form.values.name}
            onChangeText={form.setName}
            onBlur={() => form.touch('name')}
            placeholder={namePlaceholder}
            placeholderTextColor="#6B7A85"
            autoCapitalize="words"
            autoFocus={autoFocusName}
            accessibilityLabel="Nome da pessoa assistida"
            accessibilityHint={show('name')}
            className={inputClass(!!show('name'))}
          />
        </Field>
      ) : null}

      <Field label="Data de nascimento" optional error={show('birthDate')}>
        <TextInput
          value={form.values.birthDate}
          onChangeText={form.setBirthDate}
          onBlur={() => form.touch('birthDate')}
          placeholder="dd/mm/aaaa"
          placeholderTextColor="#6B7A85"
          keyboardType="number-pad"
          maxLength={10}
          accessibilityLabel="Data de nascimento, dia, mês e ano (opcional)"
          accessibilityHint={show('birthDate')}
          className={inputClass(!!show('birthDate'))}
        />
      </Field>

      <Field label="Telefone" optional error={show('phone')}>
        <TextInput
          value={form.values.phone}
          onChangeText={form.setPhone}
          onBlur={() => form.touch('phone')}
          placeholder="(11) 91234-5678"
          placeholderTextColor="#6B7A85"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={15}
          accessibilityLabel="Telefone com DDD (opcional)"
          accessibilityHint={show('phone')}
          className={inputClass(!!show('phone'))}
        />
      </Field>
    </View>
  )
}
