/**
 * The Avaliação Cinesiofuncional (`functional_cinesio_assessment`, ACF): the
 * web's single source of its answers, of the sections and groups of the report,
 * of the reference tests of each segment and of the age, shared by the form, the
 * schema and the PDF (FR-017, D-8). No React.
 */

import type { FunctionalCinesioAssessmentAnswers } from '@/http/api'

/**
 * - `mark`: an independent mark, `true` when marked (D-3);
 * - `exclusive`: a Sim/Não or Adequado/Abaixo, `true`, `false` or no answer (D-6);
 * - `number`: at least zero, decimals allowed;
 * - `integer`: the pain intensity, an integer from 0 to 10;
 * - `shortText`: one line of up to 255 code points;
 * - `longText`: plain text with line breaks, up to 5,000 code points;
 * - `select`: one of the fixed values of the API.
 */
export type FunctionalCinesioAssessmentAnswerKind =
  | 'mark'
  | 'exclusive'
  | 'number'
  | 'integer'
  | 'shortText'
  | 'longText'
  | 'select'

/** The 223 answers and the kind of each, in the order of the spec's section 9. */
export const FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS = {
  // I – Identificação
  gender: 'select',
  civilStatus: 'select',
  email: 'shortText',
  sector: 'shortText',
  turn: 'shortText',
  ramal: 'shortText',
  ocupation: 'shortText',
  previousOccupations: 'shortText',
  // II – Histórico de saúde
  isPracticePhysicalActivities: 'exclusive',
  isPracticeLeisureActivities: 'exclusive',
  isMusicalInstrument: 'exclusive',
  isSmoking: 'exclusive',
  isMedicines: 'exclusive',
  isPreviousTreatment: 'exclusive',
  practicePhysicalActivities: 'shortText',
  practiceLeisureActivities: 'shortText',
  musicalInstrument: 'shortText',
  smokingCountPerDay: 'shortText',
  smokingYears: 'shortText',
  medicines: 'shortText',
  previousTreatment: 'shortText',
  isAssociatedPathologies1: 'mark',
  isAssociatedPathologies2: 'mark',
  isAssociatedPathologies3: 'mark',
  isAssociatedPathologies4: 'mark',
  isAssociatedPathologies5: 'mark',
  isAssociatedPathologies6: 'mark',
  isAssociatedPathologies7: 'mark',
  isAssociatedPathologies8: 'mark',
  associatedPathologies1: 'shortText',
  associatedPathologies2: 'shortText',
  associatedPathologies3: 'shortText',
  associatedPathologies4: 'shortText',
  associatedPathologies5: 'shortText',
  associatedPathologies6: 'shortText',
  associatedPathologies7: 'shortText',
  associatedPathologies8: 'shortText',
  // III – Sintomatologia
  isPain: 'exclusive',
  hasFallHistory: 'exclusive',
  hasPreviousExams: 'exclusive',
  painLocation: 'shortText',
  painStageAguda: 'mark',
  painStageSubAguda: 'mark',
  painStageCronica: 'mark',
  painStageRecorrente: 'mark',
  painIntensity: 'integer',
  painMomentMatutina: 'mark',
  painMomentVespertina: 'mark',
  painMomentNoturna: 'mark',
  painMomentSemHorario: 'mark',
  worseningFactorsEsforcoFisico: 'mark',
  worseningFactorsRepouso: 'mark',
  worseningFactorsTensaoEmocional: 'mark',
  worseningFactorsEsporte: 'mark',
  worseningFactorsMovimento: 'mark',
  worseningFactorsOutro: 'mark',
  factorsThatAlleviateRepouso: 'mark',
  factorsThatAlleviateCalorLocal: 'mark',
  factorsThatAlleviateFisioterapia: 'mark',
  factorsThatAlleviateMedicacao: 'mark',
  factorsThatAlleviateMovimento: 'mark',
  factorsThatAlleviateExercicioAlongamento: 'mark',
  factorsThatAlleviateOutro: 'mark',
  fallHistory: 'longText',
  factorsThatAlleviate: 'longText',
  previousExams: 'longText',
  hd: 'longText',
  hma: 'longText',
  // IV – Exame físico
  weight: 'number',
  stature: 'number',
  fc: 'number',
  fr: 'number',
  pa: 'shortText',
  // V – Avaliação postural: flexibilidade e testes funcionais
  isquiotibiais: 'shortText',
  gastrocnemios: 'shortText',
  soleos: 'shortText',
  pelvitrocantericos: 'shortText',
  adutores: 'shortText',
  distanciaMaosPes: 'shortText',
  distanciaCabecaChao: 'shortText',
  distanciaMaosChao: 'shortText',
  anguloCoxofemora: 'shortText',
  anguloJoelhos: 'shortText',
  anguloTibioTarsico: 'shortText',
  ombroDireito: 'longText',
  ombroEsquerdo: 'longText',
  cotoveloDireito: 'longText',
  cotoveloEsquerdo: 'longText',
  cervicalDireita: 'longText',
  cervicalEsquerda: 'longText',
  testeLombarDireita: 'longText',
  testeLombarEsquerda: 'longText',
  forcaMuscularGeral: 'longText',
  amplitudeMovimentoGeral: 'longText',
  sacroIliacaDireita: 'longText',
  sacroIliacaEsquerda: 'longText',
  membrosInferioresDireita: 'longText',
  membrosInferioresEsquerda: 'longText',
  forcaMuscular: 'longText',
  amplitudeMovimento: 'longText',
  // VI – Cabeça
  ecomD: 'mark',
  ecomE: 'mark',
  ecomN: 'mark',
  jesusD: 'mark',
  jesusE: 'mark',
  jesusN: 'mark',
  curvaturaRetificada: 'mark',
  curvaturaN: 'mark',
  curvaturaHiperlordose: 'mark',
  curvaturaHipercifose: 'mark',
  olharHorizontal: 'mark',
  olharCima: 'mark',
  olharBaixo: 'mark',
  anteriorizacao: 'exclusive',
  anteriorizacaoCount: 'shortText',
  // VI – MMSS
  claviculasObliquas: 'mark',
  claviculasHorizontalizadas: 'mark',
  saboneteirasSimetricas: 'mark',
  saboneteirasAssimetricas: 'mark',
  escapulasAlinhadas: 'mark',
  escapulasDElevada: 'mark',
  escapulasEElevada: 'mark',
  bracosTocamSimetricos: 'mark',
  bracosDMais: 'mark',
  bracosEMais: 'mark',
  antebracosAlinhados: 'mark',
  antebracosPronado: 'mark',
  antebracosPronadoD: 'mark',
  antebracosPronadoE: 'mark',
  antebracosSupinado: 'mark',
  antebracosSupinadoD: 'mark',
  antebracosSupinadoE: 'mark',
  ombroAnteriorAlinhados: 'mark',
  ombroAnteriorElevado: 'mark',
  ombroAnteriorElevadoD: 'mark',
  ombroAnteriorElevadoE: 'mark',
  ombroAnteriorOnda: 'mark',
  ombroAnteriorOndaD: 'mark',
  ombroAnteriorOndaE: 'mark',
  ombroAnteriorAbraco: 'mark',
  ombroAnteriorAbracoD: 'mark',
  ombroAnteriorAbracoE: 'mark',
  ombroLateralAlinhados: 'mark',
  ombroLateralEnrolados: 'mark',
  ombroLateralEnroladosD: 'mark',
  ombroLateralEnroladosE: 'mark',
  // VI – Tronco
  toracicaDorsalAlinhado: 'mark',
  toracicaDorsalHiperlordose: 'mark',
  toracicaDorsalRetificada: 'mark',
  toracicaDorsalHipercifose: 'mark',
  toracicaDorsalEscoliose: 'mark',
  toracicaDorsalEscolioseC: 'mark',
  toracicaDorsalEscolioseS: 'mark',
  toracicaDorsalEscolioseD: 'mark',
  toracicaDorsalEscolioseE: 'mark',
  toracicaDorsalGibosidade: 'mark',
  toracicaDorsalGibosidadeS: 'mark',
  toracicaDorsalGibosidadeN: 'mark',
  opcoesLombarAlinhada: 'mark',
  opcoesLombarHiperlordose: 'mark',
  opcoesLombarRetificada: 'mark',
  opcoesLombarHipercifose: 'mark',
  pelveAlinhada: 'mark',
  pelveCristaIliacaElevada: 'mark',
  pelveCristaD: 'mark',
  pelveCristaE: 'mark',
  pelveRetroversao: 'mark',
  pelveRetroversaoD: 'mark',
  pelveRetroversaoE: 'mark',
  pelveAnteroversao: 'mark',
  pelveAnteroversaoD: 'mark',
  pelveAnteroversaoE: 'mark',
  pelveSacroHorizontalizado: 'mark',
  pelveRetroversaoDireitaDedos: 'shortText',
  pelveRetroversaoEsquerdaDedos: 'shortText',
  pelveAnteroversaoDireitaDedos: 'shortText',
  pelveAnteroversaoEsquerdaDedos: 'shortText',
  // VI – MMII
  joelhosAlinhado: 'mark',
  joelhosValgo: 'mark',
  joelhosValgoD: 'mark',
  joelhosValgoE: 'mark',
  joelhosVaro: 'mark',
  joelhosVaroD: 'mark',
  joelhosVaroE: 'mark',
  joelhosPatelaMedializada: 'mark',
  joelhosPatelaMedializadaD: 'mark',
  joelhosPatelaMedializadaE: 'mark',
  joelhosPatelaLateralizada: 'mark',
  joelhosPatelaLateralizadaD: 'mark',
  joelhosPatelaLateralizadaE: 'mark',
  joelhosFlexo: 'mark',
  joelhosFlexoD: 'mark',
  joelhosFlexoE: 'mark',
  joelhosRecurvatum: 'mark',
  joelhosRecurvatumD: 'mark',
  joelhosRecurvatumE: 'mark',
  joelhoValgoDireitoDedos: 'shortText',
  joelhoValgoEsquerdoDedos: 'shortText',
  joelhoVaroDireitoDedos: 'shortText',
  joelhoVaroEsquerdoDedos: 'shortText',
  retropeCalcaneoValgo: 'mark',
  retropeCalcaneoVaro: 'mark',
  retropeNormal: 'mark',
  antepePronado: 'mark',
  antepeSupinado: 'mark',
  antepeNormal: 'mark',
  dedosAlinhado: 'mark',
  dedosHaluxValgo: 'mark',
  dedosHaluxD: 'mark',
  dedosHaluxE: 'mark',
  dedosRetraidos: 'mark',
  dedosRetraidosD: 'mark',
  dedosRetraidosE: 'mark',
  // VII – Dinamometria e flexibilidade: `true` is Adequado, `false` is Abaixo.
  preensaoPalmarKg: 'number',
  escapularKg: 'number',
  lombarKg: 'number',
  preensaoPalmarAdequado: 'exclusive',
  escapularAdequado: 'exclusive',
  lombarAdequado: 'exclusive',
  testeBancoWellsAdequado: 'exclusive',
  valorTesteBancoWells: 'shortText',
  valuer: 'shortText',
  evaluatedSignature: 'shortText',
} as const satisfies Record<string, FunctionalCinesioAssessmentAnswerKind>

