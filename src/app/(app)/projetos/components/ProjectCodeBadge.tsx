import { HighlightText } from '@/components/list'
import { Badge } from '@/components/ui'

interface ProjectCodeBadgeProps {
  /** `RGP-n`, `RGA-n` or `RA-n`, as the API derives it. */
  code: string
  /** Highlights the matched part when the code was searched. */
  search?: string
}

/**
 * The readable code of a record (R-5), searchable like any other column.
 * Neutral, so the search highlight (primary text) stays legible on it.
 */
export function ProjectCodeBadge({ code, search = '' }: ProjectCodeBadgeProps) {
  return (
    <Badge
      color="neutral"
      className="whitespace-nowrap font-bold text-ematrix-dark"
    >
      {/* One flex item, so the badge's gap does not split the highlight. */}
      <span>
        <HighlightText text={code} search={search} />
      </span>
    </Badge>
  )
}
