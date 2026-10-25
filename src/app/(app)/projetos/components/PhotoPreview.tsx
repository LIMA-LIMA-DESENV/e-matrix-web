'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import type { ImprovementProject } from '@/http/api'
import {
  fetchImprovementProjectPhoto,
  type ImprovementProjectPhotoKey,
} from '@/lib/download-file'

interface PhotoPreviewProps {
  record: ImprovementProject
  photo: ImprovementProjectPhotoKey
  /** Accessible name of the image. */
  alt: string
}

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'unavailable' }

/**
 * Thumbnail of a photo, loaded through the authenticated download as a `Blob`
 * and shown from an object URL (FR-037, §11): the photos have no URL of their
 * own. The object URL is revoked when the preview unmounts, which happens when
 * the detail closes or shows another record (render it with a `key` per record
 * and photo). The browser applies the EXIF orientation of an `<img>` on its
 * own, so a portrait phone photo shows upright.
 */
export function PhotoPreview({ record, photo, alt }: PhotoPreviewProps) {
  const t = useTranslations('projects.details')
  const [state, setState] = useState<PreviewState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    let url: string | null = null

    fetchImprovementProjectPhoto(record, photo, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return
        if (!blob) {
          setState({ status: 'unavailable' })
          return
        }

        url = URL.createObjectURL(blob)
        setState({ status: 'ready', url })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'unavailable' })
      })

    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [record, photo])

  if (state.status === 'ready') {
    return (
      // biome-ignore lint/performance/noImgElement: a `blob:` URL from memory, which `next/image` cannot optimize.
      <img
        src={state.url}
        alt={alt}
        className="h-40 w-full rounded-lg bg-surface-container-low object-contain"
      />
    )
  }

  return (
    <div
      role={state.status === 'loading' ? 'status' : undefined}
      className="flex h-40 w-full items-center justify-center rounded-lg bg-surface-container-low px-4 text-center text-xs font-medium text-on-surface-variant"
    >
      {state.status === 'loading' ? t('photoLoading') : t('photoUnavailable')}
    </div>
  )
}
