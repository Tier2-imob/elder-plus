import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useAccount } from '@/state/account-context'
import type { ServiceItem } from '@/screens/DiscoverScreen'

type Review = { id: string; author: string; rating: number; comment: string }

const INITIAL_REVIEWS: Review[] = [
  { id: 'r1', author: 'Maria Helena',  rating: 5, comment: 'Atendimento excelente, muito cuidadosos com os pacientes.' },
  { id: 'r2', author: 'José Augusto',  rating: 4, comment: 'Ótima estrutura e profissionais dedicados.' },
  { id: 'r3', author: 'Tereza Campos', rating: 5, comment: 'Me senti muito bem acolhida desde a primeira consulta.' },
]

function StarRow({ value, onChange, size = 22 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={`${star} estrelas`}
          onPress={() => onChange?.(star)}
          disabled={!onChange}
          hitSlop={4}
        >
          <MaterialIcons
            name={star <= value ? 'star' : 'star-border'}
            size={size}
            color="#DD7C54"
          />
        </Pressable>
      ))}
    </View>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View className="p-4 rounded-2xl border border-hairline bg-white mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-hanken-bold text-navy text-sm">{review.author}</Text>
        <StarRow value={review.rating} size={14} />
      </View>
      <Text className="font-hanken text-muted text-[13px] leading-5">{review.comment}</Text>
    </View>
  )
}

export function BusinessScreen({
  item,
  onBack,
  topInset = 0,
}: {
  item: ServiceItem
  onBack: () => void
  topInset?: number
}) {
  const { isFavorite, toggleFavorite } = useAccount()
  const fav = isFavorite(item.id)

  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS)
  const [newRating, setNewRating] = useState(0)
  const [newComment, setNewComment] = useState('')

  const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length

  function submitReview() {
    if (newRating === 0 || newComment.trim().length === 0) return
    setReviews((prev) => [
      { id: `r${Date.now()}`, author: 'Você', rating: newRating, comment: newComment.trim() },
      ...prev,
    ])
    setNewRating(0)
    setNewComment('')
  }

  const distanceLabel =
    item.distance >= 1000
      ? `${(item.distance / 1000).toFixed(1).replace('.', ',')} km de você`
      : `${item.distance} m de você`

  return (
    <View className="flex-1 bg-offwhite">
      {/* Hero — bloco de cor sólida reservado para imagem futura */}
      <View className="bg-navy/20" style={{ height: 220 }}>
        {/* Botões flutuantes sobre o hero */}
        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-5"
          style={{ top: topInset + 14 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:opacity-70"
            style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}
          >
            <MaterialIcons name="arrow-back" size={18} color="#11375C" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onPress={() => toggleFavorite(item.id)}
            className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:opacity-70"
            style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 }}
          >
            <MaterialIcons name={fav ? 'favorite' : 'favorite-border'} size={18} color={fav ? '#DD7C54' : '#11375C'} />
          </Pressable>
        </View>
      </View>

      {/* Sheet branca por baixo do hero */}
      <ScrollView
        className="flex-1 bg-white"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      >
        {/* Nome + avaliação */}
        <View className="flex-row items-start justify-between mb-2">
          <Text className="font-hanken-extrabold text-navy text-2xl leading-8 flex-1 mr-3">{item.name}</Text>
          <View className="items-end">
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="star" size={16} color="#DD7C54" />
              <Text className="font-hanken-bold text-navy text-base">{avgRating.toFixed(1)}</Text>
            </View>
            <Text className="font-hanken text-muted text-xs mt-0.5">{reviews.length} avaliações</Text>
          </View>
        </View>

        {/* Tag + distância */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="bg-terracotta/10 px-3 py-1 rounded-full">
            <Text className="font-hanken-bold text-terracotta text-xs">{item.tag}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="place" size={13} color="#6B7A85" />
            <Text className="font-hanken text-muted text-xs">{distanceLabel}</Text>
          </View>
        </View>

        {/* Descrição */}
        <Text className="font-hanken text-ink text-sm leading-6 mb-6">
          Oferecemos serviços especializados com foco no bem-estar e na qualidade de vida de nossos clientes. Nossa equipe é treinada para atender com cuidado, respeito e atenção às necessidades individuais de cada pessoa.
        </Text>

        {/* Divider */}
        <View className="border-t border-hairline mb-5" />

        {/* Avaliações */}
        <Text className="font-hanken-bold text-navy text-base mb-4">
          Avaliações ({reviews.length})
        </Text>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}

        {/* Divider */}
        <View className="border-t border-hairline mt-2 mb-5" />

        {/* Campo de nova avaliação */}
        <Text className="font-hanken-bold text-navy text-base mb-4">Deixe sua avaliação</Text>

        <View className="mb-3">
          <Text className="font-hanken-medium text-navy text-xs mb-2">Sua nota</Text>
          <StarRow value={newRating} onChange={setNewRating} size={28} />
        </View>

        <View className="mb-4">
          <Text className="font-hanken-medium text-navy text-xs mb-2">Comentário</Text>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Conte sua experiência…"
            placeholderTextColor="#6B7A85"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="rounded-2xl border border-hairline bg-offwhite px-4 py-3 font-hanken text-sm text-ink"
            style={{ minHeight: 96 }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar avaliação"
          onPress={submitReview}
          className="min-h-[52px] rounded-2xl items-center justify-center active:opacity-90"
          style={{ backgroundColor: newRating > 0 && newComment.trim().length > 0 ? '#11375C' : '#E4DCD3' }}
        >
          <Text
            className="font-hanken-bold text-base"
            style={{ color: newRating > 0 && newComment.trim().length > 0 ? '#FFFFFF' : '#6B7A85' }}
          >
            Enviar avaliação
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}