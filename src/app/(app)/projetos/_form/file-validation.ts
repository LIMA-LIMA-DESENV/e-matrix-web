/**
 * Client-side mirror of the API's attachment policies, with the same constants
 * as `server/src/modules/projects/constants.ts`. It exists only to refuse a
 * file before wasting an upload: **the server is the authority**, and
 * anything this check lets through — an empty file, a name longer than 255
 * characters, a `.png` that is not an image — is still rejected there, with a
 * translated message.
 */

/** What a file field of the projects forms accepts. */
export interface ProjectFilePolicy {
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
 * The before and after photos of an RGP/RGA (R-15, FR-007): JPEG and PNG of
 * up to 10 MB, with no pixel limit, so a phone photo goes in as it is. The
 * `accept` lists the MIME types (RK-3), which is what makes a phone offer its
 * camera roll; a HEIC picked anyway is refused by the extension below.
 */
export const PROJECT_PHOTO_POLICY: ProjectFilePolicy = {
  extensions: ['jpg', 'jpeg', 'png'],
  maxBytes: 10_485_760,
  maxMegabytes: 10,
  accept: 'image/jpeg,image/png',
}

/**
 * The receipt form of an RA (R-16, FR-020): the legacy types — Word,
 * PowerPoint and PDF — of up to 25 MB. The `accept` lists the extensions and
 * the legacy MIME types, so the picker offers them on every platform.
 */
export const MATERIAL_RECEIPT_FILE_POLICY: ProjectFilePolicy = {
  extensions: ['doc', 'docx', 'ppt', 'pptx', 'pdf'],
  maxBytes: 26_214_400,
  maxMegabytes: 25,
  accept: [
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
  ].join(','),
}

/** The accepted extensions as a readable list, e.g. "JPG, JPEG, PNG". */
export function formatProjectFileExtensions(policy: ProjectFilePolicy) {
  return policy.extensions
    .map((extension) => extension.toUpperCase())
    .join(', ')
}

/** Why a chosen file was refused; the caller turns it into a message. */
export type ProjectFileRejection = 'too-large' | 'type-not-allowed'

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
export function validateProjectFile(
  file: File,
  policy: ProjectFilePolicy
): ProjectFileRejection | null {
  if (file.size > policy.maxBytes) {
    return 'too-large'
  }

  const extension = getFileExtension(file.name)

  if (!extension || !policy.extensions.includes(extension)) {
    return 'type-not-allowed'
  }

  return null
}
