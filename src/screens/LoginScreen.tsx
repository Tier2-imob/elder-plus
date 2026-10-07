import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

import type { AccountRole, RoleRowProps } from '@/components/types'

function RoleCard({ icon, title, description, tone, onPress }: RoleRowProps){
    const [pressed, setPressed] = useState(false)
    const isNavy = tone === 'navy'

    return(
        <Pressable
            accessibilityRole='button'
            accessibilityLabel={title}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            className={`flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white mb-3 ${pressed ? 'opacity-70' : ''}`}
        >
            <View className={`w-[46px] h-[46px] rounded-2xl items-center justify-center ${isNavy ? 'bg-navy/10' : 'bg-terracotta/10'}`}>
                <MaterialIcons name={icon} size={24} color={isNavy ? '#11375C' : '#DD7C54'} />
            </View>
            <View className='flex-1'>
                <Text className='font-hanken-bold text-navy text-[15px] mb-0.5'>{title}</Text>
                <Text className='font-hanken text-muted text-[12.5px] leading-4'>{description}</Text>
            </View>
            <MaterialIcons name='chevron-right' size={22} color='#DD7C54' />
        </Pressable>
    )
}

export function LoginScreen({
    onSelectRole,
    onLogin,
    brandMark,
    backgroundIlustration,
    topInset = 0
}: {
    onSelectRole: (role: AccountRole) => void
    onLogin?: () => void
    brandMark?: number
    backgroundIlustration?: number
    topInset?: number
}){
    return(
        <View className='flex-1 bg-offwhite w-full h-full'>
            {backgroundIlustration ? (
                <Image source={backgroundIlustration} className='absolute w-full h-full' resizeMode='cover'/>
                ) : null}

            <View className='flex-1 px-6 pb-7' style={{ paddingTop: topInset + 36 }}>
                {brandMark ? (
                    <View className='items-center mb-7'>
                        <Image source={brandMark} resizeMode='contain' style={{ width: 96, height: 80}} />
                    </View>
                ) : null}

                <Text className='font-hanken-extrabold text-navy text-[23px] text-center leading-7 mb-2'>
                    Como você vai usar o Elder?
                </Text>
                <Text className='font-hanken text-muted text-sm text-center leading-5 mb-6 px-1'>
                    Escolha uma opção para continuar. Você pode mudar isso depois, se precisar.
                </Text>

                <View>
                    <RoleCard
                    icon='accessibility-new'
                    title='Elder'
                    description='Seu espaço para explorar serviços e cuidar da rotina.'
                    tone='navy'
                    onPress={() => onSelectRole('elder')}
                    />
                    <RoleCard
                    icon='family-restroom'
                    title='Família e pessoa assistida'
                    description='Encontre serviços, organize a rotina de cuidado e acompanhe junto com a família.'
                    tone='navy'
                    onPress={() => onSelectRole('family')}
                    />
                    <RoleCard
                    icon='storefront'
                    title='Comércio e parceiros'
                    description='Anuncie seus serviços, receba pedidos de orçamento e acompanhe seus resultados.'
                    tone='terracotta'
                    onPress={() => onSelectRole('partner')}
                    />
                </View>

                <View className='mt-auto items-center pt-6'>
                    <Text className='font-hanken text-muted text-xs mb-2.5'>ou</Text>
                    <Pressable accessibilityRole='button' onPress={onLogin}>
                        <Text className='font-hanken-bold text-terracotta text-sm'>Já tenho conta — Entrar</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    )
}
