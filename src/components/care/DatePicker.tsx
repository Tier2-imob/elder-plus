import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { MONTH_NAMES, WEEKDAY_INITIALS, monthGrid, parseDateKey } from '@/services/week'

/**
 * A month calendar for picking a day of the current year. `today` ("YYYY-MM-DD") fixes the year (the
 * months January to December of that year can be browsed) and days before it are not selectable.
 */
export function DatePicker({
  today,
  selected,
  onSelect,
}: {
  today: string
  selected: string
  onSelect: (dayKey: string) => void
}) {
  const todayDate = parseDateKey(today) ?? new Date()
  const year = todayDate.getFullYear()
  const [month, setMonth] = useState(() => (parseDateKey(selected) ?? todayDate).getMonth())
  const cells = monthGrid(year, month)

  return (
    <View className="rounded-2xl border border-hairline px-2 py-2" style={{ backgroundColor: 'rgba(17,55,92,0.03)' }}>
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          disabled={month === 0}
          onPress={() => setMonth(month - 1)}
          hitSlop={8}
          className="w-9 h-9 items-center justify-center rounded-full active:opacity-60"
          style={{ opacity: month === 0 ? 0.3 : 1 }}
        >
          <MaterialIcons name="chevron-left" size={24} color="#11375C" />
        </Pressable>
        <Text accessibilityRole="header" className="font-hanken-bold text-navy text-[15px]">
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          disabled={month === 11}
          onPress={() => setMonth(month + 1)}
          hitSlop={8}
          className="w-9 h-9 items-center justify-center rounded-full active:opacity-60"
          style={{ opacity: month === 11 ? 0.3 : 1 }}
        >
          <MaterialIcons name="chevron-right" size={24} color="#11375C" />
        </Pressable>
      </View>

      <View className="flex-row mb-0.5">
        {WEEKDAY_INITIALS.map((initial, i) => (
          <Text key={i} className="flex-1 text-center font-hanken-medium text-muted text-xs">
            {initial}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((key, i) => {
          if (!key) return <View key={`blank-${i}`} style={{ width: `${100 / 7}%`, height: 34 }} />
          const day = Number(key.slice(8))
          const isSelected = key === selected
          const isToday = key === today
          const past = key < today
          return (
            <View key={key} style={{ width: `${100 / 7}%`, height: 34 }} className="items-center justify-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${day} de ${MONTH_NAMES[month]}${isToday ? ', hoje' : ''}`}
                accessibilityState={{ selected: isSelected, disabled: past }}
                disabled={past}
                onPress={() => onSelect(key)}
                className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
                style={{
                  backgroundColor: isSelected ? '#11375C' : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.4 : 0,
                  borderColor: '#DD7C54',
                }}
              >
                <Text
                  className="font-hanken-bold text-[13px]"
                  style={{ color: isSelected ? '#FFFFFF' : past ? '#C5CED6' : '#11375C' }}
                >
                  {day}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}
