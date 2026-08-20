import { useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabNode, LabVizPanel, type LabNodeState } from '../../components/lab/LabViz'
import { apiUrl } from '../../lib/apiBase'
import styles from './CsrfLab.module.css'

const TOPIC_ID = '13-csrf'
const AMOUNT = 100

type Scenario = 'open' | 'token' | 'bearer'
type Phase = 'idle' | 'login' | 'request' | 'check' | 'ok' | 'blocked'

const CASES: Array<{ id: Scenario; label: string }> = [
  { id: 'open', label: 'Без защиты' },
  { id: 'token', label: 'CSRF-токен' },
  { id: 'bearer', label: 'Bearer' },
]

const PAIN = (
  <>
    Браузер сам прикладывает session cookie к запросу на API. Если мутация не проверяет секрет из
    вашей формы — чужой сайт может инициировать действие от имени жертвы.
  </>
)

const CASE_BRIEF: Record<Scenario, ReactNode> = {
  open: (
    <>
      Логин → <code>POST /transfer-open</code> только с cookie: перевод проходит, баланс падает.
    </>
  ),
  token: (
    <>
      Сначала перевод без <code>_csrf</code> — отказ; затем с токеном из <code>/csrf</code> — успех.
    </>
  ),
  bearer: (
    <>
      Тот же cookie есть, но API ждёт <code>Authorization: Bearer</code> — без header перевод не
      пройдёт.
    </>
  ),
}

const CASE_HINT: Record<Scenario, string> = {
  open: 'cookie уехала сама — мутация без токена выполнилась',
  token: 'без секрета из сессии сервер ответил 403; с токеном — перевод ок',
  bearer: 'браузер сам Bearer не подставит — классический cookie-CSRF здесь не срабатывает',
}

type LoginRes = {
  ok: boolean
  balance: number
  accessToken: string
}

type TransferRes = {
  ok?: boolean
  balance?: number
  error?: string
  note?: string
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T
}

type FlowVizProps = {
  phase: Phase
  scenario: Scenario
  balance: number | null
}

function CsrfFlowViz({ phase, scenario, balance }: FlowVizProps) {
  const reqState: LabNodeState =
    phase === 'blocked' ? 'err' : phase === 'ok' ? 'ok' : phase === 'idle' ? 'idle' : 'active'
  const cookieState: LabNodeState =
    phase === 'idle' ? 'idle' : phase === 'login' ? 'active' : 'ok'
  const guardState: LabNodeState =
    phase === 'check' ? 'active' : phase === 'ok' ? 'ok' : phase === 'blocked' ? 'err' : 'idle'
  const outState: LabNodeState =
    phase === 'ok' ? 'ok' : phase === 'blocked' ? 'err' : 'idle'

  const guardLabel =
    scenario === 'open' ? 'Без проверки' : scenario === 'token' ? 'Токен?' : 'Bearer?'
  const guardSub =
    phase === 'check'
      ? 'смотрит секрет'
      : phase === 'ok'
        ? scenario === 'open'
          ? 'пропустил'
          : 'совпало'
        : phase === 'blocked'
          ? scenario === 'token'
            ? 'нет / неверный'
            : 'нет header'
          : 'ждёт'

  const outSub =
    phase === 'ok'
      ? `баланс ${balance ?? '—'}`
      : phase === 'blocked'
        ? scenario === 'token'
          ? '403'
          : '401'
        : 'ждёт'

  const arrowCls = (active: boolean, err = false) =>
    `${styles.arrow}${err ? ` ${styles.arrowErr}` : active ? ` ${styles.arrowActive}` : ''}`

  return (
    <LabVizPanel
      title="Мини-банк"
      meta={balance == null ? 'баланс —' : `баланс ${balance} ₽`}
    >
      <div className={styles.balanceRow}>
        <span className={styles.balanceLabel}>Счёт жертвы</span>
        <span
          className={`${styles.balanceValue}${
            phase === 'ok' ? ` ${styles.balanceOk}` : phase === 'blocked' ? ` ${styles.balanceBlocked}` : ''
          }`}
        >
          {balance == null ? '—' : `${balance} ₽`}
        </span>
      </div>

      <div className={styles.flow}>
        <LabNode
          label="Запрос"
          sub={phase === 'login' ? 'логин' : phase === 'idle' ? 'ждёт' : 'POST перевод'}
          state={reqState}
        />
        <span className={arrowCls(phase !== 'idle')}>→</span>
        <LabNode
          label="Cookie"
          sub={
            phase === 'idle'
              ? 'ещё нет'
              : phase === 'login'
                ? 'Set-Cookie'
                : 'session приложена'
          }
          state={cookieState}
        />
        <span className={arrowCls(phase === 'request' || phase === 'check' || phase === 'ok' || phase === 'blocked')}>
          →
        </span>
        <LabNode label={guardLabel} sub={guardSub} state={guardState} />
        <span className={arrowCls(phase === 'ok' || phase === 'blocked', phase === 'blocked')}>
          {phase === 'blocked' ? '✗' : '→'}
        </span>
        <LabNode label="Итог" sub={outSub} state={outState} />
      </div>
    </LabVizPanel>
  )
}