export type FunctionalCinesioAssessmentAnswer =
  keyof typeof FUNCTIONAL_CINESIO_ASSESSMENT_ANSWERS

type IsExactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

/**
 * The answers checked against the generated contract (FR-017):
 * `FunctionalCinesioAssessmentContractCheck` is `true` only while the keys are
 * exactly those of `FunctionalCinesioAssessmentAnswers`. After `yarn generate`, a
 * divergence with the API turns it `false`, and the assignment below fails the
 * typecheck.
 */
export type FunctionalCinesioAssessmentContractCheck = IsExactly<
  FunctionalCinesioAssessmentAnswer,
  keyof FunctionalCinesioAssessmentAnswers
>

export const FUNCTIONAL_CINESIO_ASSESSMENT_MATCHES_CONTRACT: FunctionalCinesioAssessmentContractCheck = true

/** The legacy figures, in `public/`, at their own size in pixels (RK-5). */
export const FUNCTIONAL_CINESIO_ASSESSMENT_FIGURES = {
  posture: {
    src: '/evaluations/functional-cinesio-assessment/postura.png',
    width: 188,
    height: 155,
  },
  scapulae: {
    src: '/evaluations/functional-cinesio-assessment/escapulas.png',
    width: 108,
    height: 58,
  },
} as const

