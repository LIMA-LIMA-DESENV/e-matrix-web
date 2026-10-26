import type { ExportTable } from './table'

/**
 * The table as an `.xlsx` file with one sheet, the header first, every cell
 * of type string, so nothing is read as a number, a date or a formula (H-6),
 * and no formatting (FR-025). `write-excel-file` is loaded with `import()`
 * here, so it stays in its own chunk and is downloaded only when the user
 * asks for Excel (NFR-007).
 */
export async function buildXlsx(
  { header, rows }: ExportTable,
  sheetName: string
): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const sheetData = [header, ...rows].map((cells) =>
    cells.map((value) =>
      value === null ? null : { type: String, value: value }
    )
  )

  return writeXlsxFile(sheetData, { sheet: sheetName }).toBlob()
}
