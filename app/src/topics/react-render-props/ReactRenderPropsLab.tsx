import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactRenderPropsLab.module.css'

const TOPIC_ID = '195-react-render-props'
const STEP = 0.6
const TRAIL_COUNT = 12
const LAG = 0.05
const LAG_REDUCED = 0.14

type CaseId = 'fixed' | 'render' | 'hook'
type Phase = 'idle' | 'run' | 'done'
type FlowStep = 'engine' | 'api' | 'ui'

type PointerApi = { x: number; y: number; inside: boolean }

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'fixed', label: 'встроенный UI' },
  { id: 'render', label: 'render' },
  { id: 'hook', label: 'usePointer' },
]

const CODE_INTRO: Record<CaseId, string> = {
  fixed: '`PointerZone` сам рисует координаты по центру — layout закрыт, chip в угол не поставить.',
  render: 'Движок зовёт `render(api)`; dot и chip в углу решает колбэк вызывающего.',
  hook: '`usePointer(ref)` отдаёт тот же `api`, UI остаётся в `Heatmap` без обёртки.',
}

const SNIPPET_ZONE_FIXED: InteractiveSnippet = {
  id: 'pointer-zone-fixed',
  label: 'src/ui/PointerZone.tsx',
  note: 'Нет render-prop — виджет сам решает, как показать координаты.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';

export type PointerApi = { x: number; y: number; inside: boolean };

export const PointerZone = () => {
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false });

  // ═══════════════════════════════════════════
  // FIXED ← UI внутри движка, layout закрыт
  // ═══════════════════════════════════════════
  return (
    <div
      className="zone"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setApi({
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
          inside: true,
        });
      }}
      onMouseLeave={() => setApi((prev) => ({ ...prev, inside: false }))}
    >
      {api.inside ? (
        <p className="readout">{api.x},{api.y}</p> {/* ← только по центру */}
      ) : (
        <p>Наведите на зону</p>
      )}
    </div>
  );
};`,
}

const SNIPPET_HEATMAP_FIXED: InteractiveSnippet = {
  id: 'heatmap-fixed',
  label: 'src/dashboard/Heatmap.tsx',
  note: 'Heatmap не управляет разметкой внутри зоны — chip в угол не вставить.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { PointerZone } from '../ui/PointerZone';

export const Heatmap = () => (
  <section>
    <header>
      <h1>Heatmap</h1>
      {/* chip «live» хочется сюда или в угол зоны — API не даёт */}
    </header>
    <PointerZone />
  </section>
);`,
}

const SNIPPET_ZONE_RENDER: InteractiveSnippet = {
  id: 'pointer-zone-render',
  label: 'src/ui/PointerZone.tsx',
  note: 'Движок держит listeners; UI отдаёт prop `render`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState, type ReactNode } from 'react';

export type PointerApi = { x: number; y: number; inside: boolean };

type Props = {
  render: (api: PointerApi) => ReactNode; // ← render-prop
};

export const PointerZone = ({ render }: Props) => {
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false });

  return (
    <div
      className="zone"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setApi({
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
          inside: true,
        });
      }}
      onMouseLeave={() => setApi((prev) => ({ ...prev, inside: false }))}
    >
      {render(api)} {/* ← вызывающий решает layout */}
    </div>
  );
};`,
}

const SNIPPET_HEATMAP_RENDER: InteractiveSnippet = {
  id: 'heatmap-render',
  label: 'src/dashboard/Heatmap.tsx',
  note: 'Dot с шлейфом и chip в углу — всё в колбэке `render`.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { PointerZone } from '../ui/PointerZone';

export const Heatmap = () => (
  <PointerZone
    render={({ x, y, inside }) =>
      inside ? (
        <>
          <span className="dot" style={{ left: x, top: y }} />
          <span className="chip">live · {x},{y}</span> {/* ← свой layout */}
        </>
      ) : (
        <p>Наведите на зону</p>
      )
    }
  />
);`,
}