export function CsrfLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('open')
  const [hint, setHint] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const runIdRef = useRef(0)

  const selectCase = (next: Scenario) => {
    if (busy) return
    setScenario(next)
    setHint(null)
    setPhase('idle')
    clear()
  }

  const login = async (): Promise<LoginRes> => {
    const res = await fetch(apiUrl('/api/csrf/lab/login'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`login ${res.status}`)
    return readJson<LoginRes>(res)
  }

  const run = async () => {
    const runId = ++runIdRef.current
    clear()
    setBusy(true)
    setHint(null)
    setPhase('login')

    try {
      const logged = await login()
      if (runId !== runIdRef.current) return
      setBalance(logged.balance)
      log('ok', `логин · баланс ${logged.balance} ₽ · cookie выставлена`)
      setPhase('request')
      await new Promise((r) => setTimeout(r, 280))
      if (runId !== runIdRef.current) return

      if (scenario === 'open') {
        setPhase('check')
        const res = await fetch(apiUrl('/api/csrf/lab/transfer-open'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'attacker', amount: AMOUNT }),
        })
        if (runId !== runIdRef.current) return
        const data = await readJson<TransferRes>(res)
        if (!res.ok) {
          log('err', `перевод ${res.status} · ${data.note ?? data.error ?? 'отказ'}`)
          setPhase('blocked')
          setHint('cookie не доехала — проверьте SameSite/Secure и CORS credentials')
          return
        }
        setBalance(data.balance ?? null)
        log('warn', `перевод −${AMOUNT} ₽ без CSRF-токена · баланс ${data.balance}`)
        setPhase('ok')
        setHint(CASE_HINT.open)
        return
      }

      if (scenario === 'token') {
        setPhase('check')
        const bad = await fetch(apiUrl('/api/csrf/lab/transfer'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'attacker', amount: AMOUNT }),
        })
        if (runId !== runIdRef.current) return
        const badData = await readJson<TransferRes>(bad)
        log('err', `без токена · ${bad.status} · ${badData.note ?? 'csrf'}`)
        setPhase('blocked')
        await new Promise((r) => setTimeout(r, 420))
        if (runId !== runIdRef.current) return

        const tokRes = await fetch(apiUrl('/api/csrf/lab/csrf'), {
          method: 'GET',
          credentials: 'include',
        })
        if (runId !== runIdRef.current) return
        if (!tokRes.ok) throw new Error(`csrf ${tokRes.status}`)
        const tok = await readJson<{ csrf: string }>(tokRes)
        log('info', 'получили _csrf с /csrf (как hidden-поле формы банка)')

        setPhase('check')
        const okRes = await fetch(apiUrl('/api/csrf/lab/transfer'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'friend', amount: AMOUNT, _csrf: tok.csrf }),
        })
        if (runId !== runIdRef.current) return
        const okData = await readJson<TransferRes>(okRes)
        if (!okRes.ok) {
          log('err', `с токеном всё равно ${okRes.status}`)
          setPhase('blocked')
          setHint('токен или сессия не совпали')
          return
        }
        setBalance(okData.balance ?? null)
        log('ok', `с токеном · −${AMOUNT} ₽ · баланс ${okData.balance}`)
        setPhase('ok')
        setHint(CASE_HINT.token)
        return
      }

      // bearer: сначала только cookie
      setPhase('check')
      const noAuth = await fetch(apiUrl('/api/csrf/lab/transfer-bearer'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'attacker', amount: AMOUNT }),
      })
      if (runId !== runIdRef.current) return
      const noAuthData = await readJson<TransferRes>(noAuth)
      log('ok', `только cookie · ${noAuth.status} · ${noAuthData.note ?? 'нет Bearer'}`)
      setPhase('blocked')
      await new Promise((r) => setTimeout(r, 420))
      if (runId !== runIdRef.current) return

      setPhase('check')
      const withAuth = await fetch(apiUrl('/api/csrf/lab/transfer-bearer'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${logged.accessToken}`,
        },
        body: JSON.stringify({ to: 'friend', amount: AMOUNT }),
      })
      if (runId !== runIdRef.current) return
      const withData = await readJson<TransferRes>(withAuth)
      if (!withAuth.ok) {
        log('err', `Bearer ${withAuth.status}`)
        setPhase('blocked')
        setHint('accessToken не принят')
        return
      }
      setBalance(withData.balance ?? null)
      log('ok', `с Bearer · −${AMOUNT} ₽ · баланс ${withData.balance}`)
      setPhase('ok')
      setHint(CASE_HINT.bearer)
    } catch (e) {
      if (runId !== runIdRef.current) return
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setPhase('blocked')
      setHint('сеть или API — роуты /api/csrf/lab/* должны быть на Render')
    } finally {
      if (runId === runIdRef.current) setBusy(false)
    }
  }

  const reset = () => {
    runIdRef.current += 1
    clear()
    setHint(null)
    setScenario('open')
    setPhase('idle')
    setBalance(null)
    setBusy(false)
    void fetch(apiUrl('/api/csrf/lab/logout'), {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={scenario === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={() => void run()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[scenario]}</p>

      <CsrfFlowViz phase={phase} scenario={scenario} balance={balance} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <InteractiveCodePanel
        topicId={TOPIC_ID}
        intro="Учебные маршруты `/api/csrf/lab/*`: cookie-сессия, открытый перевод, synchronizer token и Bearer."
        snippets={[
          {
            id: 'open',
            label: 'server/src/routes/csrfLab.ts',
            note: 'Session cookie + перевод без CSRF-проверки.',
            executable: false,
            code: `// Set-Cookie: csrf_lab_sid=…; HttpOnly; Secure; SameSite=None
app.post('/api/csrf/lab/transfer-open', async (req, reply) => {
  const session = sessionFromCookie(req);
  if (!session) return reply.status(401).send({ error: 'unauthorized' });

  session.balance -= amount; // ← нет проверки _csrf
  return { ok: true, balance: session.balance };
});`,
          },
          {
            id: 'token',
            label: 'server/src/routes/csrfLab.ts',
            note: 'Synchronizer: секрет в сессии и в теле запроса.',
            executable: false,
            code: `app.get('/api/csrf/lab/csrf', async (req) => {
  const session = sessionFromCookie(req);
  session.csrf = crypto.randomBytes(24).toString('hex'); // ←
  return { csrf: session.csrf };
});

app.post('/api/csrf/lab/transfer', async (req, reply) => {
  if (req.body._csrf !== session.csrf) {
    return reply.status(403).send({ error: 'csrf' }); // ← evil.com не знает
  }
  session.balance -= amount;
  return { ok: true, balance: session.balance };
});`,
          },
          {
            id: 'bearer',
            label: 'app client · fetch',
            note: 'Access в memory/header — браузер сам не приклеит с evil.com.',
            executable: false,
            code: `const { accessToken } = await login(); // ← JSON, не cookie

// только credentials — 401
await fetch('/api/csrf/lab/transfer-bearer', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 100 }),
});

// с Bearer — ок
await fetch('/api/csrf/lab/transfer-bearer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${accessToken}\`, // ← не auto-send
  },
  body: JSON.stringify({ amount: 100 }),
});`,
          },
        ]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="CSRF"
      lead="Живой мини-банк на API: cookie уезжает сама, токен закрывает мутацию, Bearer — другая модель."
      problem={problem}
      code={code}
    />
  )
}
