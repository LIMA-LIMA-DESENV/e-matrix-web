import 'dotenv/config'

import { defineConfig } from 'orval'

const ORVAL_INPUT_URL = process.env.ORVAL_INPUT_URL

if (!ORVAL_INPUT_URL) {
  throw new Error('Missing ORVAL_INPUT_URL environment variable')
}

export default defineConfig({
  api: {
    input: ORVAL_INPUT_URL,
    output: {
      target: './src/http/api.ts',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/http/fetch-client.ts',
          name: 'customFetch',
        },
      },
    },
  },
})