const SNIPPET_USE_POINTER: InteractiveSnippet = {
  id: 'use-pointer',
  label: 'src/hooks/usePointer.ts',
  note: 'Listeners в hook — UI остаётся в теле родителя.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useEffect, useState, type RefObject } from 'react';

export type PointerApi = { x: number; y: number; inside: boolean };

export const usePointer = (ref: RefObject<HTMLElement | null>) => {
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false });

  // ═══════════════════════════════════════════
  // HOOK ← та же логика без render-колбэка
  // ═══════════════════════════════════════════
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setApi({
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top),
        inside: true,
      });
    };
    const onLeave = () => setApi((prev) => ({ ...prev, inside: false }));

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);

  return api;
};`,
}

const SNIPPET_HEATMAP_HOOK: InteractiveSnippet = {
  id: 'heatmap-hook',
  label: 'src/dashboard/Heatmap.tsx',
  note: 'Нет `PointerZone` — разметка и hook в одном компоненте.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useRef } from 'react';
import { usePointer } from '../hooks/usePointer';

export const Heatmap = () => {
  const ref = useRef<HTMLDivElement>(null);
  const api = usePointer(ref); // ← логика отдельно, UI здесь

  return (
    <div ref={ref} className="zone">
      {api.inside ? (
        <>
          <span className="dot" style={{ left: api.x, top: api.y }} />
          <span className="chip">live · {api.x},{api.y}</span>
        </>
      ) : (
        <p>Наведите на зону</p>
      )}
    </div>
  );
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  fixed: [SNIPPET_ZONE_FIXED, SNIPPET_HEATMAP_FIXED],
  render: [SNIPPET_ZONE_RENDER, SNIPPET_HEATMAP_RENDER],
  hook: [SNIPPET_USE_POINTER, SNIPPET_HEATMAP_HOOK],
}

const PAIN: ReactNode = (
  <>
    Render-prop делит роли: <code>PointerZone</code> знает про курсор и отдаёт{' '}
    <code>{'{ x, y, inside }'}</code>, а экран через <code>(api) =&gt; JSX</code> решает, где dot и
    chip. Без колбэка layout зашит внутри движка.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  fixed: (
    <>
      Встроенный UI: координаты только по центру зоны — chip «live» в угол не поставить.
    </>
  ),
  render: (
    <>
      <code>render(api)</code>: dot догоняет курсор с шлейфом, chip «live» — в углу, layout ваш.
    </>
  ),
  hook: (
    <>
      <code>usePointer(ref)</code> — тот же кастомный UI, но логика в hook, без{' '}
      <code>PointerZone</code> в дереве.
    </>
  ),
}

const LEGEND: Record<CaseId, ReactNode> = {
  fixed: (
    <>
      <code>PointerZone</code> → фиксированный JSX внутри · api не выходит наружу
    </>
  ),
  render: (
    <>
      <code>PointerZone</code> → <code>render(api)</code> → ваш JSX · api ={' '}
      <code>{'{ x, y, inside }'}</code>
    </>
  ),
  hook: (
    <>
      <code>usePointer(ref)</code> → api в <code>Heatmap</code> · без render-колбэка
    </>
  ),
}

type SetApi = (next: PointerApi | ((prev: PointerApi) => PointerApi)) => void

const readPointer = (el: HTMLElement, e: MouseEvent | React.MouseEvent) => {
  const rect = el.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    inside: true,
  } satisfies PointerApi
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type ChaseRefs = {
  dotRef: RefObject<HTMLSpanElement | null>
  trailRefs: Array<RefObject<HTMLSpanElement | null>>
}

const createPointerChase = (refs: ChaseRefs, motionReduced: boolean) => {
  const target = { x: 0, y: 0 }
  const display = { x: 0, y: 0 }
  const trail: Array<{ x: number; y: number }> = []
  let rafId: number | null = null
  let inside = false
  const factor = motionReduced ? LAG_REDUCED : LAG

  const paint = () => {
    const dot = refs.dotRef.current
    if (dot) {
      dot.style.transform = `translate3d(${display.x}px, ${display.y}px, 0)`
      dot.style.opacity = inside ? '1' : '0'
    }
    refs.trailRefs.forEach((ref, i) => {
      const el = ref.current
      const point = trail[i + 1]
      if (!el) return
      if (point && inside && !motionReduced) {
        el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`
        const fadeStep = 0.34 / Math.max(1, TRAIL_COUNT - 1)
        el.style.opacity = String(Math.max(0.06, 0.4 - i * fadeStep))
      } else {
        el.style.opacity = '0'
      }
    })
  }

  const tick = () => {
    display.x += (target.x - display.x) * factor
    display.y += (target.y - display.y) * factor
    trail.unshift({ x: display.x, y: display.y })
    while (trail.length > TRAIL_COUNT + 1) trail.pop()
    paint()
    if (inside) rafId = requestAnimationFrame(tick)
  }

  const start = () => {
    if (rafId != null) return
    rafId = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (rafId != null) cancelAnimationFrame(rafId)
    rafId = null
  }

  return {
    push(api: PointerApi, snap = false) {
      target.x = api.x
      target.y = api.y

      if (api.inside && !inside) {
        inside = true
        if (snap) {
          display.x = api.x
          display.y = api.y
          trail.length = 0
        }
        start()
        return
      }

      if (!api.inside && inside) {
        inside = false
        stop()
        paint()
      }

      if (inside && snap) {
        display.x = api.x
        display.y = api.y
      }
    },
    reset() {
      inside = false
      stop()
      target.x = 0
      target.y = 0
      display.x = 0
      display.y = 0
      trail.length = 0
      paint()
    },
    kill: stop,
  }
}

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

