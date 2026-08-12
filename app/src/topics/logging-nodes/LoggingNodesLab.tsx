import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '06-logging-nodes'

type Mode = 'pick' | 'noise' | 'trace'

const NODES = [
  { id: 'http', label: 'POST /pay', keep: true },
  { id: 'auth', label: 'auth decide', keep: true },
  { id: 'stripe', label: 'stripe.charge', keep: true },
  { id: 'loop', label: 'map line×10k', keep: false },
  { id: 'sum', label: 'sum(a,b)', keep: false },
  { id: 'err', label: 'catch payment', keep: true },
]

export function LoggingNodesLab() {
  const { lines, log, clear } = useLabLog()
  const [mode, setMode] = useState<Mode>('pick')
  const [hint, setHint] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NODES.map((n) => [n.id, n.keep])),
  )

  const run = () => {
    clear()
    if (mode === 'pick') {
      const good = NODES.filter((n) => n.keep && selected[n.id])
      const bad = NODES.filter((n) => !n.keep && selected[n.id])
      const missed = NODES.filter((n) => n.keep && !selected[n.id])
      log('info', `выбрано узлов: ${Object.values(selected).filter(Boolean).length}`)
      if (good.length) log('ok', `границы/решения: ${good.map((n) => n.label).join(', ')}`)
      if (bad.length) log('err', `шум: ${bad.map((n) => n.label).join(', ')}`)
      if (missed.length) log('warn', `пропущено: ${missed.map((n) => n.label).join(', ')}`)
      setHint(
        bad.length || missed.length
          ? 'сверь с «Код» → какие узлы логировать'
          : 'набор узлов ок — смотри поля контекста в «Код»',
      )
      return
    }
    if (mode === 'noise') {
      log('err', 'logger.debug(req) — Authorization + card в логах')
      log('err', 'log внутри map 10k — I/O и нечитаемый поток')
      log('ok', 'маскировать PII; sample debug; узлы на границах')
      setHint('анти-паттерны — см. middleware.js vs bad.js')
      return
    }
    log('info', 'requestId=req_7f3a')
    log('ok', 'http → auth ok → stripe.charge 240ms → catch? no')
    log('ok', 'по одному requestId собран путь')
    setHint('контекст requestId — см. logger вызовы в «Код»')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Логируют границы и решения, не каждую строку. Отметьте узлы; правильные примеры — во вкладке
        «Код».
      </p>
      <ol className={shell.steps}>
        <li>Режим Pick — включите/выключите узлы, затем «Проверить».</li>
        <li>Noise / Trace — типовые ошибки и сборка пути по <code>requestId</code>.</li>
        <li>
          Сверьте с «Код»: <code>pay.handler.js</code>, middleware.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="ghost" size="sm" active={mode === 'pick'} onClick={() => setMode('pick')}>
          Pick
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'noise'}
          onClick={() => setMode('noise')}
        >
          Noise
        </LabButton>
        <LabButton
          variant="ghost"
          size="sm"
          active={mode === 'trace'}
          onClick={() => setMode('trace')}
        >
          Trace
        </LabButton>
      </div>

      {mode === 'pick' ? (
        <div className={shell.row} style={{ flexWrap: 'wrap' }}>
          {NODES.map((n) => (
            <LabButton
              key={n.id}
              variant="ghost"
              size="sm"
              active={Boolean(selected[n.id])}
              onClick={() => setSelected((s) => ({ ...s, [n.id]: !s[n.id] }))}
            >
              {n.label}
            </LabButton>
          ))}
        </div>
      ) : null}

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          {mode === 'pick' ? 'Проверить' : 'Запустить'}
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setSelected(Object.fromEntries(NODES.map((n) => [n.id, n.keep])))
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите режим.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Узлы на границах с `requestId`; без лога в цикле и без сырого `req`."
      snippets={[
        {
          id: 'handler',
          label: 'pay.handler.js',
          note: 'Логи на входе, решении, интеграции и ошибке — не в каждой строке.',
          executable: false,
          code: `import { logger } from '../logger.js';
import { charge } from '../stripe.js';

// ═══════════════════════════════════════════
// УЗЛЫ ← границы / решения / интеграции / ошибки
// ═══════════════════════════════════════════
export async function payHandler(req, res) {
  const { requestId, userId } = req.ctx;

  // ← граница HTTP (вход)
  logger.info({ requestId, userId, operation: 'checkout.pay' }, 'pay start');

  if (!req.user) {
    // ← решение auth
    logger.warn({ requestId, operation: 'checkout.pay', result: 'deny' }, 'unauthorized');
    return res.sendStatus(401);
  }

  try {
    const started = Date.now();
    const result = await charge(req.body);
    // ← интеграция + latency
    logger.info(
      {
        requestId,
        userId,
        operation: 'stripe.charge',
        result: 'ok',
        durationMs: Date.now() - started,
      },
      'payment completed',
    );
    res.json(result);
  } catch (e) {
    // ← ошибка с контекстом (без секретов)
    logger.error({ requestId, userId, operation: 'stripe.charge', err: e }, 'payment failed');
    res.sendStatus(502);
  }
}

// Не логировать:
// items.map((x) => logger.debug(x))  ← шум
// logger.info(req)                   ← PII / tokens`,
        },
        {
          id: 'middleware',
          label: 'requestId.middleware.js',
          note: 'Общий requestId на весь путь — ключ к трассировке в логах.',
          executable: false,
          code: `import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════
// CONTEXT ← один requestId на весь запрос
// ═══════════════════════════════════════════
export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.ctx = { requestId, userId: req.user?.id };
  res.setHeader('x-request-id', requestId);
  next();
}

// В Loki/ELK: filter requestId=… → http → auth → stripe → error`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Какие узлы логировать"
      lead="Выбор узлов и анти-паттерны; примеры handler/middleware — во вкладке «Код»."
      problem={problem}
      code={code}
    />
  )
}
