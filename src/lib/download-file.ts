import {
  type Document,
  getDocumentsIdFile,
  getDocumentsTemplatesESocial,
} from '@/http/api'
import { FetchError } from '@/http/fetch-client'

/** Stable name the API serves the E-Social template under (FR-016). */
export const E_SOCIAL_TEMPLATE_FILE_NAME = 'modelo-e-social.xlsx'

/**
 * Hands a blob to the browser as a download under the given file name.
 *
 * The object URL is revoked on a later tick: revoking it in the same task
 * cancels the download in some browsers. `window.document` is spelled out
 * because `Document` here is the API record, not the DOM one.
 */
export function saveBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')

  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'

  window.document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Turns a non-200 download into the error shape `useTranslateError()` reads.
 * The client already throws on a failed response; this covers the remaining
 * branch of its typed union.
 */
function toFetchError(status: number, data: { message: string }) {
  return new FetchError(status, data, data.message)
}

/**
 * Downloads the file of a document through the authenticated client and saves
 * it under its original name, taken from the record itself — no response
 * header is read, so CORS needs no change (D-18, R-14).
 */
export async function downloadDocumentFile(record: Document) {
  if (!record.file) return

  const response = await getDocumentsIdFile(record.id)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, record.file.name)
}

/** Downloads the E-Social spreadsheet template (FR-016, J4). */
export async function downloadESocialTemplate() {
  const response = await getDocumentsTemplatesESocial()

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, E_SOCIAL_TEMPLATE_FILE_NAME)
}
