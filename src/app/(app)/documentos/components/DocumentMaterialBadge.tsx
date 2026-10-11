import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { Badge } from '@/components/ui'
import { DocumentMaterial } from '@/http/api'

const materialStyle: Record<
  DocumentMaterial,
  { color: 'primary' | 'outline'; icon: string }
> = {
  [DocumentMaterial['e-social']]: { color: 'primary', icon: 'table_view' },
  [DocumentMaterial.docs]: { color: 'outline', icon: 'folder' },
}

/**
 * Translated material label. The search and the material column use it too,
 * so the listing reads and orders in the user's language.
 */
export function useDocumentMaterialLabel() {
  const t = useTranslations('documents.materials')

  return useCallback((material: DocumentMaterial) => t(material), [t])
}

export function DocumentMaterialBadge({
  material,
}: {
  material: DocumentMaterial
}) {
  const materialLabel = useDocumentMaterialLabel()
  const style = materialStyle[material]

  return (
    <Badge color={style.color}>
      <span className="material-symbols-outlined text-sm" aria-hidden>
        {style.icon}
      </span>
      {materialLabel(material)}
    </Badge>
  )
}
