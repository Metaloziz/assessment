import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './PatternsTemplateFlyweightBridgeLab.module.css'

const TOPIC_ID = '163-patterns-template-flyweight-bridge'
const STEP = 0.7

type Pattern = 'template' | 'flyweight' | 'bridge'
type TmplCase = 'dup' | 'skeleton'
type FlyCase = 'fat' | 'share'
type BrCase = 'locked' | 'swap'
type CaseId = TmplCase | FlyCase | BrCase

type TmplPhase = 'idle' | 'open' | 'hook' | 'done'
type FlyPhase = 'idle' | 'factory' | 'draw' | 'done'
type BrPhase = 'idle' | 'bind' | 'call' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'template', label: 'Template Method' },
  { id: 'flyweight', label: 'Flyweight' },
  { id: 'bridge', label: 'Bridge' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  template: [
    { id: 'dup', label: 'Копия шагов' },
    { id: 'skeleton', label: 'Каркас + хук' },
  ],
  flyweight: [
    { id: 'fat', label: 'Копия глифа' },
    { id: 'share', label: 'Shared Glyph' },
  ],
  bridge: [
    { id: 'locked', label: 'Жёсткая связь' },
    { id: 'swap', label: 'Смена Device' },
  ],
}

const CODE_INTRO: Record<Pattern, string> = {
  template: 'Template Method: `run()` фиксирует open → buildRows → close; наследник только `buildRows`.',
  flyweight: 'Flyweight: `getGlyph(char)` из Map; `draw` принимает extrinsic `x,y`.',
  bridge: 'Bridge: `Remote` держит `device` и делегирует `power()`; устройство можно сменить.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  template: [
    {
      id: 'report-template',
      label: 'src/reports/Report.ts',
      note: 'Template Method: порядок шагов в базе; хук — только середина.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// TEMPLATE METHOD ← каркас + hook
// ═══════════════════════════════════════════
export abstract class Report {
  run(): string[] {
    this.open(); // ← fixed
    const rows = this.buildRows(); // ← hook
    this.close();
    return rows;
  }

  protected open() {
    /* connect / header */
  }

  protected close() {
    /* flush / footer */
  }

  protected abstract buildRows(): string[]; // ← override
}

export class SalesReport extends Report {
  protected buildRows() {
    return ['sku:A qty:2']; // ← только вариация
  }
}

// new SalesReport().run()`,
    },
  ],
  flyweight: [
    {
      id: 'glyph-flyweight',
      label: 'src/canvas/glyphs.ts',
      note: 'Flyweight: intrinsic в Map; координаты — аргументы draw.',
      executable: false,
      languageLabel: 'ts',
      code: `type Glyph = { char: string; width: number; path: string };

// ═══════════════════════════════════════════
// FLYWEIGHT ← shared intrinsic
// ═══════════════════════════════════════════
const glyphs = new Map<string, Glyph>();

export function getGlyph(char: string): Glyph {
  let g = glyphs.get(char);
  if (!g) {
    g = { char, width: 8, path: \`glyph:\${char}\` }; // ← intrinsic
    glyphs.set(char, g);
  }
  return g;
}

export function draw(char: string, x: number, y: number) {
  const g = getGlyph(char);
  return { path: g.path, at: [x, y] as const }; // ← extrinsic
}

// draw('A', 0, 0); draw('A', 10, 0) → один Glyph("A")`,
    },
  ],
  bridge: [
    {
      id: 'remote-bridge',
      label: 'src/devices/remote.ts',
      note: 'Bridge: абстракция композирует device; оси меняются отдельно.',
      executable: false,
      languageLabel: 'ts',
      code: `export type Device = { power: () => string };

// ═══════════════════════════════════════════
// BRIDGE ← Abstraction → Implementation
// ═══════════════════════════════════════════
export function createRemote(device: Device) {
  let impl = device;
  return {
    toggle() {
      return impl.power(); // ← делегирование
    },
    setDevice(next: Device) {
      impl = next; // ← смена реализации
    },
  };
}

export const tv: Device = { power: () => 'tv-on' };
export const radio: Device = { power: () => 'radio-on' };

// const remote = createRemote(tv);
// remote.toggle(); // tv-on
// remote.setDevice(radio);
// remote.toggle(); // radio-on`,
    },
  ],
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
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

type TmplVizProps = {
  phase: TmplPhase
  caseId: TmplCase
  hookRef: MutableRefObject<HTMLDivElement | null>
}

