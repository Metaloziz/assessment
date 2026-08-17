import type { FastifyPluginAsync } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'

let schemaReady: Promise<void> | null = null

async function ensureProgressSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS topic_progress (
          topic_id text PRIMARY KEY,
          completed_at timestamptz NOT NULL DEFAULT now()
        )
      `)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/progress', async (_req, reply) => {
    try {
      await ensureProgressSchema()
      const rows = await db.execute(sql`
        SELECT topic_id FROM topic_progress ORDER BY completed_at
      `)
      const completedIds = rows
        .map((row) => (row as { topic_id?: string }).topic_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
      return { ok: true, completedIds }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({ ok: false, error: message })
    }
  })

  app.put<{ Params: { topicId: string }; Body: { completed?: boolean } }>(
    '/api/progress/:topicId',
    async (req, reply) => {
      const topicId = req.params.topicId?.trim()
      if (!topicId) {
        return reply.status(400).send({ ok: false, error: 'topicId is required' })
      }
      if (typeof req.body?.completed !== 'boolean') {
        return reply.status(400).send({ ok: false, error: 'completed must be a boolean' })
      }

      try {
        await ensureProgressSchema()
        if (req.body.completed) {
          await db.execute(sql`
            INSERT INTO topic_progress (topic_id)
            VALUES (${topicId})
            ON CONFLICT (topic_id) DO NOTHING
          `)
        } else {
          await db.execute(sql`
            DELETE FROM topic_progress WHERE topic_id = ${topicId}
          `)
        }
        return { ok: true, topicId, completed: req.body.completed }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return reply.status(503).send({ ok: false, error: message })
      }
    },
  )

  app.put<{ Body: { completedIds?: unknown } }>('/api/progress', async (req, reply) => {
    const raw = req.body?.completedIds
    if (!Array.isArray(raw)) {
      return reply.status(400).send({ ok: false, error: 'completedIds must be an array' })
    }
    const completedIds = raw
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())

    try {
      await ensureProgressSchema()
      await db.execute(sql`DELETE FROM topic_progress`)
      if (completedIds.length > 0) {
        for (const topicId of completedIds) {
          await db.execute(sql`
            INSERT INTO topic_progress (topic_id)
            VALUES (${topicId})
            ON CONFLICT (topic_id) DO NOTHING
          `)
        }
      }
      return { ok: true, completedIds }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return reply.status(503).send({ ok: false, error: message })
    }
  })
}
