import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { healthRoutes } from './routes/health.js'
import { demoRoutes } from './routes/demo.js'
import { corsLabRoutes } from './routes/corsLab.js'
import { httpLabRoutes } from './routes/httpLab.js'
import { apiFirstLabRoutes } from './routes/apiFirstLab.js'
import { dbLabRoutes } from './routes/dbLab.js'
import { cacheLabRoutes } from './routes/cacheLab.js'
import { workersLabRoutes } from './routes/workersLab.js'
import { realtimeLabRoutes } from './routes/realtimeLab.js'
import { progressRoutes } from './routes/progress.js'
import { perfLabRoutes } from './routes/perfLab.js'
import { sqlClient } from './db.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: env.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(healthRoutes)
await app.register(demoRoutes)
await app.register(corsLabRoutes)
await app.register(httpLabRoutes)
await app.register(apiFirstLabRoutes)
await app.register(dbLabRoutes)
await app.register(cacheLabRoutes)
await app.register(workersLabRoutes)
await app.register(realtimeLabRoutes)
await app.register(progressRoutes)
await app.register(perfLabRoutes)

const shutdown = async () => {
  await app.close()
  await sqlClient.end({ timeout: 5 })
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

try {
  await app.listen({ port: env.port, host: env.host })
  app.log.info(`assessment-server on http://${env.host}:${env.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
