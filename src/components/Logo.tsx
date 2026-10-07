import { Image, ImageProps } from 'react-native'

type LogoProps = Omit<ImageProps, 'source' | 'resizeMode'> & { size?: 'sm' | 'md' | 'lg' }

const SIZES = {
  sm: { width: 80, height: 24 },
  md: { width: 112, height: 32 },
  lg: { width: 144, height: 40 },
}

export function Logo({ size = 'md', style, ...props }: LogoProps) {
  return (
    <Image
      source={require('@/assets/images/brand/Logo Horizontal - azul.png')}
      resizeMode="contain"
      style={[SIZES[size], style]}
      {...props}
    />
  )
}