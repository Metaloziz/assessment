import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabNode, LabVizPanel } from '../../components/lab/LabViz'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './CookiesLab.module.css'

const TOPIC_ID = '57-cookies'
const STEP_MS = 520

/** Base URL for live assessment-server. */
function cookiesApiUrl(path: string): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  const base = fromEnv || 'http://localhost:3000'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

function readDocumentCookieValue(name: string): string | null {
  const part = document.cookie.split('; ').find((p) => p.startsWith(`${name}=`))
  if (!part) return null
  return part.split('=')[1] ?? null
}

type CaseId = 'theme' | 'session' | 'embed'
type Phase = 'idle' | 'set' | 'store' | 'send' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'theme', label: 'Тема сайта' },
  { id: 'session', label: 'Сессия' },
  { id: 'embed', label: 'Виджет на чужом сайте' },
]

const PAIN = (
  <>
    Cookie живёт не сама по себе: важны <code>Set-Cookie</code>, хранение в браузере и момент,
    когда браузер решает приложить её к запросу.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  theme: (
    <>
      Простая настройка <code>theme=dark</code> читается из JS и уходит в запросах без секрета.
    </>
  ),
  session: (
    <>
      Сессионная cookie с <code>HttpOnly</code> и <code>Secure</code> доезжает до сервера, но не
      читается через <code>document.cookie</code>.
    </>
  ),
  embed: (
    <>
      Для iframe или SSO на чужом сайте нужен cross-site сценарий:
      <code>SameSite=None</code> работает только вместе с <code>Secure</code>.
      В этой версии лабы cross-site проверку не делаем live.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  theme: 'Live: сервер ставит `theme`, фронт читает `document.cookie` и сверяет с `/api/cookies/lab/check`.',
  session: 'Live: сервер ставит `session` с `HttpOnly` + `Secure`; JS не видит, но сервер возвращает в `/api/cookies/lab/check`.',
  embed: 'Объясняющий сценарий: `SameSite=None` требует `Secure`, но cross-site live не включаем.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  theme: [
    {
      id: 'theme-client',
      label: 'server/src/routes/cookiesLab.ts',
      note: '`/set-theme`: обычная cookie без `HttpOnly`, значение видно JS.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// SET THEME ← живой Set-Cookie
// ═══════════════════════════════════════════
export async function setTheme(reply) {
  // ← Browser сохранит cookie и добавит к будущим запросам
  const cookie = 'theme=dark; Path=/; Max-Age=2592000; SameSite=Lax'
  reply.raw.setHeader('Set-Cookie', cookie)
}`,
    },
    {
      id: 'theme-request',
      label: 'server/src/routes/cookiesLab.ts',
      note: '`/check`: сервер смотрит Cookie header и возвращает полученные cookies.',
      executable: false,
      languageLabel: 'ts',
      code: `export async function check(req) {
  const received = (req.headers.cookie ?? '').includes('theme=')
  return { received } // ← подтверждение: сервер реально получил theme в Cookie header
}`,
    },
  ],
  session: [
    {
      id: 'session-server',
      label: 'server/src/routes/cookiesLab.ts',
      note: '`/set-session`: `HttpOnly` скрывает значение от JS, `Secure` требует secure origin.',
      executable: false,
      languageLabel: 'ts',
      code: `export async function setSession(reply, sessionId: string) {
  const cookie = \`session=\${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400\`
  reply.raw.setHeader('Set-Cookie', cookie)
}`,
    },
    {
      id: 'session-client',
      label: 'server/src/routes/cookiesLab.ts',
      note: '`/check`: сервер увидит session в Cookie header, даже если JS не читает HttpOnly.',
      executable: false,
      languageLabel: 'ts',
      code: `export async function checkSession(req) {
  const cookieHeader = req.headers.cookie ?? ''
  const sessionSeen = cookieHeader.includes('session=')
  return { cookieHeader, sessionSeen } // ← это и проверяет live
}`,
    },
  ],
  embed: [
    {
      id: 'embed-server',
      label: 'server/widget/cookie.ts',
      note: 'Cross-site cookie для iframe/SSO требует `SameSite=None; Secure`.',
      executable: false,
      languageLabel: 'ts',
      code: `export function setEmbedCookie(res: Response, widgetToken: string) {
  res.setHeader(
    'Set-Cookie',
    [
      \`widgetSession=\${widgetToken}\`,
      'Path=/',
      'HttpOnly',
      'Secure',          // ← обязательно с SameSite=None
      'SameSite=None',   // ← разрешить cross-site отправку
      'Max-Age=1800',
    ].join('; '),
  );
}`,
    },
    {
      id: 'embed-host',
      label: 'src/embed/bootstrap.ts',
      note: 'Виджет живёт на чужом сайте, но запросы идут к своему origin с cookie.',
      executable: false,
      languageLabel: 'ts',
      code: `export async function loadWidgetFrame() {
  return fetch('https://widget.example.com/api/bootstrap', {
    credentials: 'include', // ← browser приложит widgetSession
  });
}

// Без SameSite=None cookie в cross-site iframe обычно не поедет.`,
    },
  ],
}

const CASE_HINT: Record<CaseId, string> = {
  theme: 'настройку можно читать из JS, но секреты сюда не кладут',
  session: 'сервер получил cookie, а JS токен так и не увидел',
  embed: 'в этой версии cross-site live не проверяем, только объясняем правило SameSite/secure',
}

function clearTimerBag(timerBag: MutableRefObject<number[]>) {
  timerBag.current.forEach((id) => window.clearTimeout(id))
  timerBag.current = []
}

function CookieFlowViz({ caseId, phase }: { caseId: CaseId; phase: Phase }) {
  const setActive = phase === 'set'
  const jarActive = phase === 'store'
  const requestActive = phase === 'send' || phase === 'done'
  const done = phase === 'done'

  const setNodeState = done ? 'ok' : setActive ? 'active' : 'idle'
  const jarNodeState = done ? 'ok' : jarActive ? 'active' : 'idle'
  const requestNodeState = done ? 'ok' : requestActive ? 'active' : 'idle'

  const header =
    caseId === 'theme'
      ? 'Set-Cookie: theme=dark; Path=/; Max-Age=2592000; SameSite=Lax'
      : caseId === 'session'
        ? 'Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax'
        : 'Set-Cookie: widgetSession=w123; Path=/; HttpOnly; Secure; SameSite=None'

  const jsStatus =
    caseId === 'theme'
      ? 'JS читает value'
      : caseId === 'session'
        ? 'JS доступа нет'
        : 'JS доступа нет'

  const requestStatus =
    caseId === 'theme'
      ? 'GET /api/cookies/lab/check'
      : caseId === 'session'
        ? 'GET /api/cookies/lab/check'
        : 'cross-site iframe'

  const requestCookie =
    caseId === 'theme'
      ? 'Cookie: theme=dark'
      : caseId === 'session'
        ? 'Cookie: session=abc123'
        : 'Cookie: widgetSession=w123'

  return (
    <LabVizPanel title="Жизненный цикл cookie" meta={requestStatus}>
      <div className={styles.flow}>
        <LabNode
          label="Ответ сервера"
          sub={setActive || done ? header : 'ждёт Set-Cookie'}
          state={setNodeState}
          className={styles.flowNode}
        />
        <div className={styles.arrow} aria-hidden>
          →
        </div>
        <LabNode
          label="Cookie jar"
          sub={jarActive || requestActive || done ? jsStatus : 'браузер ещё не сохранил'}
          state={jarNodeState}
          className={styles.flowNode}
        />
        <div className={styles.arrow} aria-hidden>
          →
        </div>
        <LabNode
          label="Следующий запрос"
          sub={requestActive || done ? requestCookie : 'браузер ещё не добавил Cookie'}
          state={requestNodeState}
          className={styles.flowNode}
        />
      </div>

      <div className={styles.notes}>
        <div className={styles.noteCard}>
          <strong>JS</strong>
          <span>{jsStatus}</span>
        </div>
        <div className={styles.noteCard}>
          <strong>Отправка</strong>
          <span>{requestStatus}</span>
        </div>
        <div className={styles.noteCard}>
          <strong>DevTools</strong>
          <span>Application + Network</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

export const CookiesLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('theme')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timersRef = useRef<number[]>([])

  const resetViz = () => {
    clearTimerBag(timersRef)
    setPhase('idle')
    setHint(null)
    setBusy(false)
  }

  useEffect(() => {
    return () => clearTimerBag(timersRef)
  }, [])

  const selectCase = (next: CaseId) => {
    clear()
    resetViz()
    setCaseId(next)
  }

  const run = async () => {
    clear()
    resetViz()
    setBusy(true)
    setHint(null)

    // embed остаётся объясняющим сценарием: cross-site top-level требует другой конструкции.
    if (caseId === 'embed') {
      setPhase('set')
      log('info', 'server -> Set-Cookie: widgetSession=w123; HttpOnly; Secure; SameSite=None (симуляция)')

      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('store')
          log('ok', 'браузер принимает правила cookie; cross-site эффект не проверяли live')
        }, STEP_MS),
      )

      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('send')
          log('ok', 'ожидаем: cross-site отправка зависит от SameSite=None + Secure')
        }, STEP_MS * 2),
      )

      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('done')
          setBusy(false)
          setHint(CASE_HINT.embed)
          log('warn', 'для точного SameSite=None нужно реальное cross-site top-level')
        }, STEP_MS * 3),
      )
      return
    }

    try {
      setPhase('set')

      if (caseId === 'theme') {
        const setUrl = cookiesApiUrl('/api/cookies/lab/set-theme')
        const setRes = await fetch(setUrl, { method: 'GET', credentials: 'include' })
        const setData = (await setRes.json()) as { setCookie: string }
        log('ok', `set-theme: ${setRes.status} · ${setData.setCookie}`)

        setPhase('store')
        await new Promise((r) => setTimeout(r, 280))

        const themeValue = readDocumentCookieValue('theme')
        if (themeValue) log('ok', `document.cookie содержит theme=${themeValue}`)
        else log('warn', 'theme не появился в document.cookie — проверь Application → Cookies')

        setPhase('send')
        const checkUrl = cookiesApiUrl('/api/cookies/lab/check')
        const checkRes = await fetch(checkUrl, { method: 'GET', credentials: 'include' })
        const checkData = (await checkRes.json()) as { received: Record<string, string> }
        const receivedTheme = checkData.received.theme
        if (receivedTheme) log('ok', `сервер увидел Cookie: theme=${receivedTheme}`)
        else log('err', 'сервер НЕ увидел theme в Cookie header')

        setPhase('done')
        setBusy(false)
        setHint(CASE_HINT.theme)
        log('warn', 'для preference — ок, для секрета — нет')
        return
      }

      // session
      const setUrl = cookiesApiUrl('/api/cookies/lab/set-session')
      const setRes = await fetch(setUrl, { method: 'GET', credentials: 'include' })
      const setData = (await setRes.json()) as { setCookie: string }
      log('ok', `set-session: ${setRes.status} · ${setData.setCookie}`)

      setPhase('store')
      await new Promise((r) => setTimeout(r, 280))

      const sessionValue = readDocumentCookieValue('session')
      if (!sessionValue) log('ok', 'document.cookie НЕ содержит session (это и есть HttpOnly)')
      else log('warn', 'session вдруг видна в document.cookie — проверь HttpOnly в Set-Cookie')

      setPhase('send')
      const checkUrl = cookiesApiUrl('/api/cookies/lab/check')
      const checkRes = await fetch(checkUrl, { method: 'GET', credentials: 'include' })
      const checkData = (await checkRes.json()) as { received: Record<string, string> }
      const receivedSession = checkData.received.session
      if (receivedSession) log('ok', `сервер увидел Cookie: session=${receivedSession}`)
      else log('err', 'сервер НЕ увидел session в Cookie header (возможно, Secure не принялся)')

      setPhase('done')
      setBusy(false)
      setHint(CASE_HINT.session)
      log('info', 'DevTools: Application покажет флаги, Network подтвердит отправку Cookie')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('err', msg)
      setPhase('done')
      setBusy(false)
      setHint('ошибка live-запросов — проверь Base URL и CORS')
    }
  }

  const reset = () => {
    clear()
    setCaseId('theme')
    resetViz()
    void fetch(cookiesApiUrl('/api/cookies/lab/clear'), { method: 'GET', credentials: 'include' }).catch(() => null)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={busy}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <CookieFlowViz caseId={caseId} phase={phase} />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Set-Cookie -> Browser -> Cookie"
      lead="Три практических кейса: preference в JS, серверная сессия и cross-site cookie для iframe/SSO."
      problem={problem}
      code={code}
    />
  )
}
