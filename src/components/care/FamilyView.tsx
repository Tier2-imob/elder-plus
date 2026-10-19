import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import { PERMISSION_LABELS, type FamilyMember } from './types'

function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `ELDER-${code}`
}

export function FamilyView({ members }: { members: FamilyMember[] }) {
  // Contato de emergência aparece no topo (privacidade by design: o círculo é
  // ordenado por papel crítico primeiro).
  const ordered = [...members].sort(
    (a, b) =>
      Number(b.permissions.includes('emergencia')) -
      Number(a.permissions.includes('emergencia'))
  )
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  function openInvite() {
    setInviteCode(makeInviteCode())
    setInviteOpen(true)
  }

  return (
    <View>
      {/* Convite */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Convidar pessoa para o círculo de cuidado"
        onPress={openInvite}
        className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border border-dashed mb-6 active:opacity-70"
        style={{ borderColor: '#11375C', backgroundColor: 'rgba(17,55,92,0.04)' }}
      >
        <MaterialIcons name="person-add" size={18} color="#11375C" />
        <Text className="font-hanken-bold text-sm" style={{ color: '#11375C' }}>
          Convidar para o círculo de cuidado
        </Text>
      </Pressable>

      {/* Modal de convite */}
      <Modal transparent visible={inviteOpen} animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(22,40,58,0.45)' }}>
          <View className="w-full rounded-3xl bg-white p-6 items-center">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(17,55,92,0.08)' }}
            >
              <MaterialIcons name="mark-email-read" size={26} color="#11375C" />
            </View>
            <Text className="font-hanken-extrabold text-navy text-lg mb-1">
              Convite gerado
            </Text>
            <Text className="font-hanken text-muted text-[13px] text-center mb-4">
              Compartilhe o código abaixo. A pessoa entra no círculo ao acessar com ele.
            </Text>
            <View
              className="w-full items-center py-3.5 rounded-2xl mb-2"
              style={{ backgroundColor: 'rgba(17,55,92,0.06)' }}
            >
              <Text className="font-hanken-extrabold text-navy text-xl tracking-widest">
                {inviteCode}
              </Text>
            </View>
            <Text className="font-hanken text-muted text-xs mb-5">
              elder.app/convite/{inviteCode}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar convite"
              onPress={() => setInviteOpen(false)}
              className="w-full items-center py-3 rounded-2xl active:opacity-70"
              style={{ backgroundColor: '#11375C' }}
            >
              <Text className="font-hanken-bold text-sm text-white">Concluído</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {ordered.map((member) => {
        const isEmergency = member.permissions.includes('emergencia')

        return (
          <View
            key={member.id}
            className="rounded-3xl border bg-white p-5 mb-4"
            style={{ borderColor: isEmergency ? '#C0392B' : '#E4DCD3' }}
          >
            <View className="flex-row items-center gap-3.5 mb-3">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: isEmergency ? 'rgba(192,57,43,0.12)' : 'rgba(17,55,92,0.08)' }}
              >
                <Text
                  className="font-hanken-extrabold text-sm"
                  style={{ color: isEmergency ? '#C0392B' : '#11375C' }}
                >
                  {member.initials}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-hanken-extrabold text-navy text-base">{member.name}</Text>
                  {isEmergency ? (
                    <MaterialIcons name="emergency" size={16} color="#C0392B" />
                  ) : null}
                </View>
                <Text className="font-hanken text-muted text-[13px]">{member.role}</Text>
              </View>
            </View>

            {/* Último acesso */}
            <View className="flex-row items-center gap-1.5 mb-3">
              <MaterialIcons name="history" size={14} color="#6B7A85" />
              <Text className="font-hanken text-muted text-xs">Último acesso: {member.lastAccess}</Text>
            </View>

            {/* Permissões ativas */}
            <View className="flex-row flex-wrap gap-2">
              {member.permissions.map((permission) => (
                <View
                  key={permission}
                  className="px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      permission === 'emergencia' ? 'rgba(192,57,43,0.12)' : 'rgba(17,55,92,0.08)',
                  }}
                >
                  <Text
                    className="font-hanken-bold text-[11px]"
                    style={{ color: permission === 'emergencia' ? '#C0392B' : '#11375C' }}
                  >
                    {PERMISSION_LABELS[permission]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}
