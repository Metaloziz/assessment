import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './PatternsDependencyInjectionLab.module.css'

const TOPIC_ID = '162-patterns-dependency-injection'
const STEP = 0.7

type CaseId = 'hardwired' | 'inject' | 'swap'
type Phase = 'idle' | 'need' | 'plug' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'hardwired', label: 'new внутри' },
  { id: 'inject', label: 'Inject' },
  { id: 'swap', label: 'FakeHttp' },
]

const CODE_INTRO: Record<CaseId, string> = {
  hardwired: '`OrderService` сам делает `new HttpClient` — снаружи не подменить.',
  inject: '`createOrderService(api, log)`: зависимости снаружи; стыковка в `main.ts`.',
  swap: 'Тот же `createOrderService`, в тесте / стенде — `FakeHttp`.',
}

const SNIPPET_HARD: InteractiveSnippet = {
  id: 'order-hardwired',
  label: 'src/orders/createOrderService.hard.ts',
  note: 'Жёстко: `new HttpClient` внутри — Fake не воткнуть без правки сервиса.',
  executable: false,
  languageLabel: 'ts',
  code: `class HttpClient {
  constructor(private base: string) {}
  post(url: string, body: unknown) {
    return fetch(this.base + url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

// ═══════════════════════════════════════════
// HARDWIRED ← создание зависимости внутри
// ═══════════════════════════════════════════
export function createOrderService() {
  const api = new HttpClient('/api'); // ← нельзя подменить снаружи
  return {
    async place(id: string) {
      return api.post('/orders', { id });
    },
  };
}`,
}

const SNIPPET_DI: InteractiveSnippet = {
  id: 'order-di',
  label: 'src/orders/createOrderService.ts',
  note: 'DI: сервис принимает `Http` и `Logger`, сам их не создаёт.',
  executable: false,
  languageLabel: 'ts',
  code: `export type Http = {
  post: (url: string, body: unknown) => Promise<unknown>;
};
export type Logger = { info: (msg: string) => void };

// ═══════════════════════════════════════════
// DI ← зависимости приходят аргументами
// ═══════════════════════════════════════════
export function createOrderService(api: Http, log: Logger) {
  return {
    async place(id: string) {
      log.info(\`place \${id}\`); // ← log снаружи
      return api.post('/orders', { id }); // ← api снаружи
    },
  };
}`,
}

const SNIPPET_ROOT: InteractiveSnippet = {
  id: 'main-root',
  label: 'src/main.ts',
  note: 'Composition root: здесь выбирают реализацию и делают inject.',
  executable: false,
  languageLabel: 'ts',
  code: `import { createHttpClient } from './http';
import { createLogger } from './logger';
import { createOrderService } from './orders/createOrderService';

// ═══════════════════════════════════════════
// COMPOSITION ROOT ← единственная стыковка
// ═══════════════════════════════════════════
const api = createHttpClient(import.meta.env.VITE_API);
const log = createLogger('orders');
const orders = createOrderService(api, log); // ← inject

// в тесте:
// createOrderService(fakeHttp, silentLog); // ← swap FakeHttp`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  hardwired: [SNIPPET_HARD],
  inject: [SNIPPET_DI, SNIPPET_ROOT],
  swap: [SNIPPET_DI, SNIPPET_ROOT],
}

const PAIN =
  'Сервису нужен HTTP и логгер. Если он сам делает new — в тесте не подставить Fake; DI принимает зависимости снаружи.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  hardwired: (
    <>
      <code>OrderService</code> сам создаёт <code>HttpClient</code> внутри — слоты снаружи пустые.
    </>
  ),
  inject: (
    <>
      Composition root подключает боевой <code>Http</code> и <code>Logger</code> в слоты сервиса.
    </>
  ),
  swap: (
    <>
      Тот же сервис, в слот <code>api</code> — <code>FakeHttp</code> (тест / стенд без сети).
    </>
  ),
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  plugRef: MutableRefObject<HTMLDivElement | null>
}

