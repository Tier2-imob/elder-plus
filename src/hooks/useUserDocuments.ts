import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'

import * as files from '@/services/firebase/files'
import type { StoredDocument } from '@/services/firebase/types'

/** Last path segment of a uri, used as a fallback display name when the picker omits one. */
function lastSegment(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0]
  const parts = clean.split('/')
  return parts[parts.length - 1] || clean
}

/**
 * Owns the signed-in user's stored documents and the pick→upload→list→delete lifecycle. This hook is
 * the ONLY place that imports the pickers (`expo-document-picker`/`expo-image-picker`) and
 * `files.ts`, keeping `DocumentsScreen` pure (AC-25).
 *
 * `pickAndUploadFile` uses `getDocumentAsync` → `{ canceled, assets: [{ uri, name, mimeType, size }] }`.
 * `pickAndUploadImage` uses `launchImageLibraryAsync` → `{ canceled, assets: [{ uri, fileName, mimeType, fileSize }] }`.
 * A user cancel (`canceled` or an empty `assets`) is a no-op. Upload/list/delete failures set
 * `error` without crashing and leave the list consistent with the server.
 */
export function useUserDocuments(uid: string | undefined) {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [loading, setLoading] = useState(uid !== undefined)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  // Reset to the loading state during render whenever the uid changes (React-recommended "adjust
  // state when a prop changes" pattern), so a wrapper reused across accounts never shows the
  // previous user's documents.
  const [loadedForUid, setLoadedForUid] = useState(uid)
  if (loadedForUid !== uid) {
    setLoadedForUid(uid)
    setDocuments([])
    setError(undefined)
    setLoading(uid !== undefined)
  }

  // Tracks the current effect run so a resolved request for a stale uid never writes state.
  const activeRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!uid) return
    try {
      const items = await files.listDocuments(uid)
      if (activeRef.current) setDocuments(items)
    } catch (e) {
      console.warn('listDocuments failed', e)
      if (activeRef.current) {
        setDocuments([])
        setError('Não foi possível carregar seus documentos. Tente novamente.')
      }
    }
  }, [uid])

  useEffect(() => {
    activeRef.current = true

    // With no signed-in user there is nothing to load; the render-time adjustment above already
    // cleared `loading`/`documents`, so the effect only does work when a uid is present.
    if (uid) {
      files
        .listDocuments(uid)
        .then((items) => {
          if (activeRef.current) setDocuments(items)
        })
        .catch((e) => {
          console.warn('listDocuments failed', e)
          if (activeRef.current) {
            setDocuments([])
            setError('Não foi possível carregar seus documentos. Tente novamente.')
          }
        })
        .finally(() => {
          if (activeRef.current) setLoading(false)
        })
    }

    return () => {
      activeRef.current = false
    }
  }, [uid])

  const upload = useCallback(
    async (file: { uri: string; name?: string; mimeType?: string }) => {
      if (!uid) return
      setUploading(true)
      setError(undefined)
      try {
        const stored = await files.uploadDocument(uid, file)
        if (activeRef.current) setDocuments((prev) => [stored, ...prev])
      } catch (e) {
        console.warn('uploadDocument failed', e)
        if (activeRef.current) {
          setError('Não foi possível enviar o arquivo. Tente novamente.')
        }
      } finally {
        if (activeRef.current) setUploading(false)
      }
    },
    [uid]
  )

  const pickAndUploadFile = useCallback(async () => {
    if (!uid) return
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      await upload({
        uri: asset.uri,
        name: asset.name ?? lastSegment(asset.uri),
        mimeType: asset.mimeType,
      })
    } catch (e) {
      console.warn('pickAndUploadFile failed', e)
      setError('Não foi possível enviar o arquivo. Tente novamente.')
    }
  }, [uid, upload])

  const pickAndUploadImage = useCallback(async () => {
    if (!uid) return
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' })
      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      await upload({
        uri: asset.uri,
        name: asset.fileName ?? lastSegment(asset.uri),
        mimeType: asset.mimeType,
      })
    } catch (e) {
      console.warn('pickAndUploadImage failed', e)
      setError('Não foi possível enviar a foto. Tente novamente.')
    }
  }, [uid, upload])

  const remove = useCallback(
    async (fullPath: string) => {
      setError(undefined)
      try {
        await files.deleteDocument(fullPath)
        if (activeRef.current) {
          setDocuments((prev) => prev.filter((doc) => doc.fullPath !== fullPath))
        }
      } catch (e) {
        console.warn('deleteDocument failed', e)
        if (activeRef.current) {
          setError('Não foi possível excluir o documento. Tente novamente.')
        }
        // Re-sync with the server's actual state in case the item was already gone.
        await refresh()
      }
    },
    [refresh]
  )

  return { documents, loading, uploading, error, pickAndUploadFile, pickAndUploadImage, remove }
}
