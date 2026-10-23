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

import { CancelButton, Chip, FieldError, FieldLabel, TimeOptions } from './TaskPickers'
import { MEDICATION_VIAS, TASK_TIMES, type Medication, type MedicationInput } from './types'

const STOCK_UNITS = ['comprimidos', 'cápsulas', 'ml', 'gotas', 'doses']

const INPUT_CLASS =
  'min-h-[52px] rounded-2xl border-[1.6px] bg-white px-4 font-hanken-medium text-[15px] text-ink'

/**
 * Create/edit medication form. Pass `medication` to edit (the form starts filled and offers
 * "Excluir"); omit it to create. Mount it only while open so every opening starts clean.
 */
export function MedicationModal({
  medication,
  onClose,
  onSubmit,
  onDelete,
}: {
  medication?: Medication
  onClose: () => void
  onSubmit: (input: MedicationInput) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const editing = medication !== undefined
  const [name, setName] = useState(medication?.name ?? '')
  const [principle, setPrinciple] = useState(medication?.principle ?? '')
  const [dose, setDose] = useState(medication?.dose ?? '1 comprimido')
  const [via, setVia] = useState(medication?.via ?? 'oral')
  const [times, setTimes] = useState<string[]>(medication?.times ?? [])
  const [stock, setStock] = useState(medication ? String(medication.stock) : '')
  const [stockUnit, setStockUnit] = useState(medication?.stockUnit ?? 'comprimidos')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const stockValue = Number(stock)
  const nameError = name.trim().length >= 2 ? undefined : 'Digite o nome, com pelo menos 2 letras.'
  const doseError = dose.trim() ? undefined : 'Informe a dose (ex: 1 comprimido).'
  const timesError = times.length ? undefined : 'Escolha pelo menos um horário.'
  const stockError =
    stock.trim() !== '' && Number.isInteger(stockValue) && stockValue >= 0
      ? undefined
      : 'Informe a quantidade em estoque (número inteiro).'

  function toggleTime(time: string) {
    // Kept in TASK_TIMES order so the card and the adherence summary list slots chronologically.
    setTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : TASK_TIMES.filter((t) => t === time || prev.includes(t))
    )
  }

  async function handleSubmit() {
    if (submitting) return
    setAttempted(true)
    if (nameError || doseError || timesError || stockError) return

    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onSubmit({
        name: name.trim(),
        principle: principle.trim(),
        dose: dose.trim(),
        via,
        times,
        stock: stockValue,
        stockUnit,
      })
      onClose()
    } catch (e) {
      console.warn('saveMedication failed', e)
      setSubmitError('Não foi possível salvar o medicamento. Verifique sua conexão e tente novamente.')
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
      console.warn('deleteMedication failed', e)
      setSubmitError('Não foi possível excluir o medicamento. Verifique sua conexão e tente novamente.')
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
            {editing ? 'Editar medicamento' : 'Novo medicamento'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>Nome</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Losartana 50mg"
              placeholderTextColor="#6B7A85"
              autoFocus={!editing}
              accessibilityLabel="Nome do medicamento"
              accessibilityHint={attempted ? nameError : undefined}
              className={`${INPUT_CLASS} ${attempted && nameError ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={attempted ? nameError : undefined} />

            <FieldLabel optional>Princípio ativo</FieldLabel>
            <TextInput
              value={principle}
              onChangeText={setPrinciple}
              placeholder="Ex: Losartana potássica"
              placeholderTextColor="#6B7A85"
              accessibilityLabel="Princípio ativo (opcional)"
              className={`${INPUT_CLASS} border-hairline`}
            />

            <FieldLabel>Dose</FieldLabel>
            <TextInput
              value={dose}
              onChangeText={setDose}
              placeholder="Ex: 1 comprimido"
              placeholderTextColor="#6B7A85"
              accessibilityLabel="Dose"
              accessibilityHint={attempted ? doseError : undefined}
              className={`${INPUT_CLASS} ${attempted && doseError ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={attempted ? doseError : undefined} />

            <FieldLabel>Via</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {MEDICATION_VIAS.map((option) => (
                <Chip key={option} label={option} active={via === option} onPress={() => setVia(option)} />
              ))}
            </View>

            <FieldLabel>Horários</FieldLabel>
            <TimeOptions selected={times} labelPrefix="Horário" onPick={toggleTime} />
            <FieldError message={attempted ? timesError : undefined} />

            <FieldLabel>Estoque</FieldLabel>
            <TextInput
              value={stock}
              onChangeText={(text) => setStock(text.replace(/[^0-9]/g, ''))}
              placeholder="Ex: 30"
              placeholderTextColor="#6B7A85"
              keyboardType="number-pad"
              accessibilityLabel="Quantidade em estoque"
              accessibilityHint={attempted ? stockError : undefined}
              className={`${INPUT_CLASS} ${attempted && stockError ? 'border-terracotta' : 'border-hairline'}`}
            />
            <FieldError message={attempted ? stockError : undefined} />
            <View className="flex-row flex-wrap gap-2 mt-3">
              {STOCK_UNITS.map((unit) => (
                <Chip key={unit} label={unit} active={stockUnit === unit} onPress={() => setStockUnit(unit)} />
              ))}
            </View>
          </ScrollView>

          {submitError ? (
            <Text className="font-hanken-medium text-terracotta text-[13px] text-center mt-4">{submitError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Salvar alterações' : 'Adicionar medicamento'}
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
              {editing ? 'Salvar alterações' : 'Adicionar medicamento'}
            </Text>
          </Pressable>

          {editing && onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmDelete ? 'Confirmar exclusão' : 'Excluir medicamento'}
              disabled={submitting}
              onPress={handleDelete}
              className="items-center py-3 mt-3 rounded-2xl active:opacity-70"
              style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
            >
              <Text className="font-hanken-bold text-sm" style={{ color: '#C0392B' }}>
                {confirmDelete ? 'Toque de novo para confirmar a exclusão' : 'Excluir medicamento'}
              </Text>
            </Pressable>
          ) : null}

          <CancelButton onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
