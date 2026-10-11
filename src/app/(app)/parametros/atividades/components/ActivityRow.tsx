import {
  HighlightText,
  RowActionsMenu,
  type RowActionsMenuProps,
} from '@/components/list'
import { TableCell, TableRow } from '@/components/ui'
import type { Activity } from '@/http/api'

interface ActivityRowProps {
  activity: Activity
  search: string
  actions: RowActionsMenuProps
  onEdit: (activity: Activity) => void
}

const cellClasses = 'px-6 py-5 text-sm font-medium text-on-surface-variant'

export function ActivityRow({
  activity,
  search,
  actions,
  onEdit,
}: ActivityRowProps) {
  return (
    <TableRow
      className="group cursor-pointer border-none transition-colors hover:bg-surface-container-low"
      onClick={() => onEdit(activity)}
    >
      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={activity.code} search={search} />
        </span>
      </TableCell>

      <TableCell className="px-6 py-5">
        <span className="text-sm font-bold text-ematrix-dark">
          <HighlightText text={activity.name} search={search} />
        </span>
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={activity.fabric} search={search} />
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={activity.line} search={search} />
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={activity.area} search={search} />
      </TableCell>

      <TableCell className={cellClasses}>
        <HighlightText text={activity.function} search={search} />
      </TableCell>

      <TableCell className="px-6 py-5">
        <RowActionsMenu {...actions} />
      </TableCell>
    </TableRow>
  )
}
