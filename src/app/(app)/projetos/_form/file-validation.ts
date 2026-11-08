/**
 * The projects' own attachment policy, over the shared mirror of
 * `@/lib/file-policy` (the photos use its `PHOTO_POLICY`), with the same
 * constants as `server/src/modules/projects/constants.ts`. **The server is
 * the authority**: this only refuses a file before wasting an upload.
 */
import type { FilePolicy } from '@/lib/file-policy'

/**
 * The receipt form of an RA (R-16, FR-020): the legacy types — Word,
 * PowerPoint and PDF — of up to 25 MB. The `accept` lists the extensions and
 * the legacy MIME types, so the picker offers them on every platform.
 */
export const MATERIAL_RECEIPT_FILE_POLICY: FilePolicy = {
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