/** The base name of the report's file, which never has the person's name. */
export const FUNCTIONAL_CINESIO_ASSESSMENT_FILE_BASE_NAME =
  'avaliacao-cinesiofuncional'

/**
 * The keys of `evaluations.functionalCinesioAssessmentFields.labels`. A label is
 * shared on purpose when the same word means the same thing everywhere (`sideD`,
 * `rectified`), and is separate when pt-BR agrees in gender or number
 * (`alignedM`, `alignedF`, `alignedMPlural`, `alignedFPlural`).
 */
export const FUNCTIONAL_CINESIO_ASSESSMENT_LABELS = [
  // Sections
  'sectionIdentification',
  'sectionHealthHistory',
  'sectionSymptoms',
  'sectionPhysicalExam',
  'sectionPosturalFlexibility',
  'sectionPosturalMarks',
  'sectionDynamometry',
  // Header and I
  'activity',
  'assessmentDate',
  'name',
  'birthDate',
  'registry',
  'gender',
  'genderMale',
  'genderFemale',
  'civilStatus',
  'civilStatusMarried',
  'civilStatusSingle',
  'civilStatusSeparated',
  'civilStatusDivorced',
  'civilStatusWidowed',
  'email',
  'workSector',
  'shift',
  'extension',
  'currentOccupation',
  'previousOccupations',
  // Shared answers
  'yes',
  'no',
  'adequate',
  'below',
  'sideD',
  'sideE',
  'sideN',
  'explain',
  'description',
  // II
  'physicalActivity',
  'typeAndFrequency',
  'leisureActivities',
  'type',
  'musicalInstrument',
  'smoking',
  'cigarettesPerDay',
  'smokingYears',
  'medicines',
  'previousTreatment',
  'ifYesWhich',
  'associatedPathologies',
  'pathologyBloodPressure',
  'pathologyDiabetes',
  'pathologyVaricoseVeins',
  'pathologyRheumatism',
  'pathologyTendinitis',
  'pathologyDislocations',
  'pathologyFractures',
  'pathologySpine',
  // III
  'painConsiderations',
  'painLocation',
  'painStage',
  'painStageAcute',
  'painStageSubacute',
  'painStageChronic',
  'painStageRecurrent',
  'painIntensity',
  'painMoment',
  'painMomentMorning',
  'painMomentAfternoon',
  'painMomentNight',
  'painMomentNoFixedTime',
  'fallHistory',
  'worseningFactors',
  'factorPhysicalEffort',
  'factorRest',
  'factorEmotionalStress',
  'factorSport',
  'factorMovement',
  'factorOther',
  'alleviatingFactors',
  'factorLocalHeat',
  'factorPhysiotherapy',
  'factorMedication',
  'factorExerciseStretching',
  'previousExams',
  'hd',
  'hma',
  // IV
  'weight',
  'stature',
  'bloodPressure',
  'heartRate',
  'respiratoryRate',
  'unitKg',
  'unitCm',
  'unitMmHg',
  'unitBpm',
  'unitRpm',
  // V
  'hamstrings',
  'gastrocnemius',
  'soleus',
  'pelvitrochanteric',
  'adductors',
  'handsToFeetDistance',
  'headToFloorDistance',
  'handsToFloorDistance',
  'hipAngle',
  'kneeAngle',
  'tibiotarsalAngle',
  'bodySegments',
  'generalFunctionalTests',
  'specificFunctionalTests',
  'columnRight',
  'columnLeft',
  'segmentShoulders',
  'segmentElbowAndWrists',
  'segmentCervical',
  'segmentLumbar',
  'generalMuscleStrength',
  'generalRangeOfMotion',
  'segmentSacroiliacAndHip',
  'segmentLowerLimbs',
  'muscleStrength',
  'rangeOfMotion',
  // V – the reference tests
  'testApley',
  'testYergason',
  'testNeer',
  'testCozen',
  'testMedialEpicondylitis',
  'testPhalen',
  'testFinkelstein',
  'testApleyCompressionCervical',
  'testApleyDistractionCervical',
  'testLasegue',
  'testSlump',
  'testTiptoe',
  'testHeels',
  'testPatrick',
  'testCompressionDistraction',
  'testPiriformis',
  'testThomas',
  'testPhelps',
  'testDrawer',
  'testValgusVarusStress',
  'testApleyCompressionMeniscus',
  'testApleyDistractionMeniscus',
  'testPatellarCompression',
  // VI – Cabeça
  'groupHead',
  'ecom',
  'jesus',
  'curvature',
  'forwardPosition',
  'gaze',
  'rectified',
  'hyperlordosis',
  'hyperkyphosis',
  'fingers',
  'gazeHorizontal',
  'gazeUp',
  'gazeDown',
  // VI – MMSS
  'groupUpperLimbs',
  'clavicles',
  'oblique',
  'horizontalized',
  'supraclavicularFossae',
  'symmetrical',
  'asymmetrical',
  'scapulae',
  'alignedFPlural',
  'rightElevated',
  'leftElevated',
  'arms',
  'touchSymmetrical',
  'rightPlus',
  'leftPlus',
  'forearms',
  'alignedMPlural',
  'pronated',
  'supinated',
  'anteriorShoulder',
  'elevated',
  'wave',
  'hug',
  'lateralShoulder',
  'rolled',
  // VI – Tronco
  'groupTrunk',
  'thoracicDorsal',
  'alignedM',
  'scoliosis',
  'scoliosisC',
  'scoliosisS',
  'structuralGibbosity',
  'gibbosityS',
  'gibbosityN',
  'lumbar',
  'pelvis',
  'alignedF',
  'iliacCrestElevated',
  'retroversion',
  'anteversion',
  'horizontalSacrum',
  // VI – MMII
  'groupLowerLimbs',
  'knees',
  'valgus',
  'varus',
  'medializedPatella',
  'lateralizedPatella',
  'flexed',
  'recurvatum',
  'feet',
  'hindfoot',
  'calcaneusValgus',
  'calcaneusVarus',
  'normal',
  'forefoot',
  'toes',
  'halluxValgus',
  'retracted',
  // VII
  'handGrip',
  'scapular',
  'wellsBenchTest',
  'evaluator',
  'evaluated',
] as const

