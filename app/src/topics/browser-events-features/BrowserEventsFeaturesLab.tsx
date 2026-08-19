import { useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabVizPanel } from '../../components/lab/LabViz'
import { useLabLog } from '../../components/lab/useLabLog'
import styles from './BrowserEventsFeaturesLab.module.css'

const TOPIC_ID = '268-browser-events-features'

type CaseId = 'flow' | 'delegate'

type FlowFrame = {
  id: string
  node: 'panel' | 'card' | 'button'
  phase: 'capture' | 'target' | 'bubble'
}

type DelegateSnapshot = {
  rawTarget: string
  matchedButton: string
  currentTarget: string
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'flow', label: 'Фазы события' },
  { id: 'delegate', label: 'Делегирование' },
]

const PAIN = (
  <>
    Один клик редко означает один вызов. Браузер решает, как событие идёт по DOM, кто станет{' '}
    <code>target</code>, всплывает ли оно и останется ли слушатель жить после первого срабатывания.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  flow: (
    <>
      Вложенная кнопка показывает путь <code>capture -&gt; target -&gt; bubble</code> и порядок вызова
      обработчиков.
    </>
  ),
  delegate: (
    <>
      Один слушатель на списке ловит клик по вложенному бейджу и через{' '}
      <code>closest()</code> находит нужную кнопку.
    </>
  ),
}

const CASE_HINT: Record<CaseId, string> = {
  flow: 'сначала идут capture-слушатели сверху вниз, потом target и bubble обратно наверх',
  delegate: 'currentTarget остаётся списком, а target указывает на реальный вложенный узел',
}

const CODE_INTRO: Record<CaseId, string> = {
  flow: 'Путь события: один `click` вызывает обработчики в фазах `capture`, `target` и `bubble`.',
  delegate:
    'Делегирование: слушатель висит на контейнере, а нужную кнопку находим через `event.target.closest()`.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  flow: [
    {
      id: 'flow-listeners',
      label: 'src/events/attachFlowListeners.ts',
      note: 'Один `click` проходит capture, target и bubble по цепочке предков.',
      executable: false,
      languageLabel: 'ts',
      code: `const phaseName = (event: Event) =>
  event.eventPhase === Event.CAPTURING_PHASE
    ? 'capture'
    : event.eventPhase === Event.BUBBLING_PHASE
      ? 'bubble'
      : 'target';

export function attachFlowListeners(panel: HTMLElement, card: HTMLElement, button: HTMLButtonElement) {
  const record = (name: string) => (event: Event) => {
    console.log(name, phaseName(event)); // ← видно порядок вызовов
  };

  panel.addEventListener('click', record('panel'), true);  // ← capture
  card.addEventListener('click', record('card'), true);    // ← capture
  button.addEventListener('click', record('button'));      // ← target
  card.addEventListener('click', record('card'));          // ← bubble
  panel.addEventListener('click', record('panel'));        // ← bubble
}`,
    },
    {
      id: 'flow-run',
      label: 'src/events/runFlowDemo.ts',
      note: 'В стенде событие запускается реальным `button.click()`, а не строковой имитацией.',
      executable: false,
      languageLabel: 'ts',
      code: `export function runFlowDemo(button: HTMLButtonElement) {
  button.click(); // ← браузер сам строит путь события
}`,
    },
  ],
  delegate: [
    {
      id: 'delegate-list',
      label: 'src/inbox/useInboxDelegation.ts',
      note: 'Слушатель один на `ul`; `target` может быть вложенным `span` внутри кнопки.',
      executable: false,
      languageLabel: 'ts',
      code: `list.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const button = target.closest<HTMLButtonElement>('[data-action="remove"]');
  if (!button) return;

  const rowId = button.dataset.rowId;
  console.log({
    rawTarget: target.dataset.hit,
    currentTarget: (event.currentTarget as HTMLElement).dataset.hit,
    rowId,
  });
});`,
    },
    {
      id: 'delegate-markup',
      label: 'src/inbox/InboxRow.tsx',
      note: 'Клик прилетает по бейджу внутри кнопки, но обработчик всё равно находит весь action.',
      executable: false,
      languageLabel: 'tsx',
      code: `export const InboxRow = () => (
  <li data-hit="row">
    <button type="button" data-action="remove" data-row-id="order-42">
      <span data-hit="badge">×</span> {/* ← raw target */}
      Удалить
    </button>
  </li>
);`,
    },
  ],
}

