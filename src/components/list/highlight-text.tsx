import { foldText, normalizeText } from './list-utils'

interface HighlightTextProps {
  text?: string | null
  search: string
}

/**
 * Builds the normalized text plus, for each normalized char, the index of
 * the original char it came from. Lets matches found on the normalized text
 * be highlighted on the original one.
 */
function buildNormalizedIndex(text: string) {
  let normalized = ''
  const sourceIndex: number[] = []
  let offset = 0

  for (const char of text) {
    const piece = foldText(char)

    for (let i = 0; i < piece.length; i += 1) sourceIndex.push(offset)
    normalized += piece
    offset += char.length
  }

  return { normalized, sourceIndex }
}

/**
 * Highlights every occurrence of `search` inside `text`, ignoring case and
 * accents.
 */
export function HighlightText({ text, search }: HighlightTextProps) {
  if (!text) return null

  const term = normalizeText(search)
  if (!term) return <>{text}</>

  const { normalized, sourceIndex } = buildNormalizedIndex(text)
  const parts: { text: string; match: boolean; key: number }[] = []
  let cursor = 0
  let found = normalized.indexOf(term)

  while (found >= 0) {
    const start = sourceIndex[found]
    const lastIndex = found + term.length
    const end =
      lastIndex < sourceIndex.length ? sourceIndex[lastIndex] : text.length

    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), match: false, key: cursor })
    }
    parts.push({ text: text.slice(start, end), match: true, key: start })
    cursor = end
    found = normalized.indexOf(term, lastIndex)
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false, key: cursor })
  }

  return (
    <>
      {parts.map((part) =>
        part.match ? (
          <mark
            key={part.key}
            className="rounded bg-primary/10 px-0.5 font-bold text-primary"
          >
            {part.text}
          </mark>
        ) : (
          <span key={part.key}>{part.text}</span>
        )
      )}
    </>
  )
}
