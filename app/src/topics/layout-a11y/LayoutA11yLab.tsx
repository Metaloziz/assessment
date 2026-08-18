import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog, type LabLogKind } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutA11yLab.module.css'

const TOPIC_ID = '177-layout-a11y'
const STEP = 0.6

type CaseId = 'ok' | 'broken'
type Slot = 0 | 1 | 2

type Frame = {
  slot: Slot | 'skip'
  log: { kind: LabLogKind; text: string }
}

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'ok', label: 'Кнопка и подпись' },
  { id: 'broken', label: 'Див и прыжок Tab' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  ok: (
    <>
      Поле с <code>label</code>, обычный <code>button</code> и иконка с <code>aria-label</code> — Tab ходит по кругу, кольцо видно.
    </>
  ),
  broken: (
    <>
      Поле без подписи, <code>div</code> вместо кнопки и <code>tabIndex={'{5}'}</code> без имени — мышь жива, клавиатура нет.
    </>
  ),
}

const HINT: Record<CaseId, string> = {
  ok: 'Итог: обычные теги и имя дают Tab и скринридер без лишнего ARIA.',
  broken: 'Итог: сначала button, label и кольцо фокуса; div и tabindex больше нуля — в тупик.',
}

const FRAMES: Record<CaseId, Frame[]> = {
  ok: [
    { slot: 0, log: { kind: 'info', text: 'Tab → поле с подписью «Заголовок»' } },
    { slot: 1, log: { kind: 'ok', text: 'Tab → кнопка «Сохранить»' } },
    { slot: 2, log: { kind: 'ok', text: 'Tab → «Закрыть» из aria-label' } },
  ],
  broken: [
    { slot: 0, log: { kind: 'warn', text: 'Tab → поле без подписи, имя пустое' } },
    { slot: 'skip', log: { kind: 'warn', text: 'див «Сохранить» — Tab пропускает' } },
    { slot: 2, log: { kind: 'err', text: 'tabindex=5 без имени — прыжок и пустой контрол' } },
  ],
}

const SNIPPET_OK: InteractiveSnippet = {
  id: 'toolbar-ok',
  label: 'Toolbar.tsx',
  note: 'Нативные контролы и имя. tabindex больше нуля не нужен.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { onSave: () => void; onClose: () => void };

export const Toolbar = ({ onSave, onClose }: Props) => (
  <div className="toolbar">
    <label htmlFor="title">
      Заголовок
      <input id="title" name="title" /> {/* ← имя из label */}
    </label>

    <button type="button" onClick={onSave}>
      Сохранить {/* ← роль и Tab из коробки */}
    </button>

    <button type="button" aria-label="Закрыть" onClick={onClose}>
      <span aria-hidden="true">✕</span> {/* ← иконка не дублирует имя */}
    </button>
  </div>
);`,
}

const SNIPPET_BROKEN: InteractiveSnippet = {
  id: 'toolbar-broken',
  label: 'ToolbarBroken.tsx',
  note: 'Мышь есть, Tab и имени нет; tabindex>0 вырывает из потока.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = { onSave: () => void; onClose: () => void };

export const ToolbarBroken = ({ onSave, onClose }: Props) => (
  <div className="toolbar">
    {/* ← нет label — для скринридера поле безымянное */}
    <input placeholder="Заголовок" />

    {/* ← мышь ок; Tab и Space/Enter — нет */}
    <div className="btn" onClick={onSave}>
      Сохранить
    </div>

    {/* ← tabindex>0 прыгает по странице; имени нет */}
    <div className="icon" tabIndex={5} onClick={onClose}>
      ✕
    </div>
  </div>
);`,
}

const SNIPPET_FOCUS_OK: InteractiveSnippet = {
  id: 'focus-ok',
  label: 'focus.css',
  note: 'Сняли системный outline — вернули кольцо для клавиатуры.',
  executable: false,
  languageLabel: 'css',
  code: `.button:focus-visible {
  outline: 2px solid var(--accent); /* ← кольцо для Tab */
  outline-offset: 2px;
}`,
}

const SNIPPET_FOCUS_BROKEN: InteractiveSnippet = {
  id: 'focus-broken',
  label: 'focus.css',
  note: 'Фокус в DOM есть, глазу кольца нет.',
  executable: false,
  languageLabel: 'css',
  code: `.btn {
  outline: none; /* ← Tab ходит, курсора не видно */
}

.icon {
  outline: none;
  /* tabindex: 5 — в CSS не лечится, ломает порядок всего документа */
}`,
}

const CODE_INTRO: Record<CaseId, string> = {
  ok: 'Подпись к полю, `button` с текстом, `aria-label` на иконке, кольцо `:focus-visible`.',
  broken: '`placeholder` вместо `label`, `div` вместо кнопки, `tabindex={5}` без имени.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  ok: [SNIPPET_OK, SNIPPET_FOCUS_OK],
  broken: [SNIPPET_BROKEN, SNIPPET_FOCUS_BROKEN],
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const playTimeline = (
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) => {
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

const focusEl = (el: HTMLElement | null) => {
  el?.focus({ preventScroll: true })
}

type SlotRefs = {
  field: MutableRefObject<HTMLInputElement | null>
  save: MutableRefObject<HTMLElement | null>
  close: MutableRefObject<HTMLElement | null>
}

const slotEl = (refs: SlotRefs, slot: Slot) => {
  if (slot === 0) return refs.field.current
  if (slot === 1) return refs.save.current
  return refs.close.current
}

type VizProps = {
  caseId: CaseId
  live: boolean
  cursor: number
  done: boolean
  refs: SlotRefs
  cardRefs: MutableRefObject<Array<HTMLDivElement | null>>
}

const A11yLiveViz = ({ caseId, live, cursor, done, refs, cardRefs }: VizProps) => {
  const ok = caseId === 'ok'
  const frames = FRAMES[caseId]
  const frame = cursor >= 0 ? frames[cursor] : null
  const running = cursor >= 0
  const skipped = frame?.slot === 'skip'
  const activeSlot = typeof frame?.slot === 'number' ? frame.slot : null
  const tabLive = live ? 0 : -1
  const brokenJump = live ? 5 : -1

  const slots = ok
    ? [
        { key: 'field', title: 'Поле', meta: 'подпись → input' },
        { key: 'save', title: 'Сохранить', meta: '<button>' },
        { key: 'close', title: 'Закрыть', meta: 'aria-label' },
      ]
    : [
        { key: 'field', title: 'Поле', meta: 'только placeholder' },
        { key: 'save', title: 'Сохранить', meta: 'div + клик' },
        { key: 'close', title: 'Закрыть', meta: 'tabindex=5, без имени' },
      ]

  return (
    <LabVizPanel
      title="Панель действий"
      meta={ok ? 'Tab: поле → кнопка → закрыть' : 'мышь да · Tab путается'}
    >
      <div className={styles.stage}>
        {slots.map((slot, i) => {
          const isActive = activeSlot === i
          const isSkip = skipped && i === 1
          const cardCls = [
            styles.card,
            running && styles.cardOn,
            done && ok && styles.cardOk,
            done && !ok && styles.cardWarn,
            isActive && ok && styles.cardFocusOk,
            isActive && !ok && styles.cardFocusBroken,
            isSkip && styles.cardSkip,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={slot.key}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className={cardCls}
            >
              <div className={styles.cardMeta}>
                <span className={styles.cardTitle}>{slot.title}</span>
                <span className={styles.cardHint}>{slot.meta}</span>
              </div>
              <div className={styles.cardBody}>
                {i === 0 && ok ? (
                  <label className={styles.fieldOk}>
                    <span className={styles.labelText}>Заголовок</span>
                    <input
                      ref={refs.field}
                      className={styles.input}
                      id="a11y-lab-title"
                      name="title"
                      tabIndex={tabLive}
                      defaultValue="Отчёт"
                    />
                  </label>
                ) : null}
                {i === 0 && !ok ? (
                  <label className={styles.fieldBroken}>
                    <input
                      ref={refs.field}
                      className={styles.input}
                      tabIndex={tabLive}
                      placeholder="Заголовок"
                    />
                  </label>
                ) : null}
                {i === 1 && ok ? (
                  <button
                    ref={refs.save as MutableRefObject<HTMLButtonElement | null>}
                    type="button"
                    tabIndex={tabLive}
                    className={styles.btnNative}
                  >
                    Сохранить
                  </button>
                ) : null}
                {i === 1 && !ok ? (
                  <div
                    ref={refs.save}
                    className={styles.btnDiv}
                    onClick={() => undefined}
                  >
                    Сохранить
                  </div>
                ) : null}
                {i === 2 && ok ? (
                  <button
                    ref={refs.close as MutableRefObject<HTMLButtonElement | null>}
                    type="button"
                    tabIndex={tabLive}
                    className={styles.btnIcon}
                    aria-label="Закрыть"
                  >
                    <span aria-hidden>×</span>
                  </button>
                ) : null}
                {i === 2 && !ok ? (
                  <div
                    ref={refs.close}
                    className={styles.btnDivIcon}
                    tabIndex={brokenJump}
                    onClick={() => undefined}
                  >
                    ×
                  </div>
                ) : null}
              </div>
              <div className={styles.tabBadge} aria-hidden>
                {ok
                  ? running
                    ? `Tab ${i + 1}`
                    : 'Tab'
                  : i === 2
                    ? 'tabindex 5'
                    : i === 1
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

export const LayoutA11yLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('ok')
  const [cursor, setCursor] = useState(-1)
  const [live, setLive] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const fieldRef = useRef<HTMLInputElement | null>(null)
  const saveRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([null, null, null])
  const refs: SlotRefs = { field: fieldRef, save: saveRef, close: closeRef }

  const resetViz = () => {
    setCursor(-1)
    setLive(false)
    setHint(null)
    setFinished(false)
    if (document.activeElement instanceof HTMLElement) {
      const root = document.activeElement
      if (fieldRef.current === root || saveRef.current === root || closeRef.current === root) {
        root.blur()
      }
    }
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const applyFrame = (index: number, withLog: boolean) => {
    const frame = FRAMES[caseId][index]
    setLive(true)
    setCursor(index)
    if (typeof frame.slot === 'number') {
      focusEl(slotEl(refs, frame.slot))
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if (withLog) log(frame.log.kind, frame.log.text)
    if (index === FRAMES[caseId].length - 1) {
      setHint(HINT[caseId])
      setFinished(true)
    }
  }

  const tweenActive = (tl: gsap.core.Timeline, index: number) => {
    const frame = FRAMES[caseId][index]
    const slot = frame.slot === 'skip' ? 1 : frame.slot
    const card = cardRefs.current[slot]
    if (!card) return
    tl.fromTo(card, { y: 4 }, { y: 0, duration: 0.5, ease: 'power2.inOut' }, index * STEP)
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    const frames = FRAMES[caseId]

    playTimeline(
      tlRef,
      frames.map((_, i) => () => applyFrame(i, true)),
      (tl) => {
        frames.forEach((_, i) => tweenActive(tl, i))
      },
      () => setBusy(false),
    )
  }

  const step = () => {
    if (busy || finished) return
    tlRef.current?.kill()
    const next = cursor + 1
    if (next >= FRAMES[caseId].length) return
    if (cursor < 0) clear()
    applyFrame(next, true)
    if (!reducedMotion()) {
      const cardSlot = FRAMES[caseId][next].slot === 'skip' ? 1 : FRAMES[caseId][next].slot
      const card = cardRefs.current[cardSlot]
      if (card) gsap.fromTo(card, { y: 4 }, { y: 0, duration: 0.5, ease: 'power2.inOut' })
    }
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
        <LabButton variant="secondary" disabled={busy || finished} onClick={step}>
          Шаг
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
        Панель доступна, если Tab и скринридер видят те же кнопки и имена, что мышь. Голый{' '}
        <code>div</code> этого не даёт.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <A11yLiveViz
        key={caseId}
        caseId={caseId}
        live={live}
        cursor={cursor}
        done={finished}
        refs={refs}
        cardRefs={cardRefs}
      />

      {hint ? <p className={shell.hint}>{hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
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
      title="Доступность (aria, tabindex & etc.)"
      lead="Сначала обычные теги и кольцо фокуса; ARIA — точечно; tabindex больше нуля путает всю страницу."
      problem={problem}
      code={code}
    />
  )
}
