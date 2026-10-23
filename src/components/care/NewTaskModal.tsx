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
import {
  TASK_CATEGORIES,
  TODAY_KEY,
  WEEK_DAYS,
  type FamilyMember,
  type NewTaskInput,
  type TaskCategory,
} from './types'

/**
 * "Nova tarefa" form. Mount it only while open (the parent renders it conditionally) so every
 * opening starts with a clean form.
 */
export function NewTaskModal({
  members,
  onClose,
  onSubmit,
}: {
  members: FamilyMember[]
  onClose: () => void
  onSubmit: (input: NewTaskInput) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TaskCategory>('outro')
  const [dayKey, setDayKey] = useState(TODAY_KEY)
  const [time, setTime] = useState<string | undefined>(undefined)
  const [assignee, setAssignee] = useState<string | undefined>(undefined)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const titleError = title.trim().length >= 2 ? undefined : 'Digite um título, com pelo menos 2 letras.'
  const timeError = time ? undefined : 'Escolha um horário.'

  async function handleSubmit() {
    if (submitting) return
    setAttempted(true)
    if (titleError || timeError || !time) return

    const day = WEEK_DAYS.find((d) => d.key === dayKey) ?? WEEK_DAYS[0]
    const trimmedDescription = description.trim()

    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onSubmit({
        title: title.trim(),
        description: trimmedDescription || undefined,
        category,
        dayKey: day.key,
        day: `${day.full}, ${day.date}`,
        time,
        assignee,
      })
      onClose()
    } catch (e) {
      console.warn('createTask failed', e)
      setSubmitError('Não foi possível criar a tarefa. Verifique sua conexão e tente novamente.')
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
          <Text className="font-hanken-extrabold text-navy text-lg mb-1">Nova tarefa</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>Título</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Consulta com a geriatra"
              placeholderTextColor="#6B7A85"
              autoFocus
              returnKeyType="next"
              accessibilityLabel="Título"
              accessibilityHint={attempted ? titleError : undefined}
              className={`min-h-[52px] rounded-2xl border-[1.6px] ${attempted && titleError ? 'border-terracotta' : 'border-hairline'} bg-white px-4 font-hanken-medium text-[15px] text-ink`}
            />
            <FieldError message={attempted ? titleError : undefined} />

            <FieldLabel optional>Descrição</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhes, endereço, o que levar…"
              placeholderTextColor="#6B7A85"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Descrição (opcional)"
              className="min-h-[88px] rounded-2xl border-[1.6px] border-hairline bg-white px-4 py-3 font-hanken text-[15px] text-ink"
            />

            <FieldLabel>Categoria</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(TASK_CATEGORIES) as TaskCategory[]).map((key) => (
                <Chip
                  key={key}
                  label={TASK_CATEGORIES[key].label}
                  color={TASK_CATEGORIES[key].color}
                  active={category === key}
                  onPress={() => setCategory(key)}
                />
              ))}
            </View>

            <FieldLabel>Dia</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <Chip
                  key={day.key}
                  label={`${day.short} ${day.date}`}
                  active={dayKey === day.key}
                  onPress={() => setDayKey(day.key)}
                />
              ))}
            </View>

            <FieldLabel>Horário</FieldLabel>
            <TimeOptions selected={time} labelPrefix="Horário" onPick={setTime} />
            <FieldError message={attempted ? timeError : undefined} />

            <FieldLabel optional>Responsável</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="Ninguém" active={!assignee} onPress={() => setAssignee(undefined)} />
              {members.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  active={assignee === member.name}
                  onPress={() => setAssignee(member.name)}
                />
              ))}
            </View>
          </ScrollView>

          {submitError ? (
            <Text className="font-hanken-medium text-terracotta text-[13px] text-center mt-4">{submitError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Criar tarefa"
            disabled={submitting}
            onPress={handleSubmit}
            className="min-h-[52px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-4 active:opacity-90"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="add" size={19} color="#FFFFFF" />
            )}
            <Text className="font-hanken-bold text-base text-white">Criar tarefa</Text>
          </Pressable>
          <CancelButton onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
