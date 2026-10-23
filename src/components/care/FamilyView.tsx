import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Text, View } from 'react-native'

import { PERMISSION_LABELS, type FamilyMember } from './types'

export function FamilyView({ circleName, members }: { circleName: string; members: FamilyMember[] }) {
  // Contato de emergência aparece no topo (privacidade by design: o círculo é
  // ordenado por papel crítico primeiro).
  const ordered = [...members].sort(
    (a, b) =>
      Number(b.permissions.includes('emergencia')) -
      Number(a.permissions.includes('emergencia'))
  )

  return (
    <View>
      {/* Círculo */}
      <View className="flex-row items-center gap-3 p-4 rounded-2xl mb-6" style={{ backgroundColor: 'rgba(17,55,92,0.05)' }}>
        <MaterialIcons name="diversity-3" size={22} color="#11375C" />
        <View className="flex-1">
          <Text className="font-hanken text-muted text-xs">Círculo de cuidado de</Text>
          <Text className="font-hanken-extrabold text-navy text-base">{circleName}</Text>
        </View>
      </View>

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