export type FunctionalCinesioAssessmentLabel =
  (typeof FUNCTIONAL_CINESIO_ASSESSMENT_LABELS)[number]

type Answer = FunctionalCinesioAssessmentAnswer
type Label = FunctionalCinesioAssessmentLabel

/**
 * An independent mark. `condition` is the mark of the condition a D or an E
 * belongs to, for the accessible name ("Elevado — D"): it only relates the two,
 * and marking one never touches the other (R-28).
 */
export interface FunctionalCinesioAssessmentMark {
  kind: 'mark'
  key: Answer
  label: Label
  condition?: Answer
}

/** A Sim/Não or Adequado/Abaixo: `true` is `yes`, `false` is `no` (D-6). */
export interface FunctionalCinesioAssessmentExclusive {
  kind: 'exclusive'
  key: Answer
  label: Label
  yes: Label
  no: Label
}

/** A text or a measure of the catalog, with its unit when it has one. */
export interface FunctionalCinesioAssessmentText {
  kind: 'text'
  key: Answer
  label: Label
  unit?: Label
  condition?: Answer
}

/** A text with a fixed list of values. */
export interface FunctionalCinesioAssessmentSelect {
  kind: 'select'
  key: Answer
  label: Label
  options: readonly { value: string; label: Label }[]
}

/** A required field of the API's header, which is not in `answers`. */
export interface FunctionalCinesioAssessmentHeaderField {
  kind: 'header'
  field: 'evaluated' | 'birth_date' | 'registry'
  label: Label
}

/** A mark with its own text, as each of the associated pathologies. */
export interface FunctionalCinesioAssessmentMarkedText {
  kind: 'markedText'
  mark: FunctionalCinesioAssessmentMark
  text: FunctionalCinesioAssessmentText
}

/** A label followed by marks of the same group. */
export interface FunctionalCinesioAssessmentMarks {
  kind: 'marks'
  label: Label
  marks: readonly FunctionalCinesioAssessmentMark[]
}

/** A heading with no answer. */
export interface FunctionalCinesioAssessmentCaption {
  kind: 'caption'
  label: Label
}

/** What goes on one line of a section. */
export type FunctionalCinesioAssessmentItem =
  | FunctionalCinesioAssessmentMark
  | FunctionalCinesioAssessmentExclusive
  | FunctionalCinesioAssessmentText
  | FunctionalCinesioAssessmentSelect
  | FunctionalCinesioAssessmentHeaderField
  | FunctionalCinesioAssessmentMarkedText
  | FunctionalCinesioAssessmentMarks
  | FunctionalCinesioAssessmentCaption

export type FunctionalCinesioAssessmentLine =
  readonly FunctionalCinesioAssessmentItem[]

function mark(key: Answer, label: Label, condition?: Answer) {
  return {
    kind: 'mark',
    key,
    label,
    ...(condition ? { condition } : {}),
  } as const satisfies FunctionalCinesioAssessmentMark
}

/** A condition with its D and E, each a mark of its own. */
function withSides(
  condition: Answer,
  label: Label,
  right: Answer,
  left: Answer
) {
  return [
    mark(condition, label),
    mark(right, 'sideD', condition),
    mark(left, 'sideE', condition),
  ] as const
}

function text(key: Answer, label: Label, unit?: Label) {
  return {
    kind: 'text',
    key,
    label,
    ...(unit ? { unit } : {}),
  } as const satisfies FunctionalCinesioAssessmentText
}

/** The "n dedos" after a D or an E. */
function fingers(key: Answer, condition: Answer) {
  return {
    kind: 'text',
    key,
    label: 'fingers',
    unit: 'fingers',
    condition,
  } as const satisfies FunctionalCinesioAssessmentText
}

function yesNo(key: Answer, label: Label) {
  return {
    kind: 'exclusive',
    key,
    label,
    yes: 'yes',
    no: 'no',
  } as const satisfies FunctionalCinesioAssessmentExclusive
}

function adequateBelow(key: Answer, label: Label) {
  return {
    kind: 'exclusive',
    key,
    label,
    yes: 'adequate',
    no: 'below',
  } as const satisfies FunctionalCinesioAssessmentExclusive
}

function pathology(markKey: Answer, textKey: Answer, label: Label) {
  return {
    kind: 'markedText',
    mark: mark(markKey, label),
    text: text(textKey, label),
  } as const satisfies FunctionalCinesioAssessmentMarkedText
}

/**
 * The sections, in the order of the report, numbered I to VII: the legacy
 * repeats V, so its VI is VII here. `lines` are the fields of the section; the
 * functional tests of V, the marks of VI and the dynamometry of VII are below.
 */