function DiViz({ phase, caseId, plugRef }: VizProps) {
  const di = caseId !== 'hardwired'
  const fake = caseId === 'swap'
  const need = phase !== 'idle'
  const plugged = phase === 'plug' || phase === 'done'
  const done = phase === 'done'
  const warn = !di && done

  const apiLabel = !di ? (done ? 'HttpClient' : '—') : fake ? 'FakeHttp' : 'HttpClient'
  const apiSub = !di
    ? done
      ? 'new внутри'
      : 'слот пуст'
    : plugged
      ? fake
        ? 'inject mock'
        : 'inject'
      : 'ждёт root'

  return (
    <LabVizPanel
      title="Слоты зависимостей"
      meta={di ? (fake ? 'swap FakeHttp' : 'composition root') : 'жёсткий new'}
    >
      <div className={styles.layout}>
        <div className={styles.rootRow}>
          <div
            className={nodeCls(
              di && need && labVizStyles.nodeActive,
              di && done && labVizStyles.nodeOk,
              !di && styles.nodeSkipped,
            )}
          >
            <span className={labVizStyles.nodeLabel}>{di ? 'CompositionRoot' : '—'}</span>
            <span className={labVizStyles.nodeSub}>{di ? 'main.ts' : 'нет root'}</span>
          </div>
        </div>

        <div
          className={nodeCls(
            need && labVizStyles.nodeActive,
            done && (di ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.consumer,
          )}
        >
          <span className={labVizStyles.nodeLabel}>OrderService</span>
          <span className={labVizStyles.nodeSub}>
            {done ? (di ? 'place() готов' : 'связан намертво') : 'нужны api, log'}
          </span>
        </div>

        <div className={styles.slots} ref={plugRef}>
          <div
            className={nodeCls(
              plugged && labVizStyles.nodeActive,
              done && (di ? labVizStyles.nodeOk : styles.nodeWarn),
              styles.plug,
              warn && styles.nodeWarn,
            )}
          >
            <span className={labVizStyles.nodeLabel}>api: {apiLabel}</span>
            <span className={labVizStyles.nodeSub}>{apiSub}</span>
          </div>
          <div
            className={nodeCls(
              di && plugged && labVizStyles.nodeActive,
              di && done && labVizStyles.nodeOk,
              !di && styles.nodeSkipped,
              styles.plug,
            )}
          >
            <span className={labVizStyles.nodeLabel}>log: {di ? 'Logger' : '—'}</span>
            <span className={labVizStyles.nodeSub}>
              {di ? (plugged ? 'inject' : 'слот') : 'не снаружи'}
            </span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function PatternsDependencyInjectionLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('hardwired')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const plugRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (plugRef.current) gsap.set(plugRef.current, { clearProps: 'transform,opacity' })
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    const di = caseId !== 'hardwired'
    const fake = caseId === 'swap'

    playTimeline(
      tlRef,
      [
        () => setPhase('need'),
        () => setPhase(di ? 'plug' : 'need'),
        () => {
          setPhase('done')
          if (!di) {
            log('warn', 'OrderService → new HttpClient() внутри')
            setHint('снаружи слот не заполнить — Fake не воткнуть')
          } else if (fake) {
            log('ok', 'Root → FakeHttp + Logger → OrderService')
            setHint('тот же createOrderService, другая реализация api')
          } else {
            log('ok', 'Root → HttpClient + Logger → OrderService')
            setHint('зависимости пришли аргументами, не new внутри')
          }
        },
      ],
      (tl) => {
        if (!plugRef.current || !di) return
        gsap.set(plugRef.current, { opacity: 0.45, y: 8 })
        tl.to(plugRef.current, { opacity: 1, y: 0 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setCaseId('hardwired')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

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

      <DiViz phase={phase} caseId={caseId} plugRef={plugRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
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
      title="Dependency Injection"
      lead="Слоты api / log: жёсткий new внутри vs inject с composition root и FakeHttp."
      problem={problem}
      code={code}
    />
  )
}
