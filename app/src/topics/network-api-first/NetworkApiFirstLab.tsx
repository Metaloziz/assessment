import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import {
  InteractiveCodePanel,
  type InteractiveSnippet,
} from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import { apiUrl } from '../../lib/apiBase'
import styles from './NetworkApiFirstLab.module.css'

const TOPIC_ID = '251-network-api-first'
const STEP = 0.6

type CaseId = 'pass' | 'fail' | 'loose'
type Phase = 'idle' | 'a' | 'b' | 'c' | 'done'

type LivePayload = {
  path: string
  status: number
  summary: string
  ok: boolean
  errors?: string[]
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'pass', label: 'по схеме' },
  { id: 'fail', label: 'ломает контракт' },
  { id: 'loose', label: 'без схемы' },
]

const PAIN = (
  <>
    Контракт фиксирует тело <code>POST /orders</code> до хендлера: валидный JSON проходит,
    нарушение схемы — <code>400</code> без «угадайки» полей.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  pass: (
    <>
      Живой <code>POST /api/lab/api-first/orders</code> с <code>items[]</code> по схеме →{' '}
      <code>201</code>.
    </>
  ),
  fail: (
    <>
      Тот же путь без <code>items</code> — сервер отвечает <code>400</code> и списком ошибок
      контракта.
    </>
  ),
  loose: (
    <>
      <code>POST …/orders-loose</code> без проверки схемы принимает произвольный JSON (
      <code>200</code>) — антипример code-first.
    </>
  ),
}

const CODE_INTRO =
  'Учебные роуты `/api/lab/api-first/*`: мини-контракт и валидация тела до создания заказа.'

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  pass: [
    {
      id: 'contract-yaml',
      label: 'contract · orders',
      note: 'Источник истины: обязательный items[] с sku и qty.',
      executable: false,
      languageLabel: 'yaml',
      code: `paths:
  /api/lab/api-first/orders:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [items] # ← контракт
              properties:
                items:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [sku, qty]
                    properties:
                      sku: { type: string }
                      qty: { type: integer, minimum: 1 }
      responses:
        "201": { description: Created }
        "400": { description: contract_violation }
`,
    },
    {
      id: 'handler-pass',
      label: 'routes/apiFirstLab.ts · POST',
      note: 'Валидация → 201 только при совпадении со схемой.',
      executable: false,
      languageLabel: 'ts',
      code: `// POST /api/lab/api-first/orders
const checked = validateOrderBody(req.body);
if (!checked.ok) {
  return reply.status(400).send({
    error: 'contract_violation',
    errors: checked.errors, // ← до бизнес-логики
  });
}
return reply.status(201).send({
  ok: true,
  id: 1,
  items: checked.items, // ← по схеме
});
`,
    },
  ],
  fail: [
    {
      id: 'validate',
      label: 'routes/apiFirstLab.ts · validate',
      note: 'Ручная проверка полей контракта без тяжёлой OpenAPI-библиотеки.',
      executable: false,
      languageLabel: 'ts',
      code: `function validateOrderBody(body) {
  const errors = [];
  if (!Array.isArray(body?.items)) {
    errors.push('items: required array'); // ← fail-кейс
    return { ok: false, errors };
  }
  // sku: string, qty: integer >= 1
  return errors.length ? { ok: false, errors } : { ok: true, items };
}
`,
    },
    {
      id: 'fail-body',
      label: 'client · bad body',
      note: 'Запрос без items — ожидаемый 400.',
      executable: false,
      languageLabel: 'ts',
      code: `await fetch('/api/lab/api-first/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ note: 'без items' }), // ← ломает контракт
});
// → 400 { error: 'contract_violation', errors: […] }
`,
    },
  ],
  loose: [
    {
      id: 'loose-route',
      label: 'routes/apiFirstLab.ts · loose',
      note: 'Без схемы сервер эхом принимает любой JSON.',
      executable: false,
      languageLabel: 'ts',
      code: `// POST /api/lab/api-first/orders-loose
app.post('/api/lab/api-first/orders-loose', async (req, reply) => {
  return reply.status(200).send({
    ok: true,
    echo: req.body, // ← нет validateOrderBody
    note: 'без контракта — приняли что угодно',
  });
});
`,
    },
    {
      id: 'loose-client',
      label: 'client · произвольный JSON',
      note: 'Клиент «угадывает» поля — сервер не спорит.',
      executable: false,
      languageLabel: 'ts',
      code: `await fetch('/api/lab/api-first/orders-loose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ whatever: true, qty: 'oops' }), // ← drift
});
// → 200 { echo: { whatever: true, qty: 'oops' } }
`,
    },
  ],
}

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function nodeCls(...parts: Array<string | false | undefined>) {
  return [labVizStyles.node, ...parts.filter(Boolean)].join(' ')
}

