import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config()
config({ path: ['.env.local', '.env'] })

export default defineConfig({
  out: './src/db/drizzle',
  schema: './src/db/full-schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
