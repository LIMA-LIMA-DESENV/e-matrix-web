import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import type { ProgramMaterial, ProgramType } from '@/http/api'

/** Translated title of one of the five fixed fronts (R-2, FR-002). */
export function useProgramTypeLabel() {
  const t = useTranslations('programs.types')

  return useCallback((type: ProgramType) => t(type), [t])
}

/** Translated name of a fixed material (R-13, FR-011). */
export function useProgramMaterialLabel() {
  const t = useTranslations('programs.materials')

  return useCallback((material: ProgramMaterial) => t(material), [t])
}
