import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Logo } from '@/components/Logo'

/** The document shape DocumentsScreen renders. Mirrors StoredDocument without importing services. */
type DocumentItem = {
  name: string
  fullPath: string
  url: string
  size?: number
  contentType?: string
  updated?: string
}

/** Human-readable file size (e.g. "1,2 MB"); omitted when the size is unknown. */
function formatSize(bytes?: number): string | null {
  if (bytes === undefined || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? String(value) : value.toFixed(1).replace('.', ',')
  return `${rounded} ${units[unit]}`
}

function DocumentRow({
  document,
  onDelete,
}: {
  document: DocumentItem
  onDelete: (fullPath: string) => void
}) {
  const size = formatSize(document.size)
  const meta = [size, document.contentType].filter(Boolean).join(' • ')

  return (
    <View className="flex-row items-center gap-3.5 p-3.5 rounded-2xl border border-hairline bg-white mb-3">
      <View className="w-[46px] h-[46px] rounded-2xl items-center justify-center bg-navy/10">
        <MaterialIcons name="insert-drive-file" size={22} color="#11375C" />
      </View>
      <View className="flex-1">
        <Text className="font-hanken-bold text-navy text-[15px] mb-0.5" numberOfLines={1}>
          {document.name}
        </Text>
        {meta.length > 0 && (
          <Text className="font-hanken text-muted text-[12.5px]" numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Excluir ${document.name}`}
        onPress={() => onDelete(document.fullPath)}
        hitSlop={8}
        className="w-9 h-9 rounded-full items-center justify-center active:opacity-60"
      >
        <MaterialIcons name="delete-outline" size={22} color="#DD7C54" />
      </Pressable>
    </View>
  )
}

export function DocumentsScreen({
  documents,
  loading = false,
  uploading = false,
  errorMessage,
  onPickFile,
  onPickImage,
  onDelete,
  onBack,
  topInset = 0,
  bottomInset = 0,
}: {
  documents: DocumentItem[]
  loading?: boolean
  uploading?: boolean
  errorMessage?: string
  onPickFile: () => void
  onPickImage: () => void
  onDelete: (fullPath: string) => void
  onBack: () => void
  topInset?: number
  bottomInset?: number
}) {
  return (
    <View className="flex-1 bg-offwhite">
      {/* Topo com voltar + logo */}
      <View className="px-6 pb-4 bg-offwhite" style={{ paddingTop: topInset + 16 }}>
        <View className="flex-row items-center justify-between mb-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            hitSlop={8}
            className="active:opacity-60"
          >
            <MaterialIcons name="arrow-back" size={24} color="#11375C" />
          </Pressable>
          <Logo size="sm" style={{ width: 80, height: 24 }} />
          <View style={{ width: 24 }} />
        </View>

        <Text className="font-hanken-extrabold text-navy text-2xl mb-1">Meus documentos</Text>
        <Text className="font-hanken text-muted text-sm leading-5">
          Guarde exames, receitas e outros arquivos com segurança.
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottomInset + 40,
        }}
      >
        {/* Ações de envio */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher arquivo"
            onPress={onPickFile}
            disabled={uploading}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-navy px-4 py-4 active:opacity-80"
            style={{ opacity: uploading ? 0.6 : 1 }}
          >
            <MaterialIcons name="upload-file" size={20} color="#FFFFFF" />
            <Text className="font-hanken-bold text-white text-sm">Escolher arquivo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher foto"
            onPress={onPickImage}
            disabled={uploading}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-hairline bg-white px-4 py-4 active:opacity-70"
            style={{ opacity: uploading ? 0.6 : 1 }}
          >
            <MaterialIcons name="image" size={20} color="#11375C" />
            <Text className="font-hanken-bold text-navy text-sm">Escolher foto</Text>
          </Pressable>
        </View>

        {/* Estado de envio */}
        {uploading && (
          <View className="flex-row items-center gap-2.5 mb-4 px-1">
            <ActivityIndicator size="small" color="#11375C" />
            <Text className="font-hanken text-muted text-sm">Enviando documento…</Text>
          </View>
        )}

        {/* Mensagem de erro */}
        {errorMessage && (
          <View className="rounded-2xl bg-terracotta/10 px-4 py-3 mb-4">
            <Text className="font-hanken-medium text-terracotta text-sm">{errorMessage}</Text>
          </View>
        )}

        {/* Lista / carregamento / vazio */}
        {loading && documents.length === 0 ? (
          <View className="flex-row items-center gap-2.5 py-6 px-1">
            <ActivityIndicator size="small" color="#11375C" />
            <Text className="font-hanken text-muted text-sm">Carregando documentos…</Text>
          </View>
        ) : documents.length === 0 ? (
          <View className="items-center py-12 px-6">
            <MaterialIcons name="folder-open" size={48} color="#CFD7DE" />
            <Text className="font-hanken-bold text-[#CFD7DE] text-base mt-3 text-center">
              Nenhum documento ainda
            </Text>
            <Text className="font-hanken text-muted text-sm mt-1 text-center">
              Envie seu primeiro arquivo usando os botões acima.
            </Text>
          </View>
        ) : (
          <View>
            {documents.map((document) => (
              <DocumentRow key={document.fullPath} document={document} onDelete={onDelete} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
