import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage'

import { storage } from './config'
import type { StoredDocument } from './types'

/** The `${Date.now()}_` prefix added on upload, stripped for the displayed name. */
const TIMESTAMP_PREFIX = /^\d+_/

/** Last path segment of a uri/path, used as a fallback display name. */
function lastSegment(path: string): string {
  const clean = path.split('?')[0].split('#')[0]
  const parts = clean.split('/')
  return parts[parts.length - 1] || clean
}

/**
 * Upload a document to users/{uid}/documents/. The stored object name is prefixed with a timestamp
 * to avoid collisions; the returned `name` strips that prefix for display.
 */
export async function uploadDocument(
  uid: string,
  input: { uri: string; name?: string; mimeType?: string }
): Promise<StoredDocument> {
  const safeName = input.name ?? lastSegment(input.uri)
  const objectName = `${Date.now()}_${safeName}`
  const objectRef = ref(storage, `users/${uid}/documents/${objectName}`)

  const response = await fetch(input.uri)
  const blob = await response.blob()

  const result = await uploadBytes(
    objectRef,
    blob,
    input.mimeType ? { contentType: input.mimeType } : undefined
  )
  const url = await getDownloadURL(objectRef)

  return {
    name: safeName.replace(TIMESTAMP_PREFIX, ''),
    fullPath: objectRef.fullPath,
    url,
    size: result.metadata.size,
    contentType: result.metadata.contentType,
    updated: result.metadata.updated,
  }
}

/** List all documents under users/{uid}/documents/, resolving metadata + download URL per item. */
export async function listDocuments(uid: string): Promise<StoredDocument[]> {
  const listing = await listAll(ref(storage, `users/${uid}/documents`))
  return Promise.all(
    listing.items.map(async (itemRef) => {
      const [metadata, url] = await Promise.all([getMetadata(itemRef), getDownloadURL(itemRef)])
      return {
        name: itemRef.name.replace(TIMESTAMP_PREFIX, ''),
        fullPath: itemRef.fullPath,
        url,
        size: metadata.size,
        contentType: metadata.contentType,
        updated: metadata.updated,
      }
    })
  )
}

/** Delete a document by its full storage path. */
export async function deleteDocument(fullPath: string): Promise<void> {
  await deleteObject(ref(storage, fullPath))
}