function TemplateViz({ phase, caseId, hookRef }: TmplVizProps) {
  const skeleton = caseId === 'skeleton'
  const openOn = phase !== 'idle'
  const hookOn = phase === 'hook' || phase === 'done'
  const done = phase === 'done'
  const warn = !skeleton && done

  return (
    <LabVizPanel title="Отчёт" meta={skeleton ? 'каркас + hook' : 'дублирование шагов'}>
      <div className={styles.pipeLayout}>
        <div
          className={nodeCls(
            openOn && labVizStyles.nodeActive,
            done && (skeleton ? labVizStyles.nodeOk : styles.nodeWarn),
          )}
        >
          <span className={labVizStyles.nodeLabel}>open()</span>
          <span className={labVizStyles.nodeSub}>{skeleton ? 'fixed' : 'копия №1'}</span>
        </div>
        <div
          ref={hookRef}
          className={nodeCls(
            hookOn && labVizStyles.nodeActive,
            done && (skeleton ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.pipeMid,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{skeleton ? 'buildRows()' : 'всё в run()'}</span>
          <span className={labVizStyles.nodeSub}>{skeleton ? 'hook' : 'нет слота'}</span>
        </div>
        <div
          className={nodeCls(
            done && (skeleton ? labVizStyles.nodeOk : styles.nodeWarn),
            warn && styles.nodeWarn,
          )}
        >
          <span className={labVizStyles.nodeLabel}>close()</span>
          <span className={labVizStyles.nodeSub}>{skeleton ? 'fixed' : 'копия №2'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

type FlyVizProps = {
  phase: FlyPhase
  caseId: FlyCase
  poolRef: MutableRefObject<HTMLDivElement | null>
}

function FlyweightViz({ phase, caseId, poolRef }: FlyVizProps) {
  const share = caseId === 'share'
  const factoryOn = phase !== 'idle'
  const drawOn = phase === 'draw' || phase === 'done'
  const done = phase === 'done'
  const fatWarn = !share && done

  return (
    <LabVizPanel title="Канвас" meta={share ? '1 Glyph → N позиций' : 'глиф на каждый draw'}>
      <div className={styles.flyLayout}>
        <div
          ref={poolRef}
          className={nodeCls(
            factoryOn && labVizStyles.nodeActive,
            done && (share ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.pool,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{share ? 'Glyph("A")' : 'A × N'}</span>
          <span className={labVizStyles.nodeSub}>{share ? 'Map shared' : 'копии path'}</span>
        </div>
        <div className={styles.flyCtx}>
          <div
            className={nodeCls(
              drawOn && labVizStyles.nodeActive,
              done && (share ? labVizStyles.nodeOk : styles.nodeWarn),
            )}
          >
            <span className={labVizStyles.nodeLabel}>(0, 0)</span>
            <span className={labVizStyles.nodeSub}>extrinsic</span>
          </div>
          <div
            className={nodeCls(
              drawOn && labVizStyles.nodeActive,
              done && (share ? labVizStyles.nodeOk : styles.nodeWarn),
              fatWarn && styles.nodeWarn,
            )}
          >
            <span className={labVizStyles.nodeLabel}>(10, 0)</span>
            <span className={labVizStyles.nodeSub}>extrinsic</span>
          </div>
        </div>
      </div>
    </LabVizPanel>
  )
}

type BrVizProps = {
  phase: BrPhase
  caseId: BrCase
  deviceRef: MutableRefObject<HTMLDivElement | null>
}

function BridgeViz({ phase, caseId, deviceRef }: BrVizProps) {
  const swap = caseId === 'swap'
  const bindOn = phase !== 'idle'
  const callOn = phase === 'call' || phase === 'done'
  const done = phase === 'done'
  const lockedWarn = !swap && done
  const deviceLabel = swap && done ? 'Radio' : swap && callOn ? 'TV→Radio' : 'TV'

  return (
    <LabVizPanel title="Пульт" meta={swap ? 'Remote ↔ Device' : 'подкласс RemoteTv'}>
      <div className={styles.brLayout}>
        <div
          className={nodeCls(
            bindOn && labVizStyles.nodeActive,
            done && (swap ? labVizStyles.nodeOk : styles.nodeWarn),
            styles.remoteCard,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Remote</span>
          <span className={labVizStyles.nodeSub}>{swap ? 'toggle()' : 'RemoteTv'}</span>
        </div>
        <div className={styles.brArrow} aria-hidden>
          →
        </div>
        <div
          ref={deviceRef}
          className={nodeCls(
            callOn && labVizStyles.nodeActive,
            done && (swap ? labVizStyles.nodeOk : styles.nodeWarn),
            lockedWarn && styles.nodeWarn,
            styles.deviceCard,
          )}
        >
          <span className={labVizStyles.nodeLabel}>{deviceLabel}</span>
          <span className={labVizStyles.nodeSub}>
            {done ? (swap ? 'radio-on' : 'только TV') : 'power()'}
          </span>
        </div>
      </div>
    </LabVizPanel>
  )
}

const PAIN: Record<Pattern, ReactNode> = {
  template: (
    <>
      Несколько отчётов копируют open/close. Template Method фиксирует каркас; варьируется только{' '}
      <code>buildRows</code>.
    </>
  ),
  flyweight: (
    <>
      Много букв на канвасе. Flyweight держит один shared-глиф; координаты передают снаружи.
    </>
  ),
  bridge: (
    <>
      Пульт и устройство меняются независимо. Bridge: <code>Remote</code> композирует{' '}
      <code>Device</code>, а не плодит подклассы.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  dup: <>Каждый отчёт дублирует open → середина → close — нет общего каркаса.</>,
  skeleton: (
    <>
      <code>run()</code> зовёт fixed-шаги и хук <code>buildRows()</code> — порядок не ломают.
    </>
  ),
  fat: <>Каждый <code>draw(&apos;A&apos;)</code> несёт свою копию path — intrinsic не шарится.</>,
  share: (
    <>
      <code>getGlyph(&apos;A&apos;)</code> один раз; два контекста <code>(0,0)</code> и <code>(10,0)</code> — extrinsic.
    </>
  ),
  locked: <>Абстракция зашита в <code>RemoteTv</code> — сменить устройство нельзя без нового класса.</>,
  swap: (
    <>
      Тот же <code>Remote</code>: <code>setDevice(radio)</code> — реализация меняется без смены пульта.
    </>
  ),
}

export function PatternsTemplateFlyweightBridgeLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('template')
  const [caseId, setCaseId] = useState<CaseId>('dup')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [tmplPhase, setTmplPhase] = useState<TmplPhase>('idle')
  const [flyPhase, setFlyPhase] = useState<FlyPhase>('idle')
  const [brPhase, setBrPhase] = useState<BrPhase>('idle')

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const hookRef = useRef<HTMLDivElement | null>(null)
  const poolRef = useRef<HTMLDivElement | null>(null)
  const deviceRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setTmplPhase('idle')
    setFlyPhase('idle')
    setBrPhase('idle')
    setHint(null)
    for (const el of [hookRef.current, poolRef.current, deviceRef.current]) {
      if (el) gsap.set(el, { clearProps: 'transform,opacity' })
    }
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    setCaseId(CASES[next][0]!.id)
    clear()
    resetViz()
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

    if (pattern === 'template') {
      const skeleton = caseId === 'skeleton'
      playTimeline(
        tlRef,
        [
          () => setTmplPhase('open'),
          () => setTmplPhase('hook'),
          () => {
            setTmplPhase('done')
            if (skeleton) {
              log('ok', 'open → buildRows() → close')
              setHint('хук только в середине каркаса')
            } else {
              log('warn', 'Sales/Inventory копируют open/close')
              setHint('без template шаги дублируются')
            }
          },
        ],
        (tl) => {
          if (!hookRef.current || !skeleton) return
          gsap.set(hookRef.current, { scale: 0.92, opacity: 0.5 })
          tl.to(hookRef.current, { scale: 1, opacity: 1 }, STEP)
        },
        () => setBusy(false),
      )
      return
    }

    if (pattern === 'flyweight') {
      const share = caseId === 'share'
      playTimeline(
        tlRef,
        [
          () => setFlyPhase('factory'),
          () => setFlyPhase('draw'),
          () => {
            setFlyPhase('done')
            if (share) {
              log('ok', 'getGlyph(A) ×1 → draw(0,0) + draw(10,0)')
              setHint('intrinsic общий, x/y снаружи')
            } else {
              log('warn', 'два draw — две копии path("A")')
              setHint('без flyweight intrinsic раздувается')
            }
          },
        ],
        (tl) => {
          if (!poolRef.current) return
          gsap.set(poolRef.current, { scale: 0.92, opacity: 0.45 })
          tl.to(poolRef.current, { scale: 1, opacity: 1 }, 0)
        },
        () => setBusy(false),
      )
      return
    }

    const swap = caseId === 'swap'
    playTimeline(
      tlRef,
      [
        () => setBrPhase('bind'),
        () => setBrPhase('call'),
        () => {
          setBrPhase('done')
          if (swap) {
            log('ok', 'Remote.toggle → TV, затем setDevice(Radio)')
            setHint('абстракция и impl меняются отдельно')
          } else {
            log('warn', 'RemoteTv зашит на TV — комбинаторный взрыв')
            setHint('без bridge плодятся подклассы')
          }
        },
      ],
      (tl) => {
        if (!deviceRef.current || !swap) return
        gsap.set(deviceRef.current, { scale: 0.92, opacity: 0.45 })
        tl.to(deviceRef.current, { scale: 1, opacity: 1 }, STEP)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    setPattern('template')
    setCaseId('dup')
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES[pattern].map((c) => (
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

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      {pattern === 'template' ? (
        <TemplateViz phase={tmplPhase} caseId={caseId as TmplCase} hookRef={hookRef} />
      ) : null}
      {pattern === 'flyweight' ? (
        <FlyweightViz phase={flyPhase} caseId={caseId as FlyCase} poolRef={poolRef} />
      ) : null}
      {pattern === 'bridge' ? (
        <BridgeViz phase={brPhase} caseId={caseId as BrCase} deviceRef={deviceRef} />
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
    <div className={styles.codePane}>
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Template Method · Flyweight · Bridge"
      lead="Переключатель: каркас отчёта, shared-глиф, пульт ↔ устройство."
      problem={problem}
      code={code}
    />
  )
}
