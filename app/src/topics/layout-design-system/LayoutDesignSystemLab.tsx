import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutDesignSystemLab.module.css'

const TOPIC_ID = '176-layout-design-system'
const STEP = 0.65

type CaseId = 'contract' | 'drift'
type Phase = 'idle' | 'paint' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'contract', label: 'Один контракт' },
  { id: 'drift', label: 'Три кнопки' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  contract: (
    <>
      Три экрана рисуют primary через один <code>LabButton</code> — цвет и радиус совпадают.
    </>
  ),
  drift: (
    <>
      Без системы каждый экран свой <code>.btn</code>: светлый, navy и pill — primary уже не один.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'tokens-css',
    label: 'tokens.css',
    note: 'Foundation: цвета кнопки и радиус живут здесь. Hex вне этого файла — дрейф.',
    executable: false,
    languageLabel: 'css',
    code: `:root {
  /* ═══════════════════════════════════════════
     BUTTON TOKENS ← один primary на продукт
     ═══════════════════════════════════════════ */
  --btn-primary-bg: #2f5f8f;       /* ← CONTRACT */
  --btn-primary-border: #5b9bd5;
  --btn-primary-text: #ffffff;
  --btn-primary-hover: #3a74ad;

  --radius-lg: 8px;                /* ← кнопки / инпуты */

  --accent: #69b1ff;
  --text: #ffffffd9;
  --bg-panel: #202020;
}

/* DRIFT (антипример): второй primary рядом с токенами
.uiBtnPrimary {
  background: #69b1ff;
  color: #111;
  border-radius: 4px;
}
*/`,
  },
  {
    id: 'lab-button',
    label: 'LabButton.module.css',
    note: 'Примитив читает только var(--…). Экраны не копируют hex primary.',
    executable: false,
    languageLabel: 'css',
    code: `.button {
  border-radius: var(--radius-lg);
  font: inherit;
  cursor: pointer;
}

.primary {
  /* ← CONTRACT: цвета из tokens.css */
  background: var(--btn-primary-bg);
  border: 1px solid var(--btn-primary-border);
  color: var(--btn-primary-text);
}

.primary:hover {
  background: var(--btn-primary-hover);
}

/* DRIFT (антипример): локальный «свой» primary в топике
.shellBtn {
  background: #2f5f8f;
  border-radius: 8px;
}
*/`,
  },
  {
    id: 'screen-usage',
    label: 'CheckoutScreen.tsx',
    note: 'Экран собирает примитивы. Новый look — через токены/variant, не через новый .btn.',
    executable: false,
    code: `import { LabButton } from './lab/LabButton';

export function CheckoutScreen() {
  return (
    <form>
      {/* ← CONTRACT: один примитив на все экраны */}
      <LabButton variant="primary" type="submit">
        Оплатить
      </LabButton>

      <LabButton variant="ghost" type="button">
        Отмена
      </LabButton>

      {/* DRIFT (антипример): третий look в модуле экрана
      <button className={styles.payNow}>Оплатить</button>
      */}
    </form>
  );
}`,
  },
]

type ScreenId = 'checkout' | 'profile' | 'admin'

const SCREENS: Array<{ id: ScreenId; title: string }> = [
  { id: 'checkout', title: 'Checkout' },
  { id: 'profile', title: 'Profile' },
  { id: 'admin', title: 'Admin' },
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
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function DemoButton({
  caseId,
  screenId,
  visible,
}: {
  caseId: CaseId
  screenId: ScreenId
  visible: boolean
}) {
  if (!visible) {
    return <span className={styles.btnGhostSlot}>Оплатить</span>
  }

  if (caseId === 'contract') {
    return (
      <LabButton variant="primary" size="sm" tabIndex={-1} className={styles.demoLabBtn}>
        Оплатить
      </LabButton>
    )
  }

  if (screenId === 'checkout') {
    return (
      <button type="button" tabIndex={-1} className={styles.driftLight}>
        Оплатить
      </button>
    )
  }
  if (screenId === 'profile') {
    return (
      <button type="button" tabIndex={-1} className={styles.driftNavy}>
        Оплатить
      </button>
    )
  }
  return (
    <button type="button" tabIndex={-1} className={styles.driftPill}>
      Оплатить
    </button>
  )
}

function sourceLabel(caseId: CaseId, screenId: ScreenId, visible: boolean) {
  if (!visible) return 'ещё нет'
  if (caseId === 'contract') return 'LabButton · tokens'
  if (screenId === 'checkout') return 'uiBtn · #69b1ff · r4'
  if (screenId === 'profile') return 'shell.btn · navy · r8'
  return '.payNow · accent · pill'
}

function DesignSystemViz({ phase, caseId, stageRef }: VizProps) {
  const contract = caseId === 'contract'
  const painted = phase === 'paint' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel
      title="Primary на экранах"
      meta={contract ? 'один LabButton везде' : 'три локальных look'}
    >
      <div ref={stageRef} className={styles.stage}>
        {SCREENS.map((screen) => (
          <div
            key={screen.id}
            className={[
              styles.screen,
              painted && styles.screenOn,
              done && contract && styles.screenOk,
              done && !contract && styles.screenWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.screenHead}>
              <span className={styles.screenTitle}>{screen.title}</span>
              <span className={styles.screenMeta}>{sourceLabel(caseId, screen.id, painted)}</span>
            </div>
            <div className={styles.screenBody}>
              <DemoButton caseId={caseId} screenId={screen.id} visible={painted} />
            </div>
          </div>
        ))}
      </div>
    </LabVizPanel>
  )
}

export function LayoutDesignSystemLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('contract')
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
    const contract = caseId === 'contract'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('paint')
          log(
            'info',
            contract
              ? 'рисую primary через LabButton + --btn-primary-*'
              : 'каждый экран подключает свой .btn с hex',
          )
        },
        () => {
          setPhase('done')
          if (contract) {
            log('ok', 'Checkout / Profile / Admin — одинаковый primary')
          } else {
            log('err', 'Светлый r4 · navy r8 · accent pill — три кнопки')
          }
        },
      ],
      (tl) => {
        if (stageRef.current) {
          tl.fromTo(
            stageRef.current,
            { opacity: 0.55, y: 6 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          contract
            ? 'Глаз не цепляется: один primary на всех экранах.'
            : 'Без дизайн-системы primary «плывёт» — цвет, радиус и вес разные.',
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
            setCaseId('contract')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Дизайн-система держит один primary. Без неё на соседних экранах кнопки расходятся по
        цвету, радиусу и плотности.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <DesignSystemViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`tokens.css` → `LabButton` на `var(--…)` → экран без своего primary."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Дизайн-система"
      lead="Foundation → примитив → экраны. Один primary; hex только в токенах."
      problem={problem}
      code={code}
    />
  )
}
