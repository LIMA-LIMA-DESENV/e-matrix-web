import { useTranslations } from 'next-intl'

import {
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'

import type { MatrixExportFormat } from './use-matrix-export'

interface ExportMenuProps {
  /** The file being generated, if any; both formats wait for it. */
  generating: MatrixExportFormat | null
  onExport: (format: MatrixExportFormat) => void
}

const FORMATS: readonly MatrixExportFormat[] = ['csv', 'xlsx']

/**
 * "Exportar", with CSV and Excel (J6). While a file is generated the trigger
 * says so and both options are disabled.
 */
export function ExportMenu({ generating, onExport }: ExportMenuProps) {
  const t = useTranslations('matrix.export')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: 'outline',
          color: 'primary',
          size: 'lg',
          className: 'px-5',
        })}
      >
        <span
          className={`material-symbols-outlined text-lg ${
            generating ? 'animate-spin' : ''
          }`}
          aria-hidden
        >
          {generating ? 'progress_activity' : 'download'}
        </span>
        {generating ? t('generating') : t('label')}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" aria-label={t('label')}>
        {FORMATS.map((format) => (
          <DropdownMenuItem
            key={format}
            disabled={generating !== null}
            onSelect={() => onExport(format)}
            className="gap-3"
          >
            <span
              className="material-symbols-outlined text-lg text-outline"
              aria-hidden
            >
              {format === 'csv' ? 'description' : 'table_view'}
            </span>
            {t(`formats.${format}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