const FlowScene = ({
  frames,
  shownCount,
}: {
  frames: FlowFrame[]
  shownCount: number
}) => {
  const shownFrames = frames.slice(0, shownCount)
  const active = shownFrames[shownFrames.length - 1] ?? null
  return (
    <LabVizPanel
      title="Путь `click`"
      meta={active ? `${active.node} · ${active.phase}` : 'ожидание события'}
    >
      <div className={styles.flowScene}>
        <div
          className={[
            styles.eventNode,
            styles.panelBox,
            active?.node === 'panel' ? styles.eventNodeActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <strong>Panel</strong>
          <span>внешний контейнер</span>

          <div
            className={[
              styles.eventNode,
              styles.cardBox,
              active?.node === 'card' ? styles.eventNodeActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <strong>Card</strong>
            <span>вложенный блок</span>

            <div
              className={[
                styles.eventNode,
                styles.buttonBox,
                active?.node === 'button' ? styles.eventNodeActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <strong>Button</strong>
              <span>цель клика</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.inspectGrid}>
        <section className={styles.inspectCard}>
          <div className={styles.inspectHead}>
            <strong>Порядок</strong>
            <span>как браузер вызвал слушатели</span>
          </div>
          <ol className={styles.timeline}>
            {frames.length === 0 ? <li>после шага или запуска здесь появится путь события</li> : null}
            {shownFrames.map((frame) => (
              <li key={frame.id}>
                <code>{frame.node}</code> → <code>{frame.phase}</code>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.inspectCard}>
          <div className={styles.inspectHead}>
            <strong>Итог</strong>
            <span>что важно запомнить</span>
          </div>
          <p className={styles.metricText}>
            {active ? (
              <>
                Сейчас активен узел <code>{active.node}</code> в фазе <code>{active.phase}</code>.
              </>
            ) : (
              'До запуска путь события пуст.'
            )}
          </p>
        </section>
      </div>
    </LabVizPanel>
  )
}

const DelegateScene = ({
  snapshot,
  stage,
}: {
  snapshot: DelegateSnapshot | null
  stage: 0 | 1
}) => (
  <LabVizPanel title="Делегирование списка" meta={snapshot ? snapshot.matchedButton : 'ожидание клика'}>
    <div className={styles.delegateScene}>
      <section className={styles.listCard}>
        <div className={styles.inspectHead}>
          <strong>Inbox list</strong>
          <span>слушатель висит на контейнере</span>
        </div>
        <ul className={styles.inboxList}>
          <li className={styles.inboxRow}>
            <span className={styles.rowText}>Заказ `order-42`</span>
            <button type="button" className={styles.actionButton}>
              <span className={styles.badge}>×</span>
              Удалить
            </button>
          </li>
        </ul>
      </section>

      <section className={styles.inspectCard}>
        <div className={styles.inspectHead}>
          <strong>Inspect</strong>
          <span>target vs currentTarget</span>
        </div>
        <div className={styles.metricStack}>
          <div className={styles.metricRow}>
            <span>raw target</span>
            <code>{snapshot?.rawTarget ?? '—'}</code>
          </div>
          <div className={styles.metricRow}>
            <span>matched button</span>
            <code>{stage >= 1 ? snapshot?.matchedButton ?? '—' : '—'}</code>
          </div>
          <div className={styles.metricRow}>
            <span>currentTarget</span>
            <code>{stage >= 1 ? snapshot?.currentTarget ?? '—' : '—'}</code>
          </div>
        </div>
      </section>
    </div>
  </LabVizPanel>
)

export const BrowserEventsFeaturesLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('flow')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [flowFrames, setFlowFrames] = useState<FlowFrame[]>([])
  const [flowShownCount, setFlowShownCount] = useState(0)
  const [delegateSnapshot, setDelegateSnapshot] = useState<DelegateSnapshot | null>(null)
  const [delegateStage, setDelegateStage] = useState<0 | 1>(0)

  const flowPanelRef = useRef<HTMLDivElement | null>(null)
  const flowCardRef = useRef<HTMLDivElement | null>(null)
  const flowButtonRef = useRef<HTMLButtonElement | null>(null)
  const delegateListRef = useRef<HTMLUListElement | null>(null)
  const delegateBadgeRef = useRef<HTMLSpanElement | null>(null)

  const resetViz = () => {
    setFlowFrames([])
    setFlowShownCount(0)
    setDelegateSnapshot(null)
    setDelegateStage(0)
    setHint(null)
  }

  const selectCase = (next: CaseId) => {
    if (busy) return
    clear()
    setCaseId(next)
    resetViz()
  }

  const captureFlowFrames = (): FlowFrame[] | null => {
    const panel = flowPanelRef.current
    const card = flowCardRef.current
    const button = flowButtonRef.current
    if (!panel || !card || !button) {
      log('err', 'не нашли DOM-узлы для пути события')
      return null
    }

    const frames: FlowFrame[] = []
    const cleanups: Array<() => void> = []
    let seq = 0

    const push = (node: FlowFrame['node']) => (event: Event) => {
      const phase =
        event.eventPhase === Event.CAPTURING_PHASE
          ? 'capture'
          : event.eventPhase === Event.BUBBLING_PHASE
            ? 'bubble'
            : 'target'

      frames.push({
        id: `${node}-${phase}-${seq}`,
        node,
        phase,
      })
      seq += 1
    }

    const attach = (
      el: HTMLElement,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => {
      el.addEventListener('click', listener, options)
      const capture = typeof options === 'boolean' ? options : Boolean(options?.capture)
      cleanups.push(() => el.removeEventListener('click', listener, capture))
    }

    attach(panel, push('panel'), true)
    attach(card, push('card'), true)
    attach(button, push('button'))
    attach(card, push('card'))
    attach(panel, push('panel'))

    button.click()
    cleanups.forEach((fn) => fn())

    return frames
  }

  const captureDelegateSnapshot = (): DelegateSnapshot | null => {
    const list = delegateListRef.current
    const badge = delegateBadgeRef.current
    if (!list || !badge) {
      log('err', 'не нашли DOM-узлы для делегирования')
      return null
    }

    const handler = (event: Event): DelegateSnapshot | null => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return null

      const button = target.closest<HTMLButtonElement>('button[data-action="remove"]')
      if (!button) return null

      const snapshot = {
        rawTarget: target.dataset.hit ?? target.tagName.toLowerCase(),
        matchedButton: button.dataset.rowId ?? 'unknown-row',
        currentTarget:
          (event.currentTarget instanceof HTMLElement && event.currentTarget.dataset.hit) || 'inbox-list',
      }
      return snapshot
    }

    let captured: DelegateSnapshot | null = null
    const wrapped = (event: Event) => {
      captured = handler(event)
    }

    list.addEventListener('click', wrapped)
    badge.click()
    list.removeEventListener('click', wrapped)

    return captured
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)

    if (caseId === 'flow') {
      const frames = captureFlowFrames()
      if (!frames) return
      setFlowFrames(frames)
      setFlowShownCount(frames.length)
      log('ok', frames.map((frame) => `${frame.node}:${frame.phase}`).join(' → '))
      setHint(CASE_HINT.flow)
    } else if (caseId === 'delegate') {
      const snapshot = captureDelegateSnapshot()
      if (!snapshot) return
      setDelegateSnapshot(snapshot)
      setDelegateStage(1)
      log(
        'ok',
        `target=${snapshot.rawTarget}; closest() → ${snapshot.matchedButton}; currentTarget=${snapshot.currentTarget}`,
      )
      setHint(CASE_HINT.delegate)
    } else {
      // no-op
    }

    setBusy(false)
  }

  const step = () => {
    if (busy) return
    setBusy(true)
    clear()

    if (caseId === 'flow') {
      let frames = flowFrames
      if (frames.length === 0) {
        const captured = captureFlowFrames()
        if (!captured) return
        frames = captured
        setFlowFrames(captured)
        setFlowShownCount(0)
        setHint(null)
      }

      setFlowShownCount((prev) => {
        const next = Math.min(prev + 1, frames!.length)
        const active = frames![next - 1]
        if (active) log('info', `шаг: ${active.node} · ${active.phase}`)

        if (next === frames!.length) {
          setHint(CASE_HINT.flow)
          log('ok', 'путь события полностью раскрыт')
        }
        return next
      })
    }

    if (caseId === 'delegate') {
      let snapshot = delegateSnapshot
      if (!snapshot) {
        const captured = captureDelegateSnapshot()
        if (!captured) return
        snapshot = captured
        setDelegateSnapshot(snapshot)
        setDelegateStage(0)
      }

      setDelegateStage((prev) => {
        const next: 0 | 1 = prev === 0 ? 1 : 1
        if (prev === 0 && next === 1) {
          log(
            'info',
            `target=${snapshot!.rawTarget}; closest() → ${snapshot!.matchedButton}; currentTarget=${snapshot!.currentTarget}`,
          )
          setHint(CASE_HINT.delegate)
          log('ok', 'делегирование показало target и currentTarget')
        }
        return next
      })
    }

    setBusy(false)
  }

  const reset = () => {
    clear()
    setCaseId('flow')
    resetViz()
    setBusy(false)
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
        <LabButton variant="secondary" disabled={busy} onClick={step}>
          Шаг
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <div className={styles.hiddenDom}>
        <div ref={flowPanelRef}>
          <div ref={flowCardRef}>
            <button ref={flowButtonRef} type="button">
              Flow target
            </button>
          </div>
        </div>

        <ul ref={delegateListRef} data-hit="inbox-list">
          <li>
            <button type="button" data-action="remove" data-row-id="order-42">
              <span ref={delegateBadgeRef} data-hit="badge">
                ×
              </span>
            </button>
          </li>
        </ul>
      </div>

      {caseId === 'flow' ? (
        <FlowScene frames={flowFrames} shownCount={flowShownCount} />
      ) : null}
      {caseId === 'delegate' ? (
        <DelegateScene snapshot={delegateSnapshot} stage={delegateStage} />
      ) : null}

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
      title="Особенности браузерных событий"
      lead="Живой стенд: путь `click` по фазам и делегирование через `target/closest()`."
      problem={problem}
      code={code}
    />
  )
}
