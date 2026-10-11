/**
 * Client-side mirror of the API's file policy (FR-009), with the same
 * constants as `server/src/modules/documents/constants.ts`. It exists only to
 * refuse a file before wasting an upload: **the server is the authority**, and
 * anything this check lets through — an empty file, a name longer than 255
 * characters — is still rejected there, with a translated message.
 */

/** Word, Excel, PowerPoint and PDF, as the API accepts (R-9, FR-009). */
export const ALLOWED_DOCUMENT_FILE_EXTENSIONS = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'pdf',
] as const

/** 25 MB, the same limit the upload middleware enforces while parsing. */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 26_214_400

/** The limit as shown to the user, in MB. */
export const MAX_DOCUMENT_FILE_SIZE_MB = 25

/** `accept` of the file field — a hint in the picker, never a guarantee. */
export const DOCUMENT_FILE_ACCEPT = ALLOWED_DOCUMENT_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(',')

/** The accepted extensions as a readable list, e.g. "DOC, DOCX, …". */
export const ALLOWED_DOCUMENT_FILE_EXTENSIONS_LABEL =
  ALLOWED_DOCUMENT_FILE_EXTENSIONS.map((extension) =>
    extension.toUpperCase()
  ).join(', ')

/** Why a chosen file was refused; the caller turns it into a message. */
export type DocumentFileRejection = 'too-large' | 'type-not-allowed'

/**
 * Extension of a file name, in lower case, or `null` when there is none — a
 * trailing dot and a leading dot (`.gitignore`) both count as none, like
 * `path.extname` on the server.
 */
function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return null

  return fileName.slice(lastDot + 1).toLowerCase()
}

/**
 * Checks a file the user picked, in the order the request would fail: the size
 * limit is applied while the API parses the body, so it comes before the
 * extension. Returns `null` when the file is acceptable. Exactly 25 MB is
 * accepted, as on the server.
 */
export function validateDocumentFile(file: File): DocumentFileRejection | null {
  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return 'too-large'
  }

  const extension = getFileExtension(file.name)

  if (
    !extension ||
    !ALLOWED_DOCUMENT_FILE_EXTENSIONS.includes(
      extension as (typeof ALLOWED_DOCUMENT_FILE_EXTENSIONS)[number]
    )
  ) {
    return 'type-not-allowed'
  }

  return null
}
