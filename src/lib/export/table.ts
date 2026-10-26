/**
 * A table as the screen shows it, passed to the exporters: the translated
 * column labels and, for each row, the values already formatted for display,
 * in the same order. `null` is an empty cell.
 */
export interface ExportTable {
  header: string[]
  rows: (string | null)[][]
}

// Characters Windows, macOS or Linux refuse in a file name, plus the
// control characters.
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what is being removed
const INVALID_FILE_NAME_CHARACTERS = /[\u0000-\u001f\u007f\\/:*?"<>|]+/g

/**
 * Builds `<base>-<detail>.<extension>`, with each run of characters that are
 * invalid in a file name turned into a `-`, and without the leading and
 * trailing dots, spaces and dashes Windows trims or refuses. An empty detail
 * leaves `<base>.<extension>`.
 */
export function toExportFileName(
  base: string,
  detail: string,
  extension: string
) {
  const safeDetail = detail
    .replace(INVALID_FILE_NAME_CHARACTERS, '-')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')

  return `${safeDetail ? `${base}-${safeDetail}` : base}.${extension}`
}
