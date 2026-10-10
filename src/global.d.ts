import type messages from '../messages/pt-BR.json'

// Type-checks translation keys against the Portuguese catalog, the source of
// truth; en.json and es.json must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages
  }
}
