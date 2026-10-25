/** Longest side of a photo once it is in the PDF (NFR-013). */
const MAX_PHOTO_SIDE = 2000

/** JPEG quality of a photo once it is in the PDF (NFR-013). */
const PHOTO_QUALITY = 0.85

/**
 * A photo ready for the PDF: JPEG bytes at most `MAX_PHOTO_SIDE` pixels on
 * the longest side, with its size in pixels for the aspect ratio. A photo
 * that could not be decoded is `unavailable`, so the PDF shows a notice in
 * its cell instead of failing (D-12).
 */
export type PdfPhoto =
  | { status: 'ready'; data: Uint8Array; width: number; height: number }
  | { status: 'unavailable' }

export const UNAVAILABLE_PHOTO: PdfPhoto = { status: 'unavailable' }

/**
 * Decodes a photo with its EXIF orientation applied, scales it down so a
 * 10 MB phone photo does not make a PDF of tens of MB, and re-encodes it as
 * JPEG. A PNG is drawn over white, since JPEG has no transparency.
 */
export async function loadPdfPhoto(blob: Blob): Promise<PdfPhoto> {
  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })

    const scale = Math.min(
      1,
      MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height)
    )
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return UNAVAILABLE_PHOTO

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)

    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY)
    )
    if (!jpeg) return UNAVAILABLE_PHOTO

    return {
      status: 'ready',
      data: new Uint8Array(await jpeg.arrayBuffer()),
      width,
      height,
    }
  } catch {
    // A renamed file or an unexpected format does not decode as an image.
    return UNAVAILABLE_PHOTO
  } finally {
    bitmap?.close()
  }
}
