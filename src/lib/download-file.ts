import {
  type Document,
  type ErgonomicWorkAnalysisAdvanced,
  getDocumentsIdFile,
  getDocumentsTemplatesESocial,
  getEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto,
  getImprovementProjectsIdFilesAttachment,
  getImprovementProjectsTemplatesTemplate,
  getMaterialReceiptsIdFile,
  getMaterialReceiptsTemplatesTemplate,
  getMeetingsIdFilesAttachment,
  getMeetingsTemplatesTemplate,
  getProgramsIdFile,
  getProgramsMaterialsMaterial,
  getTrainingsIdFile,
  getTrainingsTemplatesTemplate,
  type ImprovementProject,
  type MaterialReceipt,
  type Meeting,
  type Program,
  type ProgramMaterial,
  type Training,
} from '@/http/api'
import { FetchError } from '@/http/fetch-client'

/** Stable name the API serves the E-Social template under (FR-016). */
export const E_SOCIAL_TEMPLATE_FILE_NAME = 'modelo-e-social.xlsx'

/** The six keys of `GET /trainings/templates/{template}` (FR-019). */
export type TrainingTemplateKey = Parameters<
  typeof getTrainingsTemplatesTemplate
>[0]

/** Stable names the API serves the training templates under (§10, H-4). */
export const TRAINING_TEMPLATE_FILE_NAMES: Record<TrainingTemplateKey, string> =
  {
    producao: 'orientacoes-gerais-para-producao.pptx',
    escritorios: 'orientacoes-gerais-para-escritorios.pptx',
    'novos-funcionarios': 'orientacoes-para-novos-funcionarios.pptx',
    basico: 'treinamento-basico.pptx',
    avancado: 'treinamento-avancado.pptx',
    'presence-list': 'lista-de-presenca.docx',
  }

/** The two attachments of `/meetings/{id}/files/{attachment}` (D-5). */
export type MeetingAttachmentKey = Parameters<
  typeof getMeetingsIdFilesAttachment
>[1]

/** Field of the meeting record that describes each attachment. */
export const MEETING_ATTACHMENT_FIELDS = {
  'presence-list': 'presence_list',
  minutes: 'minutes',
} as const satisfies Record<MeetingAttachmentKey, keyof Meeting>

/** The two keys of `GET /meetings/templates/{template}` (FR-019). */
export type MeetingTemplateKey = Parameters<
  typeof getMeetingsTemplatesTemplate
>[0]

/** Stable names the API serves the meeting templates under (§10, H-3). */
export const MEETING_TEMPLATE_FILE_NAMES: Record<MeetingTemplateKey, string> = {
  minutes: 'ata-de-reunioes.docx',
  'presence-list': 'lista-de-presenca.docx',
}

/** Stable names the API serves the program materials under (§9, FR-012). */
export const PROGRAM_MATERIAL_FILE_NAMES: Record<ProgramMaterial, string> = {
  'material-specifications': 'especificacoes-materiais.docx',
  'ergonomics-procedure': 'procedimento-ergonomia.docx',
}

/** The two photos of `/improvement-projects/{id}/files/{attachment}` (§10). */
export type ImprovementProjectPhotoKey = Parameters<
  typeof getImprovementProjectsIdFilesAttachment
>[1]

/** Field of the project record that describes each photo. */
export const IMPROVEMENT_PROJECT_PHOTO_FIELDS = {
  'before-photo': 'before_photo',
  'after-photo': 'after_photo',
} as const satisfies Record<
  ImprovementProjectPhotoKey,
  keyof ImprovementProject
>

/** Stable name the API serves the effectiveness verification form under (§10). */
export const EFFECTIVENESS_VERIFICATION_FILE_NAME =
  'verificacao-de-eficacia.pdf'

/** Stable name the API serves the receiving materials form under (§10). */
export const RECEIVING_MATERIALS_FILE_NAME = 'recebimento-de-materiais.pdf'

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

/**
 * Downloads the attendance list of a training and saves it under the name it
 * was uploaded with, taken from the record (D-18, R-17).
 */
export async function downloadTrainingFile(record: Training) {
  if (!record.file) return

  const response = await getTrainingsIdFile(record.id)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, record.file.name)
}

/**
 * Downloads one of the six training templates: a content presentation or the
 * blank attendance list (FR-019, J6).
 */
