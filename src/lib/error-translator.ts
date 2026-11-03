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
  'Activity code is required.': 'activityCodeRequired',
  'Activity code is too long.': 'activityCodeTooLong',
  'Activity name is required.': 'activityNameRequired',
  'Activity name is too long.': 'activityNameTooLong',
  'Activity fabric is required.': 'activityFabricRequired',
  'Activity fabric is too long.': 'activityFabricTooLong',
  'Activity line is required.': 'activityLineRequired',
  'Activity line is too long.': 'activityLineTooLong',
  'Activity area is required.': 'activityAreaRequired',
  'Activity area is too long.': 'activityAreaTooLong',
  'Activity function is required.': 'activityFunctionRequired',
  'Activity function is too long.': 'activityFunctionTooLong',
  'Activity code already exists.': 'activityCodeTaken',
  'Activity not found.': 'activityNotFound',
  'Activity has linked records.': 'activityHasLinkedRecords',
  'Invalid document material.': 'documentMaterialInvalid',
  'Document name is required.': 'documentNameRequired',
  'Document name is too long.': 'documentNameTooLong',
  'Document responsible is required.': 'documentResponsibleRequired',
  'Document responsible is too long.': 'documentResponsibleTooLong',
  'Invalid document date.': 'documentDateInvalid',
  'Document file type not allowed.': 'documentFileTypeNotAllowed',
  'Document file is empty.': 'documentFileEmpty',
  'Document file name is too long.': 'documentFileNameTooLong',
  'Only one file is allowed.': 'documentFileSingle',
  'Document file exceeds the 25 MB limit.': 'documentFileTooLarge',
  'Document not found.': 'documentNotFound',
  'Document file not found.': 'documentFileNotFound',
  'Document file is unavailable.': 'documentFileUnavailable',
  'E-Social template is unavailable.': 'documentTemplateUnavailable',
  'Invalid training content.': 'trainingContentInvalid',
  'Training name is required.': 'trainingNameRequired',
  'Training name is too long.': 'trainingNameTooLong',
  'Training responsible is required.': 'trainingResponsibleRequired',
  'Training responsible is too long.': 'trainingResponsibleTooLong',
  'Invalid training date.': 'trainingDateInvalid',
  'Training date must fall within a registered period.':
    'trainingDateOutsidePeriods',
  'Training subject is required.': 'trainingSubjectRequired',
  'Training subject is too long.': 'trainingSubjectTooLong',
  'Training status is required.': 'trainingStatusRequired',
  'Training status is too long.': 'trainingStatusTooLong',
  'Training file type not allowed.': 'trainingFileTypeNotAllowed',
  'Training file is empty.': 'trainingFileEmpty',
  'Training file name is too long.': 'trainingFileNameTooLong',
  'Training file exceeds the 25 MB limit.': 'trainingFileTooLarge',
  'Training not found.': 'trainingNotFound',
  'Training file not found.': 'trainingFileNotFound',
  'Training file is unavailable.': 'trainingFileUnavailable',
  'Training template not found.': 'trainingTemplateNotFound',
  'Training template is unavailable.': 'trainingTemplateUnavailable',
  'Invalid meeting type.': 'meetingTypeInvalid',
  'Meeting name is required.': 'meetingNameRequired',
  'Meeting name is too long.': 'meetingNameTooLong',
  'Meeting responsible is required.': 'meetingResponsibleRequired',
  'Meeting responsible is too long.': 'meetingResponsibleTooLong',
  'Invalid meeting date.': 'meetingDateInvalid',
  'Meeting date must fall within a registered period.':
    'meetingDateOutsidePeriods',
  'Meeting subject is required.': 'meetingSubjectRequired',
  'Meeting subject is too long.': 'meetingSubjectTooLong',
  'Meeting status is required.': 'meetingStatusRequired',
  'Meeting status is too long.': 'meetingStatusTooLong',
  'Meeting file type not allowed.': 'meetingFileTypeNotAllowed',
  'Meeting file is empty.': 'meetingFileEmpty',
  'Meeting file name is too long.': 'meetingFileNameTooLong',
  'Meeting file exceeds the 25 MB limit.': 'meetingFileTooLarge',
  'Only one file per field is allowed.': 'onlyOneFilePerField',
  'Meeting not found.': 'meetingNotFound',
  'Meeting file not found.': 'meetingFileNotFound',
  'Meeting file is unavailable.': 'meetingFileUnavailable',
  'Meeting template not found.': 'meetingTemplateNotFound',
  'Meeting template is unavailable.': 'meetingTemplateUnavailable',
  'Management plan cell not found.': 'managementPlanCellNotFound',
  'Invalid management plan cell state.': 'managementPlanCellStateInvalid',
  'Management plan cell cannot be green before the previous levels.':
    'managementPlanCellGreenBeforePreviousLevels',
  'Management plan goal must be an integer from 0 to 16.':
    'managementPlanGoalInvalid',
  // 'Only one file is allowed.' is the generic upload message, mapped above.
  'Invalid program type.': 'programTypeInvalid',
  'Program question is required.': 'programQuestionRequired',
  'Program question is too long.': 'programQuestionTooLong',
  'Program description is required.': 'programDescriptionRequired',
  'Program description is too long.': 'programDescriptionTooLong',
  'Program actions are required.': 'programActionsRequired',
  'Program actions are too long.': 'programActionsTooLong',
  'Program responsible is required.': 'programResponsibleRequired',
  'Program responsible is too long.': 'programResponsibleTooLong',
  'Invalid program target date.': 'programTargetDateInvalid',
  'Invalid program completed percentage.': 'programCompletedPercentageInvalid',
  'Program file type not allowed.': 'programFileTypeNotAllowed',
  'Program file is empty.': 'programFileEmpty',
  'Program file name is too long.': 'programFileNameTooLong',
  'Program file exceeds the 25 MB limit.': 'programFileTooLarge',
  'Program not found.': 'programNotFound',
  'Program file not found.': 'programFileNotFound',
  'Program file is unavailable.': 'programFileUnavailable',
  'Program material not found.': 'programMaterialNotFound',
  'Program material is unavailable.': 'programMaterialUnavailable',
  'Invalid improvement project scope.': 'improvementProjectScopeInvalid',
  'Improvement project activity is required.':
    'improvementProjectActivityRequired',
  'Improvement project activity not found.':
    'improvementProjectActivityNotFound',
  'Invalid improvement project date.': 'improvementProjectDateInvalid',
  'Improvement project concern is required.':
    'improvementProjectConcernRequired',
  'Improvement project concern is too long.':
    'improvementProjectConcernTooLong',
  'Improvement project recommendation is required.':
    'improvementProjectRecommendationRequired',
  'Improvement project recommendation is too long.':
    'improvementProjectRecommendationTooLong',
  'Improvement project priority is required.':
    'improvementProjectPriorityRequired',
  'Improvement project priority is too long.':
    'improvementProjectPriorityTooLong',
  'Improvement project date must fall within a registered period.':
    'improvementProjectDateOutsidePeriods',
  'Improvement project photo type not allowed.':
    'improvementProjectPhotoTypeNotAllowed',
  'Improvement project photo is empty.': 'improvementProjectPhotoEmpty',
  'Improvement project photo name is too long.':
    'improvementProjectPhotoNameTooLong',
  'Improvement project photo exceeds the 10 MB limit.':
    'improvementProjectPhotoTooLarge',
  // 'Only one file per field is allowed.' is shared with meetings, above.
  'Improvement project not found.': 'improvementProjectNotFound',
  'Improvement project photo not found.': 'improvementProjectPhotoNotFound',
  'Improvement project photo is unavailable.':
    'improvementProjectPhotoUnavailable',
  'Improvement project template not found.':
    'improvementProjectTemplateNotFound',
  'Improvement project template is unavailable.':
    'improvementProjectTemplateUnavailable',
  'Material receipt employee is required.': 'materialReceiptEmployeeRequired',
  'Material receipt employee is too long.': 'materialReceiptEmployeeTooLong',
  'Material receipt employee registry is required.':
    'materialReceiptEmployeeRegistryRequired',
  'Material receipt employee registry is too long.':
    'materialReceiptEmployeeRegistryTooLong',
  'Invalid material receipt date.': 'materialReceiptDateInvalid',
  'Material receipt date must fall within a registered period.':
    'materialReceiptDateOutsidePeriods',
  'Material receipt file type not allowed.':
    'materialReceiptFileTypeNotAllowed',
  'Material receipt file is empty.': 'materialReceiptFileEmpty',
  'Material receipt file name is too long.': 'materialReceiptFileNameTooLong',
  'Material receipt file exceeds the 25 MB limit.':
    'materialReceiptFileTooLarge',
  // 'Only one file is allowed.' is the generic upload message, mapped above.
  'Material receipt not found.': 'materialReceiptNotFound',
  'Material receipt file not found.': 'materialReceiptFileNotFound',
  'Material receipt file is unavailable.': 'materialReceiptFileUnavailable',
  'Material receipt template not found.': 'materialReceiptTemplateNotFound',
  'Material receipt template is unavailable.':
    'materialReceiptTemplateUnavailable',
  // 'Period not found.' is shared with periods, above.
  'Matrix field not found.': 'matrixFieldNotFound',
  'Invalid matrix field value.': 'matrixFieldValueInvalid',
  'Matrix field value exceeds 5,000 characters.': 'matrixFieldValueTooLong',
  'Invalid matrix copy source.': 'matrixCopySourceInvalid',
  'Matrix already initialized.': 'matrixAlreadyInitialized',
  'Matrix copy source has changed.': 'matrixCopySourceChanged',
  'Matrix not initialized.': 'matrixNotInitialized',
  'Matrix activity not found.': 'matrixActivityNotFound',
  'Evaluation type not available.': 'evaluationTypeNotAvailable',
  'Hit list not found.': 'hitListNotFound',
  'Checklist not found.': 'checklistNotFound',
  'Hit list activity is required.': 'hitListActivityRequired',
  'Hit list activity not found.': 'hitListActivityNotFound',
  'Invalid hit list assessment date.': 'hitListAssessmentDateInvalid',
  'Invalid hit list answers.': 'hitListAnswersInvalid',
  'Checklist activity is required.': 'checklistActivityRequired',
  'Checklist activity not found.': 'checklistActivityNotFound',
  'Checklist name is required.': 'checklistNameRequired',
  'Checklist name is too long.': 'checklistNameTooLong',
  'Checklist sector is required.': 'checklistSectorRequired',
  'Checklist sector is too long.': 'checklistSectorTooLong',
  'Invalid checklist date.': 'checklistDateInvalid',
  'Invalid checklist answers.': 'checklistAnswersInvalid',
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
