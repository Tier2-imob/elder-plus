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
  View,
} from 'react-native'

import { DiscardChangesPanel } from './DiscardChanges'
import { PersonFields, toFormValues, usePersonForm, type PersonFormData } from './PersonFields'
import { CancelButton, ModalSheet } from './TaskPickers'

/**
 * "Dados da pessoa": edits the assisted person's name, birth date and phone. It opens with the
 * current data filled in. Leaving with unsaved changes (Cancelar, the back button or a tap outside)
 * asks to confirm first. Mount it only while open so every opening starts from the current data.
 */
export function PersonDataModal({
  person,
  onSave,
  onClose,
}: {
  person: { name: string; birthDate: string | null; phone: string | null }
  /** Rejects with a user-facing PT message. */
  onSave: (data: PersonFormData) => Promise<void>
  onClose: () => void
}) {
  const form = usePersonForm(toFormValues(person), { nameRequired: true })
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  // Every way out goes through here: a clean form closes, a changed one asks first. The confirmation
  // replaces the content in place (iOS ignores a second modal presented over this one).
  function requestLeave() {
    if (submitting) return
    if (form.dirty) setConfirmLeave(true)
    else onClose()
  }

  async function save() {
    if (submitting) return
    form.attempt()
    if (!form.valid) return
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      await onSave(form.data())
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Não foi possível salvar os dados. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={requestLeave}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ModalSheet onClose={requestLeave} maxHeight="90%">
          {confirmLeave ? (
            <DiscardChangesPanel onKeepEditing={() => setConfirmLeave(false)} onDiscard={onClose} />
          ) : (
            <>
              <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-xl">
                Dados da pessoa
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <PersonFields form={form} showName />
              </ScrollView>

              {submitError ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  className="font-hanken-medium text-terracotta text-[15px] leading-[22px] text-center mt-4"
                >
                  {submitError}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Salvar"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                disabled={submitting}
                onPress={save}
                className="min-h-[56px] rounded-2xl flex-row items-center justify-center gap-2 bg-navy mt-4 active:opacity-90"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="check" size={21} color="#FFFFFF" />
                )}
                <Text className="font-hanken-bold text-base text-white">Salvar</Text>
              </Pressable>
              <View>
                <CancelButton onPress={requestLeave} />
              </View>
            </>
          )}
        </ModalSheet>
      </KeyboardAvoidingView>
    </Modal>
  )
}
