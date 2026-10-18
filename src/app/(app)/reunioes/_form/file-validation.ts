/**
 * Client-side mirror of the API's file policy (FR-012), applied to each of the
 * two attachments, with the same constants as
 * `server/src/modules/meetings/constants.ts`. It exists only to refuse a file
 * before wasting an upload: **the server is the authority**, and anything this
 * check lets through — an empty file, a name longer than 255 characters — is
 * still rejected there, with a translated message.
 */

/** Word, PowerPoint and PDF, as the API accepts: **no Excel** (R-14). */
export const ALLOWED_MEETING_FILE_EXTENSIONS = [
  'doc',
  'docx',
  'ppt',
  'pptx',
  'pdf',
] as const

/** 25 MB per file, the same limit the upload middleware enforces while parsing. */
export const MAX_MEETING_FILE_SIZE_BYTES = 26_214_400

/** The limit as shown to the user, in MB. */
export const MAX_MEETING_FILE_SIZE_MB = 25

/** `accept` of the file fields — a hint in the picker, never a guarantee. */
export const MEETING_FILE_ACCEPT = ALLOWED_MEETING_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`
).join(',')

/** The accepted extensions as a readable list, e.g. "DOC, DOCX, …". */
export const ALLOWED_MEETING_FILE_EXTENSIONS_LABEL =
  ALLOWED_MEETING_FILE_EXTENSIONS.map((extension) =>
    extension.toUpperCase()
  ).join(', ')

/** Why a chosen file was refused; the caller turns it into a message. */
export type MeetingFileRejection = 'too-large' | 'type-not-allowed'

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
 * Checks a file the user picked for either attachment, in the order the
 * request would fail: the size limit is applied while the API parses the
 * body, so it comes before the extension. Returns `null` when the file is
 * acceptable. Exactly 25 MB is accepted, as on the server.
 */
export function validateMeetingFile(file: File): MeetingFileRejection | null {
  if (file.size > MAX_MEETING_FILE_SIZE_BYTES) {
    return 'too-large'
  }

  const extension = getFileExtension(file.name)

  if (
    !extension ||
    !ALLOWED_MEETING_FILE_EXTENSIONS.includes(
      extension as (typeof ALLOWED_MEETING_FILE_EXTENSIONS)[number]
    )
  ) {
    return 'type-not-allowed'
  }

  return null
}
