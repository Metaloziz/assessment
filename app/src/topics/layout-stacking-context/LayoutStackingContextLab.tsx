import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutStackingContextLab.module.css'

const TOPIC_ID = '171-layout-stacking-context'
const STEP = 0.6

type CaseId = 'siblings' | 'trap' | 'opacity'
type Phase = 'idle' | 'a' | 'b' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'siblings', label: 'Соседи' },
  { id: 'trap', label: 'Ловушка' },
  { id: 'opacity', label: 'opacity SC' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  siblings: (
    <>
      Два соседа в одном контексте: <code>z-index: 2</code> рисуется поверх <code>z-index: 1</code>.
    </>
  ),
  trap: (
    <>
      Badge с <code>z-index: 9999</code> внутри карточки <code>z-index: 1</code> — overlay с{' '}
      <code>10</code> всё равно выше всей колоды карточки.
    </>
  ),
  opacity: (
    <>
      Родитель с <code>opacity: 0.92</code> создаёт контекст; ребёнок <code>z-index: 50</code> не
      обгоняет соседа с <code>1</code>.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'siblings',
    label: 'layers-siblings.css',
    note: 'Один контекст: сравнивают z-index соседей напрямую.',
    executable: false,
    languageLabel: 'css',
    code: `.stage {
  position: relative;
}

.panel-a {
  position: absolute;
  z-index: 1; /* ← ниже */
}

.panel-b {
  position: absolute;
  z-index: 2; /* ← выше: один stacking context */
}`,
  },
  {
    id: 'trap',
    label: 'modal-trap.css',
    note: 'Контекст у .card запирает badge; сравнивают card и overlay.',
    executable: false,
    languageLabel: 'css',
    code: `.card {
  position: relative;
  z-index: 1; /* ← новая колода */
  isolation: isolate;
}

.card__badge {
  position: absolute;
  z-index: 9999; /* ← только внутри .card */
}

.overlay {
  position: fixed;
  z-index: 10; /* ← 10 > 1 → весь .card под overlay */
}`,
  },
  {
    id: 'opacity',
    label: 'opacity-context.css',
    note: 'opacity < 1 = stacking context даже без z-index у родителя.',
    executable: false,
    languageLabel: 'css',
    code: `.toast-wrap {
  opacity: 0.92; /* ← создаёт stacking context */
}

.toast-wrap .chip {
  position: absolute;
  z-index: 50; /* ← не выходит из wrap */
}

.banner {
  position: relative;
  z-index: 1; /* ← сосед wrap: 1 > «пакет» с auto/0 */
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

function layerCls(...mods: Array<string | false | undefined>) {
  return [styles.layer, ...mods.filter(Boolean)].join(' ')
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function StackingViz({ phase, caseId, stageRef }: VizProps) {
  const running = phase !== 'idle'
  const done = phase === 'done'
  const highlightB = phase === 'b' || done

  const sceneCls = [
    styles.scene,
    running && styles.sceneOn,
    done && caseId === 'siblings' && styles.sceneOk,
    done && caseId !== 'siblings' && styles.sceneWarn,
  ]
    .filter(Boolean)
    .join(' ')

  const meta =
    caseId === 'siblings'
      ? 'один контекст · больший z сверху'
      : caseId === 'trap'
        ? 'колода card vs overlay'
        : 'opacity создаёт колоду'

  return (
    <LabVizPanel title="Слои на экране" meta={meta}>
      <div ref={stageRef} className={styles.stage}>
        <div className={sceneCls}>
          {caseId === 'siblings' && (
            <>
              <div
                className={layerCls(
                  styles.sibBase,
                  running && phase === 'a' && styles.layerActive,
                  done && styles.layerLose,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Panel A</span>
                <span className={styles.layerMeta}>z-index: 1</span>
              </div>
              <div
                className={layerCls(
                  styles.sibTop,
                  highlightB && styles.layerActive,
                  done && styles.layerWin,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Panel B</span>
                <span className={styles.layerMeta}>z-index: 2</span>
              </div>
            </>
          )}

          {caseId === 'trap' && (
            <>
              <div
                className={layerCls(
                  styles.trapCard,
                  (phase === 'a' || done) && styles.layerActive,
                  done && styles.layerLose,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Card · SC</span>
                <span className={styles.layerMeta}>z-index: 1</span>
                <div
                  className={layerCls(
                    styles.trapBadge,
                    phase === 'a' && styles.layerActive,
                    done && styles.layerLose,
                  )}
                >
                  <span className={styles.layerLabel}>Badge</span>
                  <span className={styles.layerMeta}>z-index: 9999</span>
                </div>
              </div>
              <div
                className={layerCls(
                  styles.trapOverlay,
                  highlightB && styles.layerActive,
                  done && styles.layerWin,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Overlay</span>
                <span className={styles.layerMeta}>z-index: 10</span>
              </div>
            </>
          )}

          {caseId === 'opacity' && (
            <>
              <div
                className={layerCls(
                  styles.opParent,
                  (phase === 'a' || done) && styles.layerActive,
                  done && styles.layerLose,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Wrap · opacity</span>
                <span className={styles.layerMeta}>opacity: 0.92 → SC</span>
                <div
                  className={layerCls(
                    styles.opChild,
                    phase === 'a' && styles.layerActive,
                    done && styles.layerLose,
                  )}
                >
                  <span className={styles.layerLabel}>Chip</span>
                  <span className={styles.layerMeta}>z-index: 50</span>
                </div>
              </div>
              <div
                className={layerCls(
                  styles.opSibling,
                  highlightB && styles.layerActive,
                  done && styles.layerWin,
                  !running && styles.layerDim,
                )}
              >
                <span className={styles.layerLabel}>Banner</span>
                <span className={styles.layerMeta}>z-index: 1</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.legend} aria-hidden>
          {caseId === 'siblings' && (
            <>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} /> A · 1
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotOk}`} /> B · 2 сверху
              </span>
            </>
          )}
          {caseId === 'trap' && (
            <>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} /> card 1 + badge 9999
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotWarn}`} /> overlay 10
              </span>
            </>
          )}
          {caseId === 'opacity' && (
            <>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} /> wrap opacity SC
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotOk}`} /> banner 1
              </span>
            </>
          )}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutStackingContextLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('siblings')
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

    const steps: Array<() => void> =
      caseId === 'siblings'
        ? [
            () => {
              setPhase('a')
              log('info', 'Panel A · z-index: 1')
            },
            () => {
              setPhase('b')
              log('ok', 'Panel B · z-index: 2 поверх A')
            },
            () => {
              setPhase('done')
              log('ok', 'Один контекст: числа сравнимы напрямую')
            },
          ]
        : caseId === 'trap'
          ? [
              () => {
                setPhase('a')
                log('info', 'Card z:1 + Badge z:9999 (внутри колоды card)')
              },
              () => {
                setPhase('b')
                log('warn', 'Overlay z:10 — сосед card, 10 > 1')
              },
              () => {
                setPhase('done')
                log('err', 'Badge под overlay: сравнивали контексты, не 9999 vs 10')
              },
            ]
          : [
              () => {
                setPhase('a')
                log('info', 'Wrap opacity: 0.92 → stacking context; chip z:50 внутри')
              },
              () => {
                setPhase('b')
                log('warn', 'Banner z:1 снаружи wrap')
              },
              () => {
                setPhase('done')
                log('err', 'Chip не выше banner: колода wrap ниже соседа')
              },
            ]

    playTimeline(
      tlRef,
      steps,
      (tl) => {
        if (stageRef.current) {
          tl.fromTo(
            stageRef.current,
            { opacity: 0.65, y: 4 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
            0,
          )
        }
      },
      () => {
        setBusy(false)
        setHint(
          caseId === 'siblings'
            ? 'В одной колоде больший z-index побеждает — ожидаемо.'
            : caseId === 'trap'
              ? 'Поднимай контекст родителя или вынеси слой в тот же корень, что overlay — не крути 9999 у ребёнка.'
              : 'opacity/transform у родителя = новая колода; чини родителя, не только z-index ребёнка.',
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
            setCaseId('siblings')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        <code>z-index</code> сравнивают только внутри stacking context. Новая колода у родителя
        запирает детей — число «снаружи» уже не помогает.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <StackingViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Соседи с `z-index`, ловушка вложенного контекста и `opacity` < 1 как создатель колоды."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Контекст наложения"
      lead="Stacking context: локальная колода слоёв; z-index не глобальный рейтинг."
      problem={problem}
      code={code}
    />
  )
}