export const FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS = [
  {
    id: 'identification',
    number: 'I',
    title: 'sectionIdentification',
    lines: [
      [
        { kind: 'header', field: 'evaluated', label: 'name' },
        { kind: 'header', field: 'birth_date', label: 'birthDate' },
      ],
      [
        {
          kind: 'select',
          key: 'gender',
          label: 'gender',
          options: [
            { value: 'masculino', label: 'genderMale' },
            { value: 'feminino', label: 'genderFemale' },
          ],
        },
      ],
      [
        {
          kind: 'select',
          key: 'civilStatus',
          label: 'civilStatus',
          options: [
            { value: 'casado', label: 'civilStatusMarried' },
            { value: 'solteiro', label: 'civilStatusSingle' },
            { value: 'separado', label: 'civilStatusSeparated' },
            { value: 'divorciado', label: 'civilStatusDivorced' },
            { value: 'viuvo', label: 'civilStatusWidowed' },
          ],
        },
      ],
      [
        { kind: 'header', field: 'registry', label: 'registry' },
        text('email', 'email'),
      ],
      [
        text('sector', 'workSector'),
        text('turn', 'shift'),
        text('ramal', 'extension'),
      ],
      [
        text('ocupation', 'currentOccupation'),
        text('previousOccupations', 'previousOccupations'),
      ],
    ],
  },
  {
    id: 'healthHistory',
    number: 'II',
    title: 'sectionHealthHistory',
    lines: [
      [
        yesNo('isPracticePhysicalActivities', 'physicalActivity'),
        text('practicePhysicalActivities', 'typeAndFrequency'),
      ],
      [
        yesNo('isPracticeLeisureActivities', 'leisureActivities'),
        text('practiceLeisureActivities', 'type'),
      ],
      [
        yesNo('isMusicalInstrument', 'musicalInstrument'),
        text('musicalInstrument', 'type'),
      ],
      [
        yesNo('isSmoking', 'smoking'),
        text('smokingCountPerDay', 'cigarettesPerDay'),
        text('smokingYears', 'smokingYears'),
      ],
      [yesNo('isMedicines', 'medicines'), text('medicines', 'name')],
      [
        yesNo('isPreviousTreatment', 'previousTreatment'),
        text('previousTreatment', 'ifYesWhich'),
      ],
      [{ kind: 'caption', label: 'associatedPathologies' }],
      [
        pathology(
          'isAssociatedPathologies1',
          'associatedPathologies1',
          'pathologyBloodPressure'
        ),
        pathology(
          'isAssociatedPathologies2',
          'associatedPathologies2',
          'pathologyDiabetes'
        ),
      ],
      [
        pathology(
          'isAssociatedPathologies3',
          'associatedPathologies3',
          'pathologyVaricoseVeins'
        ),
        pathology(
          'isAssociatedPathologies4',
          'associatedPathologies4',
          'pathologyRheumatism'
        ),
      ],
      [
        pathology(
          'isAssociatedPathologies5',
          'associatedPathologies5',
          'pathologyTendinitis'
        ),
        pathology(
          'isAssociatedPathologies6',
          'associatedPathologies6',
          'pathologyDislocations'
        ),
      ],
      [
        pathology(
          'isAssociatedPathologies7',
          'associatedPathologies7',
          'pathologyFractures'
        ),
        pathology(
          'isAssociatedPathologies8',
          'associatedPathologies8',
          'pathologySpine'
        ),
      ],
    ],
  },
  {
    id: 'symptoms',
    number: 'III',
    title: 'sectionSymptoms',
    lines: [
      [
        yesNo('isPain', 'painConsiderations'),
        text('painLocation', 'painLocation'),
      ],
      [
        {
          kind: 'marks',
          label: 'painStage',
          marks: [
            mark('painStageAguda', 'painStageAcute'),
            mark('painStageSubAguda', 'painStageSubacute'),
            mark('painStageCronica', 'painStageChronic'),
            mark('painStageRecorrente', 'painStageRecurrent'),
          ],
        },
      ],
      [
        text('painIntensity', 'painIntensity'),
        {
          kind: 'marks',
          label: 'painMoment',
          marks: [
            mark('painMomentMatutina', 'painMomentMorning'),
            mark('painMomentVespertina', 'painMomentAfternoon'),
            mark('painMomentNoturna', 'painMomentNight'),
            mark('painMomentSemHorario', 'painMomentNoFixedTime'),
          ],
        },
      ],
      [yesNo('hasFallHistory', 'fallHistory')],
      [text('fallHistory', 'explain')],
      [
        {
          kind: 'marks',
          label: 'worseningFactors',
          marks: [
            mark('worseningFactorsEsforcoFisico', 'factorPhysicalEffort'),
            mark('worseningFactorsRepouso', 'factorRest'),
            mark('worseningFactorsTensaoEmocional', 'factorEmotionalStress'),
            mark('worseningFactorsEsporte', 'factorSport'),
            mark('worseningFactorsMovimento', 'factorMovement'),
            mark('worseningFactorsOutro', 'factorOther'),
          ],
        },
      ],
      [
        {
          kind: 'marks',
          label: 'alleviatingFactors',
          marks: [
            mark('factorsThatAlleviateRepouso', 'factorRest'),
            mark('factorsThatAlleviateCalorLocal', 'factorLocalHeat'),
            mark('factorsThatAlleviateFisioterapia', 'factorPhysiotherapy'),
            mark('factorsThatAlleviateMedicacao', 'factorMedication'),
            mark('factorsThatAlleviateMovimento', 'factorMovement'),
            mark(
              'factorsThatAlleviateExercicioAlongamento',
              'factorExerciseStretching'
            ),
            mark('factorsThatAlleviateOutro', 'factorOther'),
          ],
        },
      ],
      [text('factorsThatAlleviate', 'explain')],
      [yesNo('hasPreviousExams', 'previousExams')],
      [text('previousExams', 'description')],
      [text('hd', 'hd')],
      [text('hma', 'hma')],
    ],
  },
  {
    id: 'physicalExam',
    number: 'IV',
    title: 'sectionPhysicalExam',
    lines: [
      [
        text('weight', 'weight', 'unitKg'),
        text('stature', 'stature', 'unitCm'),
        text('pa', 'bloodPressure', 'unitMmHg'),
        text('fc', 'heartRate', 'unitBpm'),
        text('fr', 'respiratoryRate', 'unitRpm'),
      ],
    ],
  },
  {
    id: 'posturalFlexibility',
    number: 'V',
    title: 'sectionPosturalFlexibility',
    // The measures, beside the posture figure; the tests are below.
    lines: [
      [
        text('isquiotibiais', 'hamstrings'),
        text('distanciaCabecaChao', 'headToFloorDistance'),
      ],
      [
        text('gastrocnemios', 'gastrocnemius'),
        text('distanciaMaosChao', 'handsToFloorDistance'),
      ],
      [text('soleos', 'soleus'), text('anguloCoxofemora', 'hipAngle')],
      [
        text('pelvitrocantericos', 'pelvitrochanteric'),
        text('anguloJoelhos', 'kneeAngle'),
      ],
      [
        text('adutores', 'adductors'),
        text('anguloTibioTarsico', 'tibiotarsalAngle'),
      ],
      [text('distanciaMaosPes', 'handsToFeetDistance')],
    ],
  },
  {
    id: 'posturalMarks',
    number: 'VI',
    title: 'sectionPosturalMarks',
    // Its groups are `FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS`.
    lines: [],
  },
  {
    id: 'dynamometry',
    number: 'VII',
    title: 'sectionDynamometry',
    // After `FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY`, the end of the report.
    lines: [
      [text('valuer', 'evaluator'), text('evaluatedSignature', 'evaluated')],
    ],
  },
] as const satisfies readonly {
  id: string
  number: string
  title: Label
  lines: readonly FunctionalCinesioAssessmentLine[]
}[]

