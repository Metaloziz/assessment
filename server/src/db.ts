import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env.js'

const configuredUrl = env.databaseUrl

let forcedMemory = false

/** Render / cloud Postgres usually need TLS; local docker does not. */
const useSsl =
  Boolean(configuredUrl) &&
  (process.env.NODE_ENV === 'production' ||
    /render\.com|supabase\.co|neon\.tech/i.test(configuredUrl!))

export const sqlClient = configuredUrl
  ? postgres(configuredUrl, {
      max: 5,
      ssl: useSsl ? 'require' : false,
    })
  : null

export const db: PostgresJsDatabase | null = sqlClient ? drizzle(sqlClient) : null

/** Active Postgres for this process (false after fallback or when unset). */
export function usingPostgres(): boolean {
  return Boolean(configuredUrl) && Boolean(db) && !forcedMemory
}

export function fallBackToMemory(reason?: unknown): void {
  if (forcedMemory || !configuredUrl) return
  forcedMemory = true
  const message = reason instanceof Error ? reason.message : String(reason ?? 'unavailable')
  console.warn(`[db] Postgres unreachable — labs use in-memory store (${message})`)
}
