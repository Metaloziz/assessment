import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env.js'

/** Render / cloud Postgres usually need TLS; local docker does not. */
const useSsl =
  process.env.NODE_ENV === 'production' ||
  /render\.com|supabase\.co|neon\.tech/i.test(env.databaseUrl)

const client = postgres(env.databaseUrl, {
  max: 5,
  ssl: useSsl ? 'require' : false,
})

export const db = drizzle(client)
export const sqlClient = client