export type FunctionalCinesioAssessmentSection =
  (typeof FUNCTIONAL_CINESIO_ASSESSMENT_SECTIONS)[number]

/** One body segment: its reference tests beside its two texts (R-19). */
export interface FunctionalCinesioAssessmentTestSegment {
  label: Label
  /** Fixed labels, in the legacy order: nothing marks them. */
  tests: readonly Label[]
  right: FunctionalCinesioAssessmentText
  left: FunctionalCinesioAssessmentText
}

export interface FunctionalCinesioAssessmentTestTable {
  title: Label
  segments: readonly FunctionalCinesioAssessmentTestSegment[]
  /** Muscle strength and range of motion, across the two sides. */
  notes: readonly FunctionalCinesioAssessmentText[]
}

function segment(
  label: Label,
  tests: readonly Label[],
  right: Answer,
  left: Answer
): FunctionalCinesioAssessmentTestSegment {
  return {
    label,
    tests,
    right: text(right, 'columnRight'),
    left: text(left, 'columnLeft'),
  }
}

/** The general and the specific functional tests of the section V. */
export const FUNCTIONAL_CINESIO_ASSESSMENT_TEST_TABLES: readonly FunctionalCinesioAssessmentTestTable[] =
  [
    {
      title: 'generalFunctionalTests',
      segments: [
        segment(
          'segmentShoulders',
          ['testApley', 'testYergason', 'testNeer'],
          'ombroDireito',
          'ombroEsquerdo'
        ),
        segment(
          'segmentElbowAndWrists',
          [
            'testCozen',
            'testMedialEpicondylitis',
            'testPhalen',
            'testFinkelstein',
          ],
          'cotoveloDireito',
          'cotoveloEsquerdo'
        ),
        segment(
          'segmentCervical',
          ['testApleyCompressionCervical', 'testApleyDistractionCervical'],
          'cervicalDireita',
          'cervicalEsquerda'
        ),
        segment(
          'segmentLumbar',
          ['testLasegue', 'testSlump', 'testTiptoe', 'testHeels'],
          'testeLombarDireita',
          'testeLombarEsquerda'
        ),
      ],
      notes: [
        text('forcaMuscularGeral', 'generalMuscleStrength'),
        text('amplitudeMovimentoGeral', 'generalRangeOfMotion'),
      ],
    },
    {
      title: 'specificFunctionalTests',
      segments: [
        segment(
          'segmentSacroiliacAndHip',
          [
            'testPatrick',
            'testCompressionDistraction',
            'testPiriformis',
            'testThomas',
            'testPhelps',
          ],
          'sacroIliacaDireita',
          'sacroIliacaEsquerda'
        ),
        segment(
          'segmentLowerLimbs',
          [
            'testDrawer',
            'testValgusVarusStress',
            'testApleyCompressionMeniscus',
            'testApleyDistractionMeniscus',
            'testPatellarCompression',
          ],
          'membrosInferioresDireita',
          'membrosInferioresEsquerda'
        ),
      ],
      notes: [
        text('forcaMuscular', 'muscleStrength'),
        text('amplitudeMovimento', 'rangeOfMotion'),
      ],
    },
  ]

/** What goes on one line of a column of the postural marks. */
export type FunctionalCinesioAssessmentColumnItem =
  | FunctionalCinesioAssessmentMark
  | FunctionalCinesioAssessmentExclusive
  | FunctionalCinesioAssessmentText
  | FunctionalCinesioAssessmentCaption

/** One body part: its marks, line by line, and a figure when it has one. */
export interface FunctionalCinesioAssessmentColumn {
  title: Label
  figure?: 'scapulae'
  lines: readonly (readonly FunctionalCinesioAssessmentColumnItem[])[]
}

export interface FunctionalCinesioAssessmentPosturalGroup {
  id: 'head' | 'upperLimbs' | 'trunk' | 'lowerLimbs'
  title: Label
  /** The rows of columns, as in the legacy tables. */
  rows: readonly (readonly FunctionalCinesioAssessmentColumn[])[]
}

/**
 * The marks of the section VI (R-20 to R-23). Each is a key of its own, so the
 * Elevado, Onda and Abraço of Ombro anterior and the Retroversão and Anteroversão
 * of Pelve no longer light each other, as they did in the legacy (D-3).
 */
