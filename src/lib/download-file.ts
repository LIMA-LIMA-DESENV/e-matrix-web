import {
  type Document,
  getDocumentsIdFile,
  getDocumentsTemplatesESocial,
  getTrainingsIdFile,
  getTrainingsTemplatesTemplate,
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
