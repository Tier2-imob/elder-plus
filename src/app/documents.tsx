import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useUserDocuments } from '@/hooks/useUserDocuments'
import { DocumentsScreen } from '@/screens/DocumentsScreen'
import { useAccount } from '@/state/account-context'

export default function Documents() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const { documents, loading, uploading, error, pickAndUploadFile, pickAndUploadImage, remove } =
    useUserDocuments(account?.uid)

  return (
    <DocumentsScreen
      topInset={insets.top}
      bottomInset={insets.bottom}
      documents={documents}
      loading={loading}
      uploading={uploading}
      errorMessage={error}
      onPickFile={pickAndUploadFile}
      onPickImage={pickAndUploadImage}
      onDelete={remove}
      onBack={() => router.back()}
    />
  )
}
