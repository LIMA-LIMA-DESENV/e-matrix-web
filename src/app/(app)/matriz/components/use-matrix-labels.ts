import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import type { MatrixValueLabels } from './columns'

/** The translated labels of the list values (R-8), stable per language. */
export function useMatrixValueLabels(): MatrixValueLabels {
  const t = useTranslations('matrix.values')

  return useMemo(
    () => ({
      riskLevel: (value) => t(`riskLevel.${value}`),
      projectStatus: (value) => t(`projectStatus.${value}`),
    }),
    [t]
  )
}