function CaseSwitch({
  value,
  disabled,
  onChange,
}: {
  value: CaseId
  disabled?: boolean
  onChange: (id: CaseId) => void
}) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          disabled={disabled}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  live: LivePayload | null
  focusRef: MutableRefObject<HTMLDivElement | null>
}

function ApiFirstViz({ caseId, phase, live, focusRef }: VizProps) {
  const aOn = phase !== 'idle'
  const bOn = phase === 'b' || phase === 'c' || phase === 'done'
  const cOn = phase === 'c' || phase === 'done'
  const doneOn = phase === 'done'
  const bad = doneOn && live != null && !live.ok

  if (caseId === 'loose') {
    const title = 'code-first · без схемы'
    const meta = !doneOn
      ? phase === 'idle'
        ? 'ожидание'
        : phase === 'a'
          ? 'fetch…'
          : 'handler…'
      : live
        ? `${live.status} · ${live.summary}`
        : 'done'

    return (
      <LabVizPanel title={title} meta={meta}>
        <div className={styles.looseRow}>
          <div
            className={nodeCls(
              aOn && !doneOn && labVizStyles.nodeActive,
              doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>клиент</span>
            <span className={labVizStyles.nodeSub}>любой JSON</span>
          </div>
          <span
            className={`${styles.looseArrow}${bOn ? ` ${styles.looseArrowActive}` : ` ${styles.looseArrowIdle}`}`}
            aria-hidden
          >
            →
          </span>
          <div
            className={nodeCls(
              bOn && !doneOn && labVizStyles.nodeActive,
              doneOn && labVizStyles.nodeErr,
              !bOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>handler</span>
            <span className={labVizStyles.nodeSub}>
              {!bOn ? '—' : doneOn ? 'без validate' : 'echo…'}
            </span>
          </div>
          <span
            className={`${styles.looseArrow}${doneOn ? ` ${styles.looseArrowActive}` : ` ${styles.looseArrowIdle}`}`}
            aria-hidden
          >
            →
          </span>
          <div
            ref={focusRef}
            className={nodeCls(
              doneOn && labVizStyles.nodeErr,
              doneOn && labVizStyles.nodeActive,
              !doneOn && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>ответ</span>
            <span className={labVizStyles.nodeSub}>
              {!doneOn ? 'ещё нет' : (live?.summary ?? '200')}
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const isPass = caseId === 'pass'
  const passPath = isPass && bOn
  const failPath = !isPass && bOn
  const passStrong = isPass && cOn
  const failStrong = !isPass && cOn

  const title = isPass ? 'контракт · pass' : 'контракт · fail'
  const meta = !doneOn
    ? phase === 'idle'
      ? 'ожидание'
      : phase === 'a'
        ? 'fetch…'
        : phase === 'b'
          ? 'validate…'
          : isPass
            ? '201…'
            : '400…'
    : live
      ? `${live.status} · ${live.summary}`
      : 'done'

  const outSub = !doneOn
    ? 'ещё нет'
    : live?.errors?.length
      ? live.errors[0]
      : (live?.summary ?? '—')

  return (
    <LabVizPanel title={title} meta={meta}>
      <div className={styles.scheme}>
        <div
          className={`${styles.schemeTop} ${nodeCls(
            aOn && !doneOn && labVizStyles.nodeActive,
            doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>клиент</span>
          <span className={labVizStyles.nodeSub}>
            {isPass ? 'items[] по схеме' : 'тело без items'}
          </span>
        </div>

        <div
          className={`${styles.schemeTop} ${nodeCls(
            bOn && !doneOn && labVizStyles.nodeActive,
            doneOn && !bad && isPass && labVizStyles.nodeOk,
            doneOn && !isPass && labVizStyles.nodeErr,
            !bOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>контракт</span>
          <span className={labVizStyles.nodeSub}>
            {!bOn ? 'validateOrderBody' : doneOn ? (isPass ? 'ok' : 'violation') : 'check…'}
          </span>
        </div>

        <div className={styles.schemeFork} aria-hidden>
          <span
            className={`${styles.schemeForkPass}${
              passPath
                ? ` ${styles.schemeForkPassActive}`
                : ` ${styles.schemeForkIdle}`
            }`}
          >
            pass ↙
          </span>
          <span />
          <span
            className={`${styles.schemeForkFail}${
              failPath
                ? ` ${styles.schemeForkFailActive}`
                : ` ${styles.schemeForkIdle}`
            }`}
          >
            ↘ fail
          </span>
        </div>

        <div
          className={`${styles.schemeBranch}${!passPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              passStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && isPass && !bad && labVizStyles.nodeOk,
              (!passPath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>201 Created</span>
            <span className={labVizStyles.nodeSub}>
              {!passPath ? '—' : doneOn && isPass ? 'заказ' : 'create…'}
            </span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
        </div>

        <div />

        <div
          className={`${styles.schemeBranch}${!failPath && bOn ? ` ${styles.pathOff}` : !bOn ? ` ${styles.dim}` : ''}`}
        >
          <div
            className={nodeCls(
              failStrong && !doneOn && labVizStyles.nodeActive,
              doneOn && !isPass && labVizStyles.nodeErr,
              (!failPath || !bOn) && styles.dim,
            )}
          >
            <span className={labVizStyles.nodeLabel}>400</span>
            <span className={labVizStyles.nodeSub}>
              {!failPath ? '—' : doneOn && !isPass ? 'contract_violation' : 'reject…'}
            </span>
          </div>
          <span className={styles.schemeBranchArrow} aria-hidden>
            ↓
          </span>
        </div>

        <div
          ref={focusRef}
          className={`${styles.schemeOut} ${nodeCls(
            doneOn && isPass && !bad && labVizStyles.nodeOk,
            doneOn && isPass && !bad && labVizStyles.nodeActive,
            doneOn && !isPass && labVizStyles.nodeErr,
            doneOn && !isPass && labVizStyles.nodeActive,
            !doneOn && styles.dim,
          )}`}
        >
          <span className={labVizStyles.nodeLabel}>ответ</span>
          <span className={labVizStyles.nodeSub}>{outSub}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

async function postJson(
  path: string,
  body: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      data = { raw: text }
    }
  }
  return { status: res.status, data }
}

async function fetchLive(caseId: CaseId): Promise<LivePayload> {
  if (caseId === 'pass') {
    const { status, data } = await postJson('/api/lab/api-first/orders', {
      items: [{ sku: 'widget', qty: 2 }],
    })
    return {
      path: 'POST /api/lab/api-first/orders',
      status,
      ok: status === 201 && data.ok === true,
      summary: status === 201 ? '201 · items ok' : `unexpected ${status}`,
    }
  }

  if (caseId === 'fail') {
    const { status, data } = await postJson('/api/lab/api-first/orders', {
      note: 'без items',
    })
    const errors = Array.isArray(data.errors)
      ? (data.errors as string[])
      : ['contract_violation']
    return {
      path: 'POST /api/lab/api-first/orders',
      status,
      ok: status === 400,
      errors,
      summary: status === 400 ? `400 · ${errors[0]}` : `unexpected ${status}`,
    }
  }

  const { status } = await postJson('/api/lab/api-first/orders-loose', {
    whatever: true,
    qty: 'oops',
  })
  return {
    path: 'POST /api/lab/api-first/orders-loose',
    status,
    ok: status === 200,
    summary: status === 200 ? '200 · echo без схемы' : `unexpected ${status}`,
  }
}

export function NetworkApiFirstLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('pass')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LivePayload | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    setLive(null)
    if (focusRef.current)
      gsap.set(focusRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishLive = (payload: LivePayload, hintText: string) => {
    setLive(payload)
    setPhase('done')
    if (caseId === 'fail') {
      log(payload.ok ? 'warn' : 'err', `${payload.path} · ${payload.summary}`)
    } else if (caseId === 'loose') {
      log('warn', `${payload.path} · ${payload.summary}`)
    } else if (payload.ok) {
      log('ok', `${payload.path} · ${payload.summary}`)
    } else {
      log('err', `${payload.path} · ${payload.summary}`)
    }
    setHint(hintText)
  }

  const runLive = async () => {
    setPhase('a')
    try {
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 250))
      setPhase('b')
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : STEP * 300))
      setPhase('c')
      const payload = await fetchLive(caseId)
      const hints: Record<CaseId, string> = {
        pass: 'тело совпало со схемой — 201 до «угадайки» полей',
        fail: 'контракт отклонил тело — 400 и errors[]',
        loose: 'без схемы сервер принял произвольный JSON — клиенты расходятся',
      }
      finishLive(payload, hints[caseId])
      if (focusRef.current && !reducedMotion()) {
        gsap.fromTo(
          focusRef.current,
          { scale: 0.94, opacity: 0.45 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.inOut' },
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      finishLive(
        { path: 'API', status: 0, ok: false, summary: message },
        'API недоступен — поднимите server на :3000 или дождитесь Render',
      )
    } finally {
      setBusy(false)
    }
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    void runLive()
  }

  const reset = () => {
    setBusy(false)
    clear()
    setCaseId('pass')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <CaseSwitch value={caseId} disabled={busy} onChange={selectCase} />

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <ApiFirstViz caseId={caseId} phase={phase} live={live} focusRef={focusRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <CaseSwitch value={caseId} onChange={selectCase} />
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="API first"
      lead="Живой контракт POST /orders: схема до хендлера, 201 / 400 и антипример без проверки."
      problem={problem}
      code={code}
    />
  )
}