const FlowRow = ({ caseId, activeStep }: { caseId: CaseId; activeStep: FlowStep | null }) => {
  if (caseId === 'fixed') {
    return (
      <div className={styles.flow}>
        <span className={[styles.flowStep, activeStep === 'engine' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
          PointerZone
        </span>
        <span className={styles.flowArrow} aria-hidden>
          →
        </span>
        <span className={[styles.flowStep, activeStep === 'ui' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
          встроенный JSX
        </span>
      </div>
    )
  }

  if (caseId === 'render') {
    return (
      <div className={styles.flow}>
        <span className={[styles.flowStep, activeStep === 'engine' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
          PointerZone
        </span>
        <span className={styles.flowArrow} aria-hidden>
          →
        </span>
        <span className={[styles.flowStep, activeStep === 'api' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
          render(api)
        </span>
        <span className={styles.flowArrow} aria-hidden>
          →
        </span>
        <span className={[styles.flowStep, activeStep === 'ui' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
          ваш JSX
        </span>
      </div>
    )
  }

  return (
    <div className={styles.flow}>
      <span className={[styles.flowStep, activeStep === 'engine' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
        usePointer(ref)
      </span>
      <span className={styles.flowArrow} aria-hidden>
        →
      </span>
      <span className={[styles.flowStep, activeStep === 'api' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
        api
      </span>
      <span className={styles.flowArrow} aria-hidden>
        →
      </span>
      <span className={[styles.flowStep, activeStep === 'ui' ? styles.flowStepActive : ''].filter(Boolean).join(' ')}>
        JSX в Heatmap
      </span>
    </div>
  )
}

const CustomPointerUi = ({
  liveCoords,
  dotFlash,
  chipVisible,
  dotRef,
  chipWrapRef,
  trailRefs,
  inside,
}: {
  liveCoords: { x: number; y: number }
  dotFlash: boolean
  chipVisible: boolean
  dotRef: MutableRefObject<HTMLSpanElement | null>
  chipWrapRef: MutableRefObject<HTMLSpanElement | null>
  trailRefs: Array<MutableRefObject<HTMLSpanElement | null>>
  inside: boolean
}) =>
  inside ? (
    <div className={styles.pointerLayer}>
      {trailRefs.map((ref, i) => (
        <span key={i} ref={ref} className={styles.trailDot} aria-hidden />
      ))}
      <span
        ref={dotRef}
        className={[styles.cursorDot, dotFlash ? styles.cursorDotFlash : ''].filter(Boolean).join(' ')}
        aria-hidden
      />
      <span
        ref={chipWrapRef}
        className={[styles.chip, chipVisible ? '' : styles.chipHidden].filter(Boolean).join(' ')}
      >
        <span className={styles.chipLabel}>live · </span>
        {Math.round(liveCoords.x)},{Math.round(liveCoords.y)}
      </span>
    </div>
  ) : (
    <div className={styles.zoneIdle}>
      <p className={styles.zoneHint}>
        Наведите курсор — dot догоняет с шлейфом, chip «live» в углу рисует ваш колбэк.
      </p>
    </div>
  )

const FixedPointerUi = ({
  liveCoords,
  inside,
}: {
  liveCoords: { x: number; y: number }
  inside: boolean
}) =>
  inside ? (
    <div className={styles.fixedReadout}>
      <p className={styles.fixedCoords}>
        {Math.round(liveCoords.x)},{Math.round(liveCoords.y)}
      </p>
      <p className={styles.fixedNote}>только по центру · chip в угол нельзя</p>
    </div>
  ) : (
    <div className={styles.zoneIdle}>
      <p className={styles.zoneHint}>
        Наведите курсор — координаты по центру, layout задаёт сам PointerZone.
      </p>
    </div>
  )

const PointerZoneShell = ({
  api,
  liveCoords,
  caseId,
  onEnter,
  onMove,
  onLeave,
  disabled,
  dotFlash,
  chipVisible,
  dotRef,
  chipWrapRef,
  trailRefs,
  zoneRef,
}: {
  api: PointerApi
  liveCoords: { x: number; y: number }
  caseId: CaseId
  onEnter: (next: PointerApi) => void
  onMove: (next: PointerApi) => void
  onLeave: () => void
  disabled: boolean
  dotFlash: boolean
  chipVisible: boolean
  dotRef: MutableRefObject<HTMLSpanElement | null>
  chipWrapRef: MutableRefObject<HTMLSpanElement | null>
  trailRefs: Array<MutableRefObject<HTMLSpanElement | null>>
  zoneRef: MutableRefObject<HTMLDivElement | null>
}) => {
  const insideRef = useRef(api.inside)
  insideRef.current = api.inside

  const bindZone = (el: HTMLDivElement | null) => {
    zoneRef.current = el
  }

  const onPointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const next = readPointer(e.currentTarget, e)
    if (insideRef.current) onMove(next)
    else {
      insideRef.current = true
      onEnter(next)
    }
  }

  const onPointerLeave = () => {
    insideRef.current = false
    onLeave()
  }

  useEffect(() => {
    if (disabled || caseId !== 'hook') return
    const el = zoneRef.current
    if (!el) return

    const move = (e: MouseEvent) => {
      const next = readPointer(el, e)
      if (insideRef.current) onMove(next)
      else {
        insideRef.current = true
        onEnter(next)
      }
    }
    const leave = () => {
      insideRef.current = false
      onLeave()
    }

    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [caseId, disabled, onEnter, onMove, onLeave, zoneRef])

  const zoneClass = [styles.zone, api.inside ? styles.zoneActive : ''].filter(Boolean).join(' ')
  const isHook = caseId === 'hook'

  return (
    <div
      ref={isHook ? bindZone : undefined}
      className={zoneClass}
      onMouseMove={!isHook && !disabled ? onPointerMove : undefined}
      onMouseLeave={!isHook && !disabled ? onPointerLeave : undefined}
    >
      {caseId === 'fixed' ? (
        <FixedPointerUi liveCoords={liveCoords} inside={api.inside} />
      ) : (
        <CustomPointerUi
          liveCoords={liveCoords}
          inside={api.inside}
          dotFlash={dotFlash}
          chipVisible={chipVisible}
          dotRef={dotRef}
          chipWrapRef={chipWrapRef}
          trailRefs={trailRefs}
        />
      )}
    </div>
  )
}

type VizProps = {
  caseId: CaseId
  phase: Phase
  flowStep: FlowStep | null
  api: PointerApi
  liveCoords: { x: number; y: number }
  dotFlash: boolean
  chipVisible: boolean
  busy: boolean
  onEnter: (next: PointerApi) => void
  onMove: (next: PointerApi) => void
  onLeave: () => void
  dotRef: MutableRefObject<HTMLSpanElement | null>
  chipWrapRef: MutableRefObject<HTMLSpanElement | null>
  trailRefs: Array<MutableRefObject<HTMLSpanElement | null>>
  zoneRef: MutableRefObject<HTMLDivElement | null>
}

const RenderPropsLiveViz = ({
  caseId,
  phase,
  flowStep,
  api,
  liveCoords,
  dotFlash,
  chipVisible,
  busy,
  onEnter,
  onMove,
  onLeave,
  dotRef,
  chipWrapRef,
  trailRefs,
  zoneRef,
}: VizProps) => {
  const meta =
    phase === 'idle'
      ? 'ожидание'
      : caseId === 'fixed'
        ? 'встроенный UI'
        : caseId === 'render'
          ? 'render(api) → UI'
          : 'usePointer(ref)'

  const receipt =
    caseId === 'fixed'
      ? 'PointerZone · readout ∈ center · no slot'
      : caseId === 'render'
        ? 'render(api) · chip ∈ corner · dot chase'
        : 'usePointer · flat Heatmap · dot chase'

  const cardTone =
    phase === 'done'
      ? caseId === 'fixed'
        ? styles.cardWarn
        : styles.cardOk
      : ''

  return (
    <LabVizPanel title="Heatmap" meta={meta}>
      <div className={styles.stage}>
        <FlowRow caseId={caseId} activeStep={flowStep} />
        <p className={styles.legend}>{LEGEND[caseId]}</p>
        <section className={[styles.card, cardTone].filter(Boolean).join(' ')}>
          <header className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.brandMark} aria-hidden />
              <strong>Heatmap</strong>
            </div>
            <div className={styles.headerExtra}>
              {caseId === 'fixed' ? (
                <span className={styles.roleTag}>вызывающий · без доступа к layout</span>
              ) : caseId === 'render' ? (
                <>
                  <span className={styles.apiTag}>render(api)</span>
                  <span className={styles.roleTag}>вы · layout</span>
                </>
              ) : (
                <>
                  <span className={styles.apiTag}>usePointer</span>
                  <span className={styles.roleTag}>вы · UI + hook</span>
                </>
              )}
            </div>
          </header>
          <div className={styles.body}>
            {caseId !== 'hook' ? (
              <div
                className={[
                  styles.engineBar,
                  flowStep === 'engine' || flowStep === 'api' ? styles.engineBarActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {caseId === 'fixed' ? 'PointerZone · listeners + state' : 'PointerZone · render(api)'}
              </div>
            ) : null}
            {caseId !== 'fixed' ? (
              <div className={[styles.uiBar, flowStep === 'ui' ? styles.engineBarActive : ''].filter(Boolean).join(' ')}>
                ваш UI · dot + chip «live»
              </div>
            ) : null}
            <PointerZoneShell
              api={api}
              liveCoords={liveCoords}
              caseId={caseId}
              onEnter={onEnter}
              onMove={onMove}
              onLeave={onLeave}
              disabled={busy}
              dotFlash={dotFlash}
              chipVisible={chipVisible}
              dotRef={dotRef}
              chipWrapRef={chipWrapRef}
              trailRefs={trailRefs}
              zoneRef={zoneRef}
            />
          </div>
        </section>
        <p className={styles.receipt}>{receipt}</p>
      </div>
    </LabVizPanel>
  )
}

export const ReactRenderPropsLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('fixed')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [flowStep, setFlowStep] = useState<FlowStep | null>(null)
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false })
  const [liveCoords, setLiveCoords] = useState({ x: 0, y: 0 })
  const [dotFlash, setDotFlash] = useState(false)
  const [chipVisible, setChipVisible] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const dotRef = useRef<HTMLSpanElement | null>(null)
  const chipWrapRef = useRef<HTMLSpanElement | null>(null)
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const coordsRafRef = useRef<number | null>(null)
  const pendingCoordsRef = useRef<{ x: number; y: number } | null>(null)
  const trailRefs = useMemo(
    () =>
      Array.from({ length: TRAIL_COUNT }, () => ({ current: null }) as MutableRefObject<HTMLSpanElement | null>),
    [],
  )

  const chaseRef = useRef(createPointerChase({ dotRef, trailRefs }, reducedMotion()))

  const scheduleLiveCoords = useCallback((x: number, y: number) => {
    pendingCoordsRef.current = { x, y }
    if (coordsRafRef.current != null) return
    coordsRafRef.current = requestAnimationFrame(() => {
      coordsRafRef.current = null
      const next = pendingCoordsRef.current
      if (next) setLiveCoords(next)
    })
  }, [])

  const pushVisual = useCallback((next: PointerApi, snap = false) => {
    chaseRef.current.push(next, snap)
  }, [])

  const resetViz = useCallback(() => {
    setPhase('idle')
    setFlowStep(null)
    setHint(null)
    setApi({ x: 0, y: 0, inside: false })
    setLiveCoords({ x: 0, y: 0 })
    pendingCoordsRef.current = null
    if (coordsRafRef.current != null) {
      cancelAnimationFrame(coordsRafRef.current)
      coordsRafRef.current = null
    }
    setDotFlash(false)
    setChipVisible(false)
    chaseRef.current.reset()
    if (chipWrapRef.current) gsap.set(chipWrapRef.current, { clearProps: 'transform,opacity' })
  }, [])

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    chaseRef.current.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const finishCase = (id: CaseId) => {
    setPhase('done')
    setDotFlash(false)
    setFlowStep('ui')
    if (id === 'fixed') {
      log('warn', 'readout ∈ center · chip slot нет')
      setHint('без render-prop layout закрыт внутри PointerZone')
    } else if (id === 'render') {
      log('ok', 'render(api) · chip ∈ corner · dot chase')
      setHint('движок отдаёт api; dot и chip рисует колбэк')
    } else {
      log('ok', 'usePointer · без PointerZone')
      setHint('hook — та же логика; UI остаётся в Heatmap')
    }
  }

  const setApiSafe = useCallback<SetApi>((next) => {
    setApi((prev) => (typeof next === 'function' ? next(prev) : next))
  }, [])

  const onPointerEnter = useCallback(
    (next: PointerApi) => {
      pushVisual(next, true)
      setLiveCoords({ x: next.x, y: next.y })
      setApiSafe(next)
    },
    [pushVisual, setApiSafe],
  )

  const onPointerMove = useCallback(
    (next: PointerApi) => {
      pushVisual(next)
      scheduleLiveCoords(next.x, next.y)
    },
    [pushVisual, scheduleLiveCoords],
  )

  const onPointerLeave = useCallback(() => {
    chaseRef.current.push({ x: 0, y: 0, inside: false })
    setApiSafe((prev) => ({ ...prev, inside: false }))
  }, [setApiSafe])

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    setPhase('run')

    playTimeline(
      tlRef,
      [
        () => {
          setFlowStep('engine')
          const next = { x: 54, y: 58, inside: true }
          pushVisual(next, true)
          setLiveCoords({ x: next.x, y: next.y })
          setApi(next)
          log('info', caseId === 'hook' ? 'usePointer · inside=true' : 'PointerZone · inside=true')
        },
        () => {
          setFlowStep(caseId === 'fixed' ? 'ui' : 'api')
          if (caseId !== 'fixed') setChipVisible(true)
          log(caseId === 'fixed' ? 'warn' : 'ok', caseId === 'fixed' ? 'coords ∈ center' : 'chip live · corner')
        },
        () => {
          setFlowStep('ui')
          const next = { x: 148, y: 92, inside: true }
          pushVisual(next)
          setLiveCoords({ x: next.x, y: next.y })
          setApi(next)
          if (caseId !== 'fixed') setDotFlash(true)
          finishCase(caseId)
        },
      ],
      (tl) => {
        if (caseId === 'fixed') return
        tl.call(
          () => {
            const el = chipWrapRef.current
            if (!el) return
            gsap.fromTo(el, { opacity: 0.4, y: -4 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' })
          },
          undefined,
          STEP + 0.08,
        )
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    chaseRef.current.kill()
    setBusy(false)
    clear()
    setCaseId('fixed')
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

      <RenderPropsLiveViz
        caseId={caseId}
        phase={phase}
        flowStep={flowStep}
        api={api}
        liveCoords={liveCoords}
        dotFlash={dotFlash}
        chipVisible={chipVisible}
        busy={busy}
        onEnter={onPointerEnter}
        onMove={onPointerMove}
        onLeave={onPointerLeave}
        dotRef={dotRef}
        chipWrapRef={chipWrapRef}
        trailRefs={trailRefs}
        zoneRef={zoneRef}
      />

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
      title="Render-props"
      lead="Сначала встроенный UI, затем `render(api)` и `usePointer`: кто держит логику, кто рисует dot и chip."
      problem={problem}
      code={code}
    />
  )
}