export const FUNCTIONAL_CINESIO_ASSESSMENT_POSTURAL_GROUPS: readonly FunctionalCinesioAssessmentPosturalGroup[] =
  [
    {
      id: 'head',
      title: 'groupHead',
      rows: [
        [
          {
            title: 'ecom',
            lines: [
              [
                mark('ecomD', 'sideD'),
                mark('ecomE', 'sideE'),
                mark('ecomN', 'sideN'),
              ],
            ],
          },
          {
            title: 'jesus',
            lines: [
              [
                mark('jesusD', 'sideD'),
                mark('jesusE', 'sideE'),
                mark('jesusN', 'sideN'),
              ],
            ],
          },
          {
            title: 'curvature',
            lines: [
              [
                mark('curvaturaRetificada', 'rectified'),
                mark('curvaturaN', 'sideN'),
              ],
              [mark('curvaturaHiperlordose', 'hyperlordosis')],
              [mark('curvaturaHipercifose', 'hyperkyphosis')],
            ],
          },
          {
            title: 'forwardPosition',
            lines: [
              [yesNo('anteriorizacao', 'forwardPosition')],
              [fingers('anteriorizacaoCount', 'anteriorizacao')],
            ],
          },
          {
            title: 'gaze',
            lines: [
              [mark('olharHorizontal', 'gazeHorizontal')],
              [mark('olharCima', 'gazeUp')],
              [mark('olharBaixo', 'gazeDown')],
            ],
          },
        ],
      ],
    },
    {
      id: 'upperLimbs',
      title: 'groupUpperLimbs',
      rows: [
        [
          {
            title: 'clavicles',
            lines: [
              [mark('claviculasObliquas', 'oblique')],
              [mark('claviculasHorizontalizadas', 'horizontalized')],
            ],
          },
          {
            title: 'supraclavicularFossae',
            lines: [
              [mark('saboneteirasSimetricas', 'symmetrical')],
              [mark('saboneteirasAssimetricas', 'asymmetrical')],
            ],
          },
          {
            title: 'scapulae',
            figure: 'scapulae',
            lines: [
              [mark('escapulasAlinhadas', 'alignedFPlural')],
              [mark('escapulasDElevada', 'rightElevated')],
              [mark('escapulasEElevada', 'leftElevated')],
            ],
          },
          {
            title: 'arms',
            lines: [
              [mark('bracosTocamSimetricos', 'touchSymmetrical')],
              [mark('bracosDMais', 'rightPlus')],
              [mark('bracosEMais', 'leftPlus')],
            ],
          },
        ],
        [
          {
            title: 'forearms',
            lines: [
              [mark('antebracosAlinhados', 'alignedMPlural')],
              withSides(
                'antebracosPronado',
                'pronated',
                'antebracosPronadoD',
                'antebracosPronadoE'
              ),
              withSides(
                'antebracosSupinado',
                'supinated',
                'antebracosSupinadoD',
                'antebracosSupinadoE'
              ),
            ],
          },
          {
            title: 'anteriorShoulder',
            lines: [
              [mark('ombroAnteriorAlinhados', 'alignedMPlural')],
              withSides(
                'ombroAnteriorElevado',
                'elevated',
                'ombroAnteriorElevadoD',
                'ombroAnteriorElevadoE'
              ),
              withSides(
                'ombroAnteriorOnda',
                'wave',
                'ombroAnteriorOndaD',
                'ombroAnteriorOndaE'
              ),
              withSides(
                'ombroAnteriorAbraco',
                'hug',
                'ombroAnteriorAbracoD',
                'ombroAnteriorAbracoE'
              ),
            ],
          },
          {
            title: 'lateralShoulder',
            lines: [
              [mark('ombroLateralAlinhados', 'alignedMPlural')],
              withSides(
                'ombroLateralEnrolados',
                'rolled',
                'ombroLateralEnroladosD',
                'ombroLateralEnroladosE'
              ),
            ],
          },
        ],
      ],
    },
    {
      id: 'trunk',
      title: 'groupTrunk',
      rows: [
        [
          {
            title: 'thoracicDorsal',
            lines: [
              [mark('toracicaDorsalAlinhado', 'alignedM')],
              [mark('toracicaDorsalHiperlordose', 'hyperlordosis')],
              [mark('toracicaDorsalRetificada', 'rectified')],
              [mark('toracicaDorsalHipercifose', 'hyperkyphosis')],
              [
                mark('toracicaDorsalEscoliose', 'scoliosis'),
                mark(
                  'toracicaDorsalEscolioseC',
                  'scoliosisC',
                  'toracicaDorsalEscoliose'
                ),
                mark(
                  'toracicaDorsalEscolioseS',
                  'scoliosisS',
                  'toracicaDorsalEscoliose'
                ),
                mark(
                  'toracicaDorsalEscolioseD',
                  'sideD',
                  'toracicaDorsalEscoliose'
                ),
                mark(
                  'toracicaDorsalEscolioseE',
                  'sideE',
                  'toracicaDorsalEscoliose'
                ),
              ],
              [
                mark('toracicaDorsalGibosidade', 'structuralGibbosity'),
                mark(
                  'toracicaDorsalGibosidadeS',
                  'gibbosityS',
                  'toracicaDorsalGibosidade'
                ),
                mark(
                  'toracicaDorsalGibosidadeN',
                  'gibbosityN',
                  'toracicaDorsalGibosidade'
                ),
              ],
            ],
          },
          {
            title: 'lumbar',
            lines: [
              [mark('opcoesLombarAlinhada', 'alignedF')],
              [mark('opcoesLombarHiperlordose', 'hyperlordosis')],
              [mark('opcoesLombarRetificada', 'rectified')],
              [mark('opcoesLombarHipercifose', 'hyperkyphosis')],
            ],
          },
          {
            title: 'pelvis',
            lines: [
              [mark('pelveAlinhada', 'alignedF')],
              [
                mark('pelveCristaIliacaElevada', 'iliacCrestElevated'),
                mark('pelveCristaD', 'sideD', 'pelveCristaIliacaElevada'),
                mark('pelveCristaE', 'sideE', 'pelveCristaIliacaElevada'),
              ],
              [
                mark('pelveRetroversao', 'retroversion'),
                mark('pelveRetroversaoD', 'sideD', 'pelveRetroversao'),
                fingers('pelveRetroversaoDireitaDedos', 'pelveRetroversaoD'),
                mark('pelveRetroversaoE', 'sideE', 'pelveRetroversao'),
                fingers('pelveRetroversaoEsquerdaDedos', 'pelveRetroversaoE'),
              ],
              [
                mark('pelveAnteroversao', 'anteversion'),
                mark('pelveAnteroversaoD', 'sideD', 'pelveAnteroversao'),
                fingers('pelveAnteroversaoDireitaDedos', 'pelveAnteroversaoD'),
                mark('pelveAnteroversaoE', 'sideE', 'pelveAnteroversao'),
                fingers('pelveAnteroversaoEsquerdaDedos', 'pelveAnteroversaoE'),
              ],
              [mark('pelveSacroHorizontalizado', 'horizontalSacrum')],
            ],
          },
        ],
      ],
    },
    {
      id: 'lowerLimbs',
      title: 'groupLowerLimbs',
      rows: [
        [
          {
            title: 'knees',
            lines: [
              [mark('joelhosAlinhado', 'alignedM')],
              [
                mark('joelhosValgo', 'valgus'),
                mark('joelhosValgoD', 'sideD', 'joelhosValgo'),
                fingers('joelhoValgoDireitoDedos', 'joelhosValgoD'),
                mark('joelhosValgoE', 'sideE', 'joelhosValgo'),
                fingers('joelhoValgoEsquerdoDedos', 'joelhosValgoE'),
              ],
              [
                mark('joelhosVaro', 'varus'),
                mark('joelhosVaroD', 'sideD', 'joelhosVaro'),
                fingers('joelhoVaroDireitoDedos', 'joelhosVaroD'),
                mark('joelhosVaroE', 'sideE', 'joelhosVaro'),
                fingers('joelhoVaroEsquerdoDedos', 'joelhosVaroE'),
              ],
              withSides(
                'joelhosPatelaMedializada',
                'medializedPatella',
                'joelhosPatelaMedializadaD',
                'joelhosPatelaMedializadaE'
              ),
              withSides(
                'joelhosPatelaLateralizada',
                'lateralizedPatella',
                'joelhosPatelaLateralizadaD',
                'joelhosPatelaLateralizadaE'
              ),
              withSides(
                'joelhosFlexo',
                'flexed',
                'joelhosFlexoD',
                'joelhosFlexoE'
              ),
              withSides(
                'joelhosRecurvatum',
                'recurvatum',
                'joelhosRecurvatumD',
                'joelhosRecurvatumE'
              ),
            ],
          },
          {
            title: 'feet',
            lines: [
              [{ kind: 'caption', label: 'hindfoot' }],
              [mark('retropeCalcaneoValgo', 'calcaneusValgus')],
              [mark('retropeCalcaneoVaro', 'calcaneusVarus')],
              [mark('retropeNormal', 'normal')],
              [{ kind: 'caption', label: 'forefoot' }],
              [mark('antepePronado', 'pronated')],
              [mark('antepeSupinado', 'supinated')],
              [mark('antepeNormal', 'normal')],
            ],
          },
          {
            title: 'toes',
            lines: [
              [mark('dedosAlinhado', 'alignedM')],
              withSides(
                'dedosHaluxValgo',
                'halluxValgus',
                'dedosHaluxD',
                'dedosHaluxE'
              ),
              withSides(
                'dedosRetraidos',
                'retracted',
                'dedosRetraidosD',
                'dedosRetraidosE'
              ),
            ],
          },
        ],
      ],
    },
  ]

