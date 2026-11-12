import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

import { DuplicateCardError } from '@/services/firebase/health-cards'
import { hasErrors, validateHealthCard } from '@/services/health-cards'

import { CancelButton, FieldError, FieldLabel } from './TaskPickers'
import type { HealthCard, HealthCardInput } from './types'

const INPUT_CLASS =
  'min-h-[52px] rounded-2xl border-[1.6px] bg-white px-4 font-hanken-medium text-[15px] text-ink'

/**
 * Create/edit form of a health plan card. Pass `card` to edit (the form starts filled and offers
 * "Excluir"); omit it to create. `cards` are all the registered cards, to refuse a number or code
 * that another card already has. Mount it only while open so every opening starts clean.
 */
export function HealthCardModal({
  card,
  cards,
  onClose,
  onSubmit,
  onDelete,
}: {
  card?: HealthCard
  cards: HealthCard[]
  onClose: () => void
  onSubmit: (input: HealthCardInput) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const editing = card !== undefined
  const [operator, setOperator] = useState(card?.operator ?? '')
  const [number, setNumber] = useState(card?.number ?? '')
  const [code, setCode] = useState(card?.code ?? '')
  const [holder, setHolder] = useState(card?.holder ?? '')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const errors = validateHealthCard({ operator, number, code, holder }, cards, card?.id)
  // A duplicate is shown as soon as it is typed; the other errors wait for the first attempt.
  const duplicateNumber = errors.number?.startsWith('Já existe') ? errors.number : undefined
  const duplicateCode = errors.code
  const numberError = attempted ? errors.number : duplicateNumber
  const codeError = attempted ? errors.code : duplicateCode

  async function handleSubmit() {
    if (submitting) return
    setAttempted(true)
    if (hasErrors(errors)) return

    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onSubmit({ operator: operator.trim(), number: number.trim(), code: code.trim(), holder: holder.trim() })
      onClose()
    } catch (e) {
      console.warn('saveHealthCard failed', e)
      setSubmitError(
        e instanceof DuplicateCardError
          ? 'Já existe um cartão com este número.'
          : 'Não foi possível salvar o cartão. Verifique sua conexão e tente novamente.'
      )
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!onDelete || submitting) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      console.warn('deleteHealthCard failed', e)
      setSubmitError('Não foi possível excluir o cartão. Verifique sua conexão e tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(22,40,58,0.45)' }}
      >
        <View className="w-full rounded-3xl bg-white p-5" style={{ maxHeight: '90%' }}>
          <Text className="font-hanken-extrabold text-navy text-lg mb-1">
            {editing ? 'Editar cartão' : 'Novo cartão do plano de saúde'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>Operadora</FieldLabel>
            <TextInput
              value={operator}
              onChangeText={setOperator}
              placeholder="Ex: Unimed"
              placeholderTextColor="#6B7A85"
              autoFocus={!editing}
              accessibilityLabel="Operadora do plano"
              accessibilityHint={attempted ? errors.operator : undefined}
              className={`${INPUT_CLASS} ${attempted && errors.operator ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={attempted ? errors.operator : undefined} />

            <FieldLabel>Número da carteirinha</FieldLabel>
            <TextInput
              value={number}
              onChangeText={setNumber}
              placeholder="Ex: 0 123 456789 00 1"
              placeholderTextColor="#6B7A85"
              autoCapitalize="characters"
              accessibilityLabel="Número da carteirinha"
              accessibilityHint={numberError}
              className={`${INPUT_CLASS} ${numberError ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={numberError} />

            <FieldLabel optional>Código</FieldLabel>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Ex: código de acesso ou de validação"
              placeholderTextColor="#6B7A85"
              autoCapitalize="characters"
              accessibilityLabel="Código do cartão (opcional)"
              accessibilityHint={codeError}
              className={`${INPUT_CLASS} ${codeError ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={codeError} />

            <FieldLabel optional>Titular do cartão</FieldLabel>
            <TextInput
              value={holder}
              onChangeText={setHolder}
              placeholder="Nome impresso no cartão"
              placeholderTextColor="#6B7A85"
              accessibilityLabel="Titular do cartão (opcional)"
              className={`${INPUT_CLASS} border-hairline`}
            />
          </ScrollView>

          {submitError ? (
            <Text className="font-hanken-medium text-terracotta text-[13px] text-center mt-4">{submitError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Salvar alterações' : 'Adicionar cartão'}
            disabled={submitting}
            onPress={handleSubmit}
            className="min-h-[52px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-4 active:opacity-90"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name={editing ? 'check' : 'add'} size={19} color="#FFFFFF" />
            )}
            <Text className="font-hanken-bold text-base text-white">
              {editing ? 'Salvar alterações' : 'Adicionar cartão'}
            </Text>
          </Pressable>

          {editing && onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmDelete ? 'Confirmar exclusão' : 'Excluir cartão'}
              disabled={submitting}
              onPress={handleDelete}
              className="items-center py-3 mt-3 rounded-2xl active:opacity-70"
              style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
            >
              <Text className="font-hanken-bold text-sm" style={{ color: '#C0392B' }}>
                {confirmDelete ? 'Toque de novo para confirmar a exclusão' : 'Excluir cartão'}
              </Text>
            </Pressable>
          ) : null}

          <CancelButton onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
