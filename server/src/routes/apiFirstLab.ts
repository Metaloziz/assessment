import type { FastifyPluginAsync } from 'fastify'

/** Мини-контракт лабы: POST /orders с обязательным items[]. */
export const ORDER_CONTRACT = {
  path: '/api/lab/api-first/orders',
  method: 'POST',
  requestBody: {
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['sku', 'qty'],
          properties: {
            sku: { type: 'string', minLength: 1 },
            qty: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
  },
  responses: {
    '201': { description: 'Created — тело по схеме' },
    '400': { description: 'Body не по контракту' },
  },
} as const

type OrderItem = { sku: string; qty: number }

function validateOrderBody(
  body: unknown,
): { ok: true; items: OrderItem[] } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['body: object'] }
  }
  const raw = body as Record<string, unknown>
  if (!Array.isArray(raw.items)) {
    errors.push('items: required array')
    return { ok: false, errors }
  }
  if (raw.items.length < 1) {
    errors.push('items: minItems 1')
  }
  const items: OrderItem[] = []
  for (let i = 0; i < raw.items.length; i++) {
    const row = raw.items[i]
    if (row == null || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`items[${i}]: object`)
      continue
    }
    const it = row as Record<string, unknown>
    const skuOk = typeof it.sku === 'string' && it.sku.trim().length > 0
    const qtyOk =
      typeof it.qty === 'number' && Number.isInteger(it.qty) && it.qty >= 1
    if (!skuOk) errors.push(`items[${i}].sku: non-empty string`)
    if (!qtyOk) errors.push(`items[${i}].qty: integer >= 1`)
    if (skuOk && qtyOk) {
      items.push({ sku: (it.sku as string).trim(), qty: it.qty as number })
    }
  }
  if (errors.length) return { ok: false, errors }
  return { ok: true, items }
}

/**
 * Учебные эндпоинты API first: контракт → валидация тела для лабы
 * `251-network-api-first`.
 */
export const apiFirstLabRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/lab/api-first/contract', async () => ({
    ok: true,
    source: 'contract',
    contract: ORDER_CONTRACT,
  }))

  app.post('/api/lab/api-first/orders', async (req, reply) => {
    const checked = validateOrderBody(req.body)
    if (!checked.ok) {
      return reply.status(400).send({
        ok: false,
        status: 400,
        path: '/api/lab/api-first/orders',
        error: 'contract_violation',
        errors: checked.errors,
        note: 'тело не по контракту — 400 до бизнес-логики',
        ts: new Date().toISOString(),
      })
    }
    return reply.status(201).send({
      ok: true,
      status: 201,
      path: '/api/lab/api-first/orders',
      id: 1,
      items: checked.items,
      note: '201 — тело совпало со схемой',
      ts: new Date().toISOString(),
    })
  })

  /** Code-first без схемы: принимает любой JSON (антипример). */
  app.post('/api/lab/api-first/orders-loose', async (req, reply) => {
    return reply.status(200).send({
      ok: true,
      status: 200,
      path: '/api/lab/api-first/orders-loose',
      echo: req.body ?? null,
      note: 'без контракта — сервер принял что угодно',
      ts: new Date().toISOString(),
    })
  })
}
