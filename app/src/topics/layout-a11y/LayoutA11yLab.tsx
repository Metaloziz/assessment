import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutA11yLab.module.css'

const TOPIC_ID = '177-layout-a11y'
const STEP = 0.6

type CaseId = 'ok' | 'broken'
type Phase = 'idle' | 'focus0' | 'focus1' | 'focus2' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ok', label: 'Натив + имя' },
  { id: 'broken', label: 'div / без имени' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ok: (
    <>
      Поле с <code>label</code>, <code>button</code> с текстом и иконка с <code>aria-label</code> — Tab и фокус идут по кругу.
    </>
  ),
  broken: (
    <>
      <code>div</code> вместо кнопки, иконка без имени, <code>outline: none</code> — мышь жива, клавиатура и AT нет.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'toolbar-ok',
    label: 'Toolbar.tsx',
    note: 'Нативные контролы + accessible name. tabindex>0 не нужен.',
    executable: false,
    code: `export function Toolbar() {
  return (
    <div className="toolbar">
      <label htmlFor="title">
        Заголовок
        <input id="title" name="title" /> {/* ← имя из label */}
      </label>

      <button type="button">Сохранить</button> {/* ← роль + Tab из коробки */}

      <button type="button" aria-label="Закрыть">
        <span aria-hidden="true">✕</span> {/* ← иконка не дублирует имя */}
      </button>
    </div>
  );
}`,
  },
  {
    id: 'toolbar-broken',
    label: 'ToolbarBroken.tsx',
    note: 'Антипример: div-клик, нет имени, tabindex>0 путает порядок.',
    executable: false,
    code: `export function ToolbarBroken() {
  return (
    <div className="toolbar">
      {/* ← нет label / id — имя поля пустое для AT */}
      <input placeholder="Заголовок" />

      {/* ← мышь ок; Tab и Space/Enter — нет */}
      <div className="btn" onClick={save}>
        Сохранить
      </div>

      {/* ← tabindex>0 вырывает из потока; нет accessible name */}
      <div
        className="icon"
        tabIndex={5}
        onClick={close}
      >
        ✕
      </div>
    </div>
  );
}`,
  },
  {
    id: 'focus-css',
    label: 'focus.css',
    note: 'Убрали outline — обязаны дать :focus-visible.',
    executable: false,
    languageLabel: 'css',
    code: `/* ← OK */
.button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ← BROKEN: фокус есть в DOM, глазу не видно */
.btn {
  outline: none;
}`,
  },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    defaults: { duration: 0.5, ease: 'power2.inOut' },
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
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function focusIndex(phase: Phase): number | null {
  if (phase === 'focus0') return 0
  if (phase === 'focus1') return 1
  if (phase === 'focus2') return 2
  if (phase === 'done') return 2
  return null
}

function DesignA11yViz({ phase, caseId, stageRef }: VizProps) {
  const ok = caseId === 'ok'
  const active = focusIndex(phase)
  const running = phase !== 'idle'

  const slots = ok
    ? [
        { key: 'field', title: 'Поле', meta: 'label → input', kind: 'field' as const },
        { key: 'save', title: 'Сохранить', meta: '<button>', kind: 'button' as const },
        { key: 'close', title: '✕', meta: 'aria-label="Закрыть"', kind: 'icon' as const },
      ]
    : [
        { key: 'field', title: 'Поле', meta: 'только placeholder', kind: 'field' as const },
        { key: 'save', title: 'Сохранить', meta: '<div onClick>', kind: 'div' as const },
        { key: 'close', title: '✕', meta: 'tabindex={5}, без имени', kind: 'divIcon' as const },
      ]

  return (
    <LabVizPanel
      title="Панель действий"
      meta={ok ? 'Tab: поле → кнопка → закрыть' : 'мышь да · Tab/AT нет'}
    >
      <div ref={stageRef} className={styles.stage}>
        {slots.map((slot, i) => {
          const isFocus = active === i
          const cardCls = [
            styles.card,
            running && styles.cardOn,
            phase === 'done' && ok && styles.cardOk,
            phase === 'done' && !ok && styles.cardWarn,
            isFocus && ok && styles.cardFocusOk,
            isFocus && !ok && styles.cardFocusBroken,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={slot.key} className={cardCls}>
              <div className={styles.cardMeta}>
                <span className={styles.cardTitle}>{slot.title === '✕' ? 'Иконка' : slot.title}</span>
                <span className={styles.cardHint}>{slot.meta}</span>
              </div>
              <div className={styles.cardBody}>
                {slot.kind === 'field' && (
                  <label className={ok ? styles.fieldOk : styles.fieldBroken}>
                    {ok ? <span className={styles.labelText}>Заголовок</span> : null}
                    <input
                      className={styles.input}
                      readOnly
                      tabIndex={-1}
                      placeholder={ok ? '' : 'Заголовок'}
                      value={ok ? 'Отчёт' : ''}
                      aria-hidden
                    />
                  </label>
                )}
                {slot.kind === 'button' && (
                  <button type="button" tabIndex={-1} className={styles.btnNative}>
                    Сохранить
                  </button>
                )}
                {slot.kind === 'icon' && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.btnIcon}
                    aria-label="Закрыть"
                  >
                    <span aria-hidden>×</span>
                  </button>
                )}
                {slot.kind === 'div' && (
                  <div className={styles.btnDiv} role="presentation">
                    Сохранить
                  </div>
                )}
                {slot.kind === 'divIcon' && (
                  <div className={styles.btnDivIcon} role="presentation">
                    ×
                  </div>
                )}
              </div>
              <div className={styles.tabBadge} aria-hidden>
                {ok
                  ? running
                    ? `Tab ${i + 1}`
                    : 'Tab ?'
                  : slot.kind === 'divIcon'
                    ? 'tabIndex 5'
                    : slot.kind === 'div'
                      ? 'не в Tab'
                      : 'слабое имя'}
              </div>
            </div>
          )
        })}
      </div>
    </LabVizPanel>
  )
}

