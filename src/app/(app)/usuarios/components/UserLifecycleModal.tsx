import { useTranslations } from 'next-intl'

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'

import type { RuntimeUser, UserLifecycleAction } from './types'

const copyKeys = {
  inactivate: {
    title: 'inactivateTitle',
    question: 'inactivateQuestion',
    description: 'inactivateDescription',
    pending: 'inactivating',
    color: 'error',
  },
  reactivate: {
    title: 'reactivateTitle',
    question: 'reactivateQuestion',
    description: 'reactivateDescription',
    pending: 'reactivating',
    color: 'primary',
  },
} as const

interface UserLifecycleModalProps {
  user?: RuntimeUser | null
  action: UserLifecycleAction
  isSubmitting: boolean
  errorMessage?: string | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function UserLifecycleModal({
  user,
  action,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: UserLifecycleModalProps) {
  const t = useTranslations('users.lifecycle')
  const tu = useTranslations('users')
  const tc = useTranslations('common')

  if (!user) {
    return null
  }

  const keys = copyKeys[action]

  return (
    <>
      <ModalOverlay onClick={isSubmitting ? undefined : onCancel} />
      <ModalContent
        className="max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-lifecycle-title"
      >
        <ModalHeader>
          <ModalTitle id="user-lifecycle-title">{t(keys.title)}</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            {t.rich(keys.question, {
              name: user.name,
              strong: (chunks) => (
                <span className="font-bold text-on-surface">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-sm text-on-surface-variant">
            {t(keys.description)}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error"
            >
              {errorMessage}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            color="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {tc('cancel')}
          </Button>
          <Button
            type="button"
            color={keys.color}
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? t(keys.pending) : tu(action)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  )
}