export async function downloadTrainingTemplate(template: TrainingTemplateKey) {
  const response = await getTrainingsTemplatesTemplate(template)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, TRAINING_TEMPLATE_FILE_NAMES[template])
}

/**
 * Downloads one attachment of a meeting and saves it under the name it was
 * uploaded with, taken from the record (FR-027, R-15).
 */
export async function downloadMeetingFile(
  record: Meeting,
  attachment: MeetingAttachmentKey
) {
  const file = record[MEETING_ATTACHMENT_FIELDS[attachment]]
  if (!file) return

  const response = await getMeetingsIdFilesAttachment(record.id, attachment)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, file.name)
}

/**
 * Downloads one of the two meeting templates: the minutes model or the blank
 * attendance list (FR-019, J6).
 */
export async function downloadMeetingTemplate(template: MeetingTemplateKey) {
  const response = await getMeetingsTemplatesTemplate(template)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, MEETING_TEMPLATE_FILE_NAMES[template])
}

/**
 * Downloads the attachment of a program item and saves it under the name it
 * was uploaded with, taken from the record (FR-016, R-10).
 */
export async function downloadProgramFile(record: Program) {
  if (!record.file) return

  const response = await getProgramsIdFile(record.id)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, record.file.name)
}

/**
 * Downloads one of the two fixed materials of the "Procedimento e Materiais"
 * type (FR-012, R-13).
 */
export async function downloadProgramMaterial(material: ProgramMaterial) {
  const response = await getProgramsMaterialsMaterial(material)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, PROGRAM_MATERIAL_FILE_NAMES[material])
}

/**
 * Fetches one photo of a project register as a `Blob`, or `null` when the
 * record has none. The detail shows it from memory (FR-037): there is no URL
 * the browser could load it from on its own.
 */
export async function fetchImprovementProjectPhoto(
  record: ImprovementProject,
  photo: ImprovementProjectPhotoKey,
  signal?: AbortSignal
) {
  if (!record[IMPROVEMENT_PROJECT_PHOTO_FIELDS[photo]]) return null

  const response = await getImprovementProjectsIdFilesAttachment(
    record.id,
    photo,
    { signal }
  )

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  return response.data
}

/**
 * Fetches the sector photo of an Análise Ergonômica do Trabalho – Produção as
 * a `Blob`, or `null` when the record has none (FR-020). The view's
 * thumbnail, "Baixar foto" and the PDF read it on demand (NFR-007): there is
 * no URL the browser could load it from on its own.
 */
export async function fetchEvaluationPhoto(
  record: ErgonomicWorkAnalysisAdvanced,
  signal?: AbortSignal
) {
  if (!record.photo) return null

  const response = await getEvaluationsErgonomicWorkAnalysesAdvancedIdPhoto(
    record.id,
    { signal }
  )

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  return response.data
}

/**
 * Downloads one photo of a project register and saves it under the name it
 * was uploaded with, taken from the record (FR-039).
 */
export async function downloadImprovementProjectPhoto(
  record: ImprovementProject,
  photo: ImprovementProjectPhotoKey
) {
  const file = record[IMPROVEMENT_PROJECT_PHOTO_FIELDS[photo]]
  const blob = await fetchImprovementProjectPhoto(record, photo)
  if (!file || !blob) return

  saveBlobAsFile(blob, file.name)
}

/** Downloads the static effectiveness verification form (FR-039, J7). */
export async function downloadEffectivenessVerificationTemplate() {
  const response = await getImprovementProjectsTemplatesTemplate(
    'effectiveness-verification'
  )

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, EFFECTIVENESS_VERIFICATION_FILE_NAME)
}

/**
 * Downloads the receipt form of a material receipt and saves it under the
 * name it was uploaded with, taken from the record (FR-039, R-17).
 */
export async function downloadMaterialReceiptFile(record: MaterialReceipt) {
  if (!record.file) return

  const response = await getMaterialReceiptsIdFile(record.id)

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, record.file.name)
}

/** Downloads the static receiving materials form (FR-039, J7). */
export async function downloadReceivingMaterialsTemplate() {
  const response = await getMaterialReceiptsTemplatesTemplate(
    'receiving-materials'
  )

  if (response.status !== 200) {
    throw toFetchError(response.status, response.data)
  }

  saveBlobAsFile(response.data, RECEIVING_MATERIALS_FILE_NAME)
}
