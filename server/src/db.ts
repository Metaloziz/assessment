import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env.js'

const client = postgres(env.databaseUrl, { max: 5 })

export const db = drizzle(client)
export const sqlClient = client
