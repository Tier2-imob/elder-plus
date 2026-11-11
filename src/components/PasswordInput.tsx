import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useState, type ComponentProps, type Ref } from 'react'
import { Pressable, TextInput, View } from 'react-native'

/** A password field with an eye button that shows or hides what is typed. Hidden by default. */
export function PasswordInput({
  className,
  ref,
  ...props
}: Omit<ComponentProps<typeof TextInput>, 'secureTextEntry' | 'ref'> & { ref?: Ref<TextInput> }) {
  const [visible, setVisible] = useState(false)

  return (
    <View>
      <TextInput
        {...props}
        ref={ref}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        // Room on the right so the text never runs under the eye button.
        className={`${className ?? ''} pr-14`}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar a senha' : 'Mostrar a senha'}
        accessibilityState={{ selected: visible }}
        onPress={() => setVisible((v) => !v)}
        hitSlop={4}
        className="absolute right-0 top-0 bottom-0 w-14 items-center justify-center active:opacity-60"
      >
        <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color="#6B7A85" />
      </Pressable>
    </View>
  )
}
