import { Modal, Pressable, Text, View } from 'react-native'

import { ModalSheet } from './TaskPickers'

/**
 * "Descartar alterações?": shown when the user tries to leave a form with unsaved changes. The
 * safe choice ("Continuar editando") comes first and is the filled button.
 */
export function DiscardChangesPanel({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void
  onDiscard: () => void
}) {
  return (
    <View>
      <Text accessibilityRole="header" className="font-hanken-extrabold text-navy text-xl mb-2">
        Descartar alterações?
      </Text>
      <Text className="font-hanken text-ink text-[16px] leading-6 mb-5">
        Você alterou os dados e ainda não salvou. Se sair agora, o que foi digitado será perdido.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar editando"
        onPress={onKeepEditing}
        className="min-h-[56px] items-center justify-center rounded-2xl bg-navy active:opacity-90"
      >
        <Text className="font-hanken-bold text-base text-white">Continuar editando</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Descartar as alterações e sair"
        onPress={onDiscard}
        className="min-h-[56px] items-center justify-center rounded-2xl mt-3 active:opacity-70"
        style={{ backgroundColor: 'rgba(192,57,43,0.08)' }}
      >
        <Text className="font-hanken-bold text-base" style={{ color: '#C0392B' }}>
          Descartar e sair
        </Text>
      </Pressable>
    </View>
  )
}

/** The same question as its own modal, for forms that are not themselves in a modal. */
export function DiscardChangesModal({
  visible,
  onKeepEditing,
  onDiscard,
}: {
  visible: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onKeepEditing}>
      <ModalSheet onClose={onKeepEditing}>
        <DiscardChangesPanel onKeepEditing={onKeepEditing} onDiscard={onDiscard} />
      </ModalSheet>
    </Modal>
  )
}
