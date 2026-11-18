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

import { useToday } from '@/hooks/useToday'
import { maskTime, parseTimeInput } from '@/services/time-input'
import { dayLabel } from '@/services/week'

import { DatePicker } from './DatePicker'
import { CancelButton, Chip, FieldError, FieldLabel } from './TaskPickers'
import {
  CUSTOM_CATEGORY_COLORS,
  TASK_CATEGORIES,
  type CustomCategory,
  type FamilyMember,
  type NewTaskInput,
  type TaskCategory,
} from './types'

const CUSTOM_NAME_MAX = 24

/** Lowercase without accents or extra spaces, to tell whether two category names are the same. */
const sameName = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

type Selection = { kind: 'builtin'; key: TaskCategory } | { kind: 'custom'; custom: CustomCategory }

/**
 * "Nova tarefa" form. Mount it only while open (the parent renders it conditionally) so every
 * opening starts with a clean form.
 *
 * `customCategories` are the user-made categories already in use in this circle, offered again here
 * next to the built-in ones; "Nova categoria" makes another one (a name and a color).
 */
export function NewTaskModal({
  members,
  customCategories = [],
  onClose,
  onSubmit,
}: {
  members: FamilyMember[]
  customCategories?: CustomCategory[]
  onClose: () => void
  onSubmit: (input: NewTaskInput) => Promise<void>
}) {
  const todayKey = useToday()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selection, setSelection] = useState<Selection>({ kind: 'builtin', key: 'outro' })
  const [createdCategories, setCreatedCategories] = useState<CustomCategory[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CUSTOM_CATEGORY_COLORS[0])
  const [newAttempted, setNewAttempted] = useState(false)
  // Starts on today; null until the user picks another day.
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const dayKey = pickedDay ?? todayKey
  const [timeText, setTimeText] = useState('')
  const [assignee, setAssignee] = useState<string | undefined>(undefined)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  // The custom categories to choose from: the ones in use, plus the ones made in this form.
  const customs = [...customCategories, ...createdCategories].filter(
    (c, i, all) => all.findIndex((other) => sameName(other.label) === sameName(c.label)) === i
  )

  const titleError = title.trim().length >= 2 ? undefined : 'Digite um título, com pelo menos 2 letras.'
  const time = parseTimeInput(timeText)
  const timeError = time ? undefined : 'Informe o horário no formato HH:MM, por exemplo 09:30.'

  const trimmedName = newName.trim().replace(/\s+/g, ' ')
  const nameTaken =
    Object.values(TASK_CATEGORIES).some((c) => sameName(c.label) === sameName(trimmedName)) ||
    customs.some((c) => sameName(c.label) === sameName(trimmedName))
  const newNameError =
    trimmedName.length < 2
      ? 'Digite o nome da categoria, com pelo menos 2 letras.'
      : nameTaken
        ? 'Já existe uma categoria com este nome.'
        : undefined

  function addCategory() {
    setNewAttempted(true)
    if (newNameError) return
    const created = { label: trimmedName, color: newColor }
    setCreatedCategories((prev) => [...prev, created])
    setSelection({ kind: 'custom', custom: created })
    setCreating(false)
    setNewName('')
    setNewAttempted(false)
  }

  async function handleSubmit() {
    if (submitting) return
    setAttempted(true)
    if (titleError || timeError || !time) return

    const trimmedDescription = description.trim()

    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onSubmit({
        title: title.trim(),
        description: trimmedDescription || undefined,
        category: selection.kind === 'builtin' ? selection.key : 'outro',
        customCategory: selection.kind === 'custom' ? selection.custom : undefined,
        dayKey,
        day: dayLabel(dayKey),
        time,
        assigneeId: assignee,
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
                  active={selection.kind === 'builtin' && selection.key === key}
                  onPress={() => setSelection({ kind: 'builtin', key })}
                />
              ))}
              {customs.map((custom) => (
                <Chip
                  key={custom.label}
                  label={custom.label}
                  color={custom.color}
                  active={selection.kind === 'custom' && sameName(selection.custom.label) === sameName(custom.label)}
                  onPress={() => setSelection({ kind: 'custom', custom })}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Criar nova categoria"
                accessibilityState={{ expanded: creating }}
                onPress={() => setCreating((open) => !open)}
                className="flex-row items-center gap-1 px-3 py-2 rounded-full active:opacity-70"
                style={{ borderWidth: 1.4, borderStyle: 'dashed', borderColor: '#11375C' }}
              >
                <MaterialIcons name="add" size={14} color="#11375C" />
                <Text className="font-hanken-bold text-xs" style={{ color: '#11375C' }}>Nova categoria</Text>
              </Pressable>
            </View>

            {creating ? (
              <View className="mt-3 rounded-2xl border border-hairline p-3" style={{ backgroundColor: 'rgba(17,55,92,0.03)' }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nome da categoria"
                  placeholderTextColor="#6B7A85"
                  maxLength={CUSTOM_NAME_MAX}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={addCategory}
                  accessibilityLabel="Nome da nova categoria"
                  accessibilityHint={newAttempted ? newNameError : undefined}
                  className={`min-h-[48px] rounded-2xl border-[1.6px] ${newAttempted && newNameError ? 'border-terracotta' : 'border-hairline'} bg-white px-4 font-hanken-medium text-[15px] text-ink`}
                />
                <FieldError message={newAttempted ? newNameError : undefined} />
                <View className="flex-row items-center gap-3 mt-3">
                  {CUSTOM_CATEGORY_COLORS.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Cor ${color}`}
                      accessibilityState={{ selected: newColor === color }}
                      onPress={() => setNewColor(color)}
                      hitSlop={6}
                      className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
                      style={{ backgroundColor: color }}
                    >
                      {newColor === color ? <MaterialIcons name="check" size={18} color="#FFFFFF" /> : null}
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar categoria"
                  onPress={addCategory}
                  className="min-h-[44px] rounded-2xl flex-row items-center justify-center gap-2 mt-3 bg-navy active:opacity-90"
                >
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                  <Text className="font-hanken-bold text-sm text-white">Adicionar categoria</Text>
                </Pressable>
              </View>
            ) : null}

            <FieldLabel>Dia</FieldLabel>
            <Text className="font-hanken-bold text-navy text-[15px] mb-2">{dayLabel(dayKey)}</Text>
            <DatePicker today={todayKey} selected={dayKey} onSelect={setPickedDay} />

            <FieldLabel>Horário</FieldLabel>
            <TextInput
              value={timeText}
              onChangeText={(text) => setTimeText(maskTime(text))}
              placeholder="HH:MM  (ex: 09:30)"
              placeholderTextColor="#6B7A85"
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Horário da tarefa, no formato horas e minutos"
              accessibilityHint={attempted ? timeError : undefined}
              className={`min-h-[52px] rounded-2xl border-[1.6px] ${attempted && timeError ? 'border-terracotta' : 'border-hairline'} bg-white px-4 font-hanken-medium text-[15px] text-ink`}
            />
            <FieldError message={attempted ? timeError : undefined} />

            <FieldLabel optional>Responsável</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="Ninguém" active={!assignee} onPress={() => setAssignee(undefined)} />
              {members.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  active={assignee === member.id}
                  onPress={() => setAssignee(member.id)}
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
