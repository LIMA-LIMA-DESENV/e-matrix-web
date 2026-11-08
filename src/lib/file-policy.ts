/**
 * Client-side mirror of the API's attachment policies. It exists only to
 * refuse a file before wasting an upload: **the server is the authority**,
 * and anything this check lets through — an empty file, a name longer than
 * 255 characters, a `.png` that is not an image — is still rejected there,
 * with a translated message.
 */

/** What a file field accepts. */
export interface FilePolicy {
  /** Lower-case extensions, without the dot. */
  extensions: readonly string[]
  /** Inclusive limit, applied by the API while it parses the body. */
  maxBytes: number
  /** The limit as shown to the user, in MB. */
  maxMegabytes: number
  /** `accept` of the input: a hint in the picker, never a guarantee. */
  accept: string
}

/**
 * A photo — the before and after photos of an RGP/RGA (R-15, FR-007) and the
 * photo of an evaluation: JPEG and PNG of up to 10 MB, with no pixel limit,
 * so a phone photo goes in as it is. The `accept` lists the MIME types
 * (RK-3), which is what makes a phone offer its camera roll; a HEIC picked
 * anyway is refused by the extension below.
 */
export const PHOTO_POLICY: FilePolicy = {
  extensions: ['jpg', 'jpeg', 'png'],
  maxBytes: 10_485_760,
  maxMegabytes: 10,
  accept: 'image/jpeg,image/png',
}

/** The accepted extensions as a readable list, e.g. "JPG, JPEG, PNG". */
export function formatFileExtensions(policy: FilePolicy) {
  return policy.extensions
    .map((extension) => extension.toUpperCase())
    .join(', ')
}

/** Why a chosen file was refused; the caller turns it into a message. */
export type FileRejection = 'too-large' | 'type-not-allowed'

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
 * Checks a picked file against a policy, in the order the request would
 * fail: the size limit is applied while the API parses the body, so it comes
 * before the extension. Returns `null` when the file is acceptable. Exactly
 * the limit is accepted, as on the server.
 */
export function checkFile(
  file: File,
  policy: FilePolicy
): FileRejection | null {
  if (file.size > policy.maxBytes) {
    return 'too-large'
  }

  const extension = getFileExtension(file.name)

  if (!extension || !policy.extensions.includes(extension)) {
    return 'type-not-allowed'
  }

  return null
}
