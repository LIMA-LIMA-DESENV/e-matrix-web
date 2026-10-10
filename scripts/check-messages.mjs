// Fails when a translation catalog misses or adds keys compared to pt-BR.json,
// the source of truth for the typed `useTranslations` keys.
import { readFileSync } from 'node:fs'

const load = (locale) =>
  JSON.parse(
    readFileSync(new URL(`../messages/${locale}.json`, import.meta.url))
  )

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  )
}

const reference = new Set(flatten(load('pt-BR')))
let failed = false

for (const locale of ['en', 'es']) {
  const keys = new Set(flatten(load(locale)))
  const missing = [...reference].filter((key) => !keys.has(key))
  const extra = [...keys].filter((key) => !reference.has(key))

  if (missing.length || extra.length) {
    failed = true
    console.error(`${locale}.json`)
    for (const key of missing) console.error(`  missing: ${key}`)
    for (const key of extra) console.error(`  extra:   ${key}`)
  }
}

if (failed) process.exit(1)
console.log(`messages ok (${reference.size} keys)`)
