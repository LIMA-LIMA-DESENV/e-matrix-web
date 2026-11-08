'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Input, inputVariants } from '@/components/ui'
import type { RiskFactorKey } from '../components/risk-factor-board'
import type { EvaluationFormProps } from '../definitions/types'
import {
  ActivityField,
  EvaluationFormLayout,
  Field,
  inputClasses,
  Section,
  TextField,
  textareaClasses,
  useGuardedSubmit,
} from './form-parts'
import { RiskFactorBoard } from './RiskFactorBoard'
import {
  makeRiskFactorSchema,
  type RiskFactorFormData,
  type RiskFactorFormInput,
  type RiskFactorFormValues,
  riskFactorFormDefaultValues,
  type Translate,
  toRiskFactorFormInput,
} from './schema'

/**
 * Create, edit and view form of an Identificação de Riscos (J1 to J3,
 * FR-018), in one react-hook-form instance and three sections (H-8): the
 * identification (date, activity and valuer, all required, and, in the view
 * only, the current area and fabric of the activity, R-6), the risk factor
 * board with its 39 independent marks (R-8, none required), and the
 * conclusion (the notes, several lines, and the total of risk factors typed
 * in the user's number format, both required). A failed send keeps every
 * field and mark. The deletion is not here: it lives on the listing.
 */
export function RiskFactorForm({
  code,
  initialValues,
  readOnly = false,
  activities,
  listHref,
  headerActions,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: EvaluationFormProps<RiskFactorFormValues>) {
  const t = useTranslations('evaluations')
  const tv = useTranslations('evaluations.validation')
  const locale = useLocale()
  const format = useFormatter()

  const schema = useMemo(
    // The schema takes plain keys; next-intl's typed `t` checks them here.
    () => makeRiskFactorSchema(tv as unknown as Translate, locale),
    [tv, locale]
  )

  // The total in the user's number format, as it was saved.
  const toControlValues = useCallback(
    (values: RiskFactorFormValues) =>
      toRiskFactorFormInput(values, (value) =>
        format.number(value, { maximumFractionDigits: 20 })
      ),
    [format]
  )

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<RiskFactorFormInput, unknown, RiskFactorFormData>({
    resolver: zodResolver(schema),
    defaultValues: toControlValues(
      initialValues ?? riskFactorFormDefaultValues()
    ),
  })

  useEffect(() => {
    if (initialValues) reset(toControlValues(initialValues))
  }, [initialValues, reset, toControlValues])

  // A native select can only show a value it has an option for: when the
  // options arrive after the value (edit, or a retried load), the value is
  // applied again so the select shows the record's activity.
  const { options: activityOptions } = activities
  useEffect(() => {
    if (activityOptions.length === 0) return
    setValue('activity_id', getValues('activity_id'))
  }, [activityOptions, getValues, setValue])

  const isCreate = !code
  const typeLabel = t('types.risk_factor')
  // Without the activity list nothing valid can be chosen, so saving waits
  // for it, and a failed load blocks it (§12).
  const isActivitiesReady = !activities.isLoading && !activities.isError
  const { handleValid, isSaved } = useGuardedSubmit<RiskFactorFormValues>({
    readOnly,
    isReady: isActivitiesReady,
    onSubmit,
  })
  const isLocked = readOnly || isSubmitting || isSaved

  function description() {
    if (readOnly) return t('form.viewDescription', { type: typeLabel })
    return isCreate
      ? t('riskFactorForm.newDescription', { type: typeLabel })
      : t('riskFactorForm.editDescription', { type: typeLabel })
  }

  return (
    <EvaluationFormLayout
      typeLabel={typeLabel}
      title={code ?? t('newRiskFactor')}
      description={description()}
      readOnly={readOnly}
      isLocked={isLocked}
      isCreate={isCreate}
      isBusy={isSubmitting || isSaved}
      submitDisabled={isSubmitting || isSaved || !isActivitiesReady}
      listHref={listHref}
      headerActions={headerActions}
      errorMessage={errorMessage}
      onSubmit={handleSubmit(handleValid)}
    >
      <Section title={t('riskFactorForm.sections.identification')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label={t('pdf.riskFactor.fields.date')}
            htmlFor="date"
            error={errors.date?.message}
          >
            {/* Calendar day: sent as typed, never through Date. */}
            <Input
              id="date"
              type="date"
              aria-invalid={errors.date ? true : undefined}
              className={inputClasses}
              {...register('date')}
            />
          </Field>

          <ActivityField
            activities={activities}
            readOnly={readOnly}
            error={errors.activity_id?.message}
            registration={register('activity_id')}
          />

          <TextField
            id="valuer"
            label={t('pdf.riskFactor.fields.valuer')}
            registration={register('valuer')}
            error={errors.valuer?.message}
          />

          {/* The current area and fabric of the activity, only to read: the
              view shows them; they are never sent. */}
          {readOnly && (
            <>
              <TextField
                id="location_area"
                label={t('pdf.riskFactor.fields.area')}
                registration={register('location.area')}
              />
              <TextField
                id="location_fabric"
                label={t('pdf.riskFactor.fields.fabric')}
                registration={register('location.fabric')}
              />
            </>
          )}
        </div>
      </Section>

      <Section
        title={t('riskFactorForm.sections.riskFactors')}
        description={
          readOnly ? undefined : t('riskFactorForm.riskFactorsDescription')
        }
      >
        <Controller
          control={control}
          name="marks"
          render={({ field }) => (
            <RiskFactorBoard
              aria-label={t('riskFactorForm.sections.riskFactors')}
              value={field.value}
              onToggle={(key: RiskFactorKey) =>
                field.onChange({ ...field.value, [key]: !field.value[key] })
              }
            />
          )}
        />
      </Section>

      <Section title={t('riskFactorForm.sections.conclusion')}>
        <Field
          label={t('pdf.riskFactor.fields.notes')}
          htmlFor="notes"
          error={errors.notes?.message}
        >
          <textarea
            id="notes"
            rows={5}
            aria-invalid={errors.notes ? true : undefined}
            className={inputVariants({ className: textareaClasses })}
            {...register('notes')}
          />
        </Field>

        <Field
          label={t('pdf.riskFactor.fields.total')}
          htmlFor="total"
          error={errors.total?.message}
          help={readOnly ? undefined : t('riskFactorForm.totalHint')}
          className="space-y-2 md:max-w-xs"
        >
          <Input
            id="total"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errors.total ? true : undefined}
            className={inputClasses}
            {...register('total')}
          />
        </Field>
      </Section>
    </EvaluationFormLayout>
  )
}