/** One measure of the section VII, with its Adequado/Abaixo (R-24, R-25). */
export interface FunctionalCinesioAssessmentDynamometryItem {
  value: FunctionalCinesioAssessmentText
  result: FunctionalCinesioAssessmentExclusive
}

export const FUNCTIONAL_CINESIO_ASSESSMENT_DYNAMOMETRY: readonly FunctionalCinesioAssessmentDynamometryItem[] =
  [
    {
      value: text('preensaoPalmarKg', 'handGrip', 'unitKg'),
      result: adequateBelow('preensaoPalmarAdequado', 'handGrip'),
    },
    {
      value: text('escapularKg', 'scapular', 'unitKg'),
      result: adequateBelow('escapularAdequado', 'scapular'),
    },
    {
      value: text('lombarKg', 'lumbar', 'unitKg'),
      result: adequateBelow('lombarAdequado', 'lumbar'),
    },
    {
      value: text('valorTesteBancoWells', 'wellsBenchTest'),
      result: adequateBelow('testeBancoWellsAdequado', 'wellsBenchTest'),
    },
  ]

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The completed years on `date` of who was born on `birthDate`, both
 * `YYYY-MM-DD` (FR-021): `null` when a date is missing or the birth is later. It
 * compares the year, the month and the day of the texts, with no `Date`, so it
 * does not depend on the time zone. Born on 02-29, the birthday of a year that is
 * not a leap year is 03-01, since 02-28 still comes before 02-29.
 */
export function ageAtDate(
  birthDate: string | null | undefined,
  date: string | null | undefined
): number | null {
  const birth = CALENDAR_DAY.exec(birthDate ?? '')
  const on = CALENDAR_DAY.exec(date ?? '')
  if (!birth || !on) return null

  const [, birthYear, birthMonth, birthDay] = birth
  const [, year, month, day] = on
  const birthdayPassed = `${month}-${day}` >= `${birthMonth}-${birthDay}`
  const age = Number(year) - Number(birthYear) - (birthdayPassed ? 0 : 1)

  return age < 0 ? null : age
}