export function LayoutA11yLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('ok')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setHint(null)
    if (stageRef.current) gsap.set(stageRef.current, { clearProps: 'transform,opacity' })
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
    const ok = caseId === 'ok'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('focus0')
          log('info', ok ? 'Tab → поле с label «Заголовок»' : 'Tab → input без устойчивого имени')
        },
        () => {
          setPhase('focus1')
          if (ok) log('ok', 'Tab → <button>Сохранить</button>, Space/Enter')
          else log('warn', 'div.onClick — фокуса нет, Tab пропускает')
        },
        () => {
          setPhase('focus2')
          if (ok) log('ok', 'Tab → кнопка с aria-label="Закрыть"')
          else log('err', 'div tabIndex={5} без имени — прыжок и пустой AT')
        },
        () => {
          setPhase('done')
          log(ok ? 'ok' : 'err', ok ? 'Имена + фокус-кольцо на месте' : 'Мышиный UI без клавиатуры/AT')
        },
      ],
      (tl) => {
        if (stageRef.current) {
          tl.fromTo(
            stageRef.current,
            { opacity: 0.6, y: 5 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          ok
            ? 'Натив и имя дают Tab и скринридер без лишнего ARIA.'
            : 'Сначала button/label/focus-visible; tabindex>0 и голый div — путь в тупик.',
        )
      },
    )
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
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy}
          onClick={() => {
            tlRef.current?.kill()
            setBusy(false)
            clear()
            resetViz()
            setCaseId('ok')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Доступность панели — это Tab, видимый фокус и accessible name. Мышиный{' '}
        <code>div</code> без роли этого не даёт.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <DesignA11yViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Нативные `button`/`label`, `aria-label` на иконке, `:focus-visible`; антипример — `div` и `tabindex={5}`."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Доступность"
      lead="Семантика и фокус сначала; ARIA точечно; tabindex>0 почти никогда."
      problem={problem}
      code={code}
    />
  )
}
