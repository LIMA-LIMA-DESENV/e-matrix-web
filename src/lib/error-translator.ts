'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import type messages from '../../messages/pt-BR.json'

type ErrorKey = keyof (typeof messages)['errors']

/**
 * The API answers with stable English messages; each one maps to a key of the
 * `errors` namespace, translated into the user's language. When the API adds
 * or changes a message, update this map and the three catalogs together.
 */
const API_ERROR_KEYS: Record<string, ErrorKey> = {
  'Email or password incorrect!': 'invalidCredentials',
  'Session expired due to inactivity': 'sessionExpired',
  'Refresh Token does not exists!': 'invalidRefreshToken',
  'Current password incorrect!': 'currentPasswordIncorrect',
  'Token invalid!': 'tokenInvalid',
  'Token expired!': 'tokenExpired',
  'User not found.': 'userNotFound',
  'User does not exist!': 'userDoesNotExist',
  'User already exists': 'userAlreadyExists',
  'User is already active.': 'userAlreadyActive',
  'User is already inactive.': 'userAlreadyInactive',
  'Admin cannot inactivate their own user.': 'cannotInactivateSelf',
  'Admin cannot remove their own admin profile.': 'cannotRemoveOwnAdmin',
  'At least one active admin is required.': 'lastActiveAdmin',
  'User name is required.': 'nameRequired',
  'Invalid email.': 'invalidEmail',
  'Invalid user role.': 'invalidRole',
  'User does not have the required role.': 'forbidden',
  'Period description is required.': 'periodDescriptionRequired',
  'Period description is too long.': 'periodDescriptionTooLong',
  'Invalid period start date.': 'periodStartDateInvalid',
  'Invalid period end date.': 'periodEndDateInvalid',
  'Period must last at least one day.': 'periodTooShort',
  'Period description already exists.': 'periodDescriptionTaken',
  'Period overlaps another period.': 'periodOverlaps',
  'Period not found.': 'periodNotFound',
  'Period has linked records.': 'periodHasLinkedRecords',
}

const STATUS_KEYS: Record<number, ErrorKey> = {
  400: 'status400',
  403: 'forbidden',
  404: 'status404',
  409: 'status409',
  422: 'status400',
  500: 'status500',
}

export function getErrorKey(error: unknown): ErrorKey {
  const err = error as Record<string, any> | null | undefined
  const apiMessage: string | undefined =
    err?.response?.data?.message || err?.message

  if (apiMessage && apiMessage in API_ERROR_KEYS) {
    return API_ERROR_KEYS[apiMessage]
  }

  const status: number | undefined = err?.status ?? err?.response?.status

  if (status && status in STATUS_KEYS) {
    return STATUS_KEYS[status]
  }

  return 'unexpected'
}

/** Returns a function that turns an API/fetch error into a translated text. */
export function useTranslateError() {
  const t = useTranslations('errors')

  return useCallback((error: unknown) => t(getErrorKey(error)), [t])
}
