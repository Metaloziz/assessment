import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutCssModulesCssInJsLab.module.css'

const TOPIC_ID = '172-layout-css-modules-css-in-js'
const STEP = 0.6

type Pattern = 'modules' | 'cssInJs'
type ModCase = 'scoped' | 'global'
type JsCase = 'props' | 'runtime'
type CaseId = ModCase | JsCase
type Phase = 'idle' | 'map' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'modules', label: 'CSS Modules' },
  { id: 'cssInJs', label: 'CSS-in-JS' },
]

const CASES: Record<Pattern, Array<{ id: CaseId; label: string }>> = {
  modules: [
    { id: 'scoped', label: 'Локальные классы' },
    { id: 'global', label: 'Глобальный .btn' },
  ],
  cssInJs: [
    { id: 'props', label: 'Стили от props' },
    { id: 'runtime', label: 'Inject в runtime' },
  ],
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  scoped: (
    <>
      Оба компонента пишут локальный <code>.root</code> — после хеша имена разные, цвета не смешиваются.
    </>
  ),
  global: (
    <>
      Оба подключают глобальный <code>.btn</code> — один селектор на документ, Badge перекрашивается под Primary.
    </>
  ),
  props: (
    <>
      <code>$primary</code> / <code>$danger</code> меняют правила в JS; у кнопок разные сгенерированные классы.
    </>
  ),
  runtime: (
    <>
      Стили появляются только после inject тега <code>style</code> — до этого кнопка «голая» (FOUC / SSR-риск).
    </>
  ),
}

const PAIN: Record<Pattern, ReactNode> = {
  modules: (
    <>
      CSS Modules на сборке превращают локальные классы в уникальные хеши. Глобальный{' '}
      <code>.btn</code> снова открывает коллизии между компонентами.
    </>
  ),
  cssInJs: (
    <>
      CSS-in-JS держит стили рядом с компонентом и удобен для <code>props</code>/темы. Runtime-inject
      даёт динамику, но платит FOUC и сложностью SSR.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  modules: '`Button.module.css` → `styles.root` с хешем; `:global(.btn)` — осознанный выход из изоляции.',
  cssInJs: 'styled-button с `$primary`; runtime-inject через `<style>` — цена SSR/FOUC.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  modules: [
    {
      id: 'button-module-css',
      label: 'Button.module.css',
      note: 'Локальный `.root` после сборки станет `Button_root_…`.',
      executable: false,
      languageLabel: 'css',
      code: `/* ═══════════════════════════════════════════
 * CSS MODULES ← локальная область имён
 * ═══════════════════════════════════════════ */
.root {
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  background: var(--accent);
  color: var(--bg-deep);
} /* ← styles.root → Button_root_a3f2 */

/* Антипример: снова общая помойка */
/* :global(.btn) { … } */`,
    },
    {
      id: 'button-tsx',
      label: 'Button.tsx',
      note: 'Импорт объекта styles, не строки класса.',
      executable: false,
      code: `import styles from './Button.module.css';

export function Button({ children }: { children: React.ReactNode }) {
  // ← хеш уже внутри styles.root
  return (
    <button type="button" className={styles.root}>
      {children}
    </button>
  );
}`,
    },
    {
      id: 'global-anti',
      label: 'legacy.css',
      note: 'Глобальный `.btn` в двух фичах — одна область имён браузера.',
      executable: false,
      languageLabel: 'css',
      code: `/* ← GLOBAL: коллизия с любым другим .btn */
.btn {
  padding: 0.4rem 0.85rem;
  background: navy;
  color: white;
}

/* Badge.css тоже объявил .btn → last wins / leak */`,
    },
  ],
  cssInJs: [
    {
      id: 'styled-button',
      label: 'StyledButton.tsx',
      note: 'Правила зависят от props; класс генерирует библиотека.',
      executable: false,
      code: `import styled from 'styled-components';

// ═══════════════════════════════════════════
// CSS-in-JS ← стили рядом с компонентом
// ═══════════════════════════════════════════
export const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>\`
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  border: 1px solid transparent;
  /* ← PROPS: динамика без отдельного .primary.css */
  background: \${(p) =>
    p.$danger ? 'var(--danger)' : p.$primary ? 'var(--accent)' : 'transparent'};
  color: \${(p) => (p.$primary || p.$danger ? 'var(--bg-deep)' : 'var(--text)')};
\`;

// <Button $primary>Ок</Button>
// <Button $danger>Удалить</Button>`,
    },
    {
      id: 'runtime-inject',
      label: 'runtime-inject.ts',
      note: 'Упрощённая модель runtime: стиль живёт только после JS.',
      executable: false,
      languageLabel: 'ts',
      code: `// ═══════════════════════════════════════════
// RUNTIME ← inject <style> на клиенте
// ═══════════════════════════════════════════
export function ensureButtonStyles() {
  if (document.getElementById('sc-btn')) return;

  const el = document.createElement('style'); // ← FOUC, если поздно
  el.id = 'sc-btn';
  el.textContent = \`.sc-btn { background: var(--accent); }\`;
  document.head.appendChild(el);
}

// SSR: без критического CSS кнопка сначала «голая»`,
    },
  ],
}

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
  pattern: Pattern
  caseId: CaseId
  phase: Phase
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function StyleOrgViz({ pattern, caseId, phase, stageRef }: VizProps) {
  const on = phase !== 'idle'
  const done = phase === 'done'
  const scoped = caseId === 'scoped'
  const global = caseId === 'global'
  const propsCase = caseId === 'props'
  const runtime = caseId === 'runtime'

  if (pattern === 'modules') {
    const leftClass = !done ? '.root' : scoped ? 'Button_root_a3f2' : '.btn'
    const rightClass = !done ? '.root' : scoped ? 'Badge_root_b9k1' : '.btn'
    const bleed = done && global

    return (
      <LabVizPanel
        title="Два компонента"
        meta={scoped ? 'локальные хеши' : 'общий селектор .btn'}
      >
        <div ref={stageRef} className={styles.stage}>
          <div
            className={[
              styles.card,
              on && styles.cardOn,
              done && scoped && styles.cardOk,
              bleed && styles.cardWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.cardTitle}>PrimaryBtn</span>
            <span className={styles.classChip}>{leftClass}</span>
            <span className={[styles.sample, styles.samplePrimary].join(' ')}>Оплатить</span>
          </div>
          <div
            className={[
              styles.card,
              on && styles.cardOn,
              done && scoped && styles.cardOk,
              bleed && styles.cardWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.cardTitle}>DangerBadge</span>
            <span className={styles.classChip}>{rightClass}</span>
            <span
              className={[
                styles.sample,
                bleed ? styles.samplePrimary : styles.sampleDanger,
              ].join(' ')}
            >
              Срочно
            </span>
          </div>
        </div>
      </LabVizPanel>
    )
  }

  const leftClass = !done ? '—' : propsCase ? 'sc-pq1' : 'sc-btn'
  const rightClass = !done ? '—' : propsCase ? 'sc-xy2' : 'sc-btn'
  const unstyled = runtime && phase === 'map'
  const painted = runtime ? done : on

  return (
    <LabVizPanel
      title="Styled buttons"
      meta={propsCase ? 'правила от props' : 'inject style → paint'}
    >
      <div ref={stageRef} className={styles.stage}>
        <div
          className={[
            styles.card,
            on && styles.cardOn,
            done && propsCase && styles.cardOk,
            done && runtime && styles.cardWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.cardTitle}>$primary</span>
          <span className={styles.classChip}>{leftClass}</span>
          <span
            className={[
              styles.sample,
              painted && !unstyled ? styles.samplePrimary : styles.sampleGhost,
            ].join(' ')}
          >
            Ок
          </span>
          {runtime ? (
            <span className={styles.injectHint}>
              {phase === 'idle' ? 'нет style' : phase === 'map' ? 'inject…' : 'style#sc-btn в head'}
            </span>
          ) : null}
        </div>
        <div
          className={[
            styles.card,
            on && styles.cardOn,
            done && propsCase && styles.cardOk,
            done && runtime && styles.cardWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.cardTitle}>$danger</span>
          <span className={styles.classChip}>{rightClass}</span>
          <span
            className={[
              styles.sample,
              painted && !unstyled
                ? propsCase
                  ? styles.sampleDanger
                  : styles.samplePrimary
                : styles.sampleGhost,
            ].join(' ')}
          >
            Удалить
          </span>
          {runtime && done ? (
            <span className={styles.injectHint}>оба на одном sc-btn</span>
          ) : null}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutCssModulesCssInJsLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('modules')
  const [caseId, setCaseId] = useState<CaseId>('scoped')
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

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('map')
          if (pattern === 'modules') {
            log(
              'info',
              caseId === 'scoped'
                ? 'css-loader: .root → уникальный хеш на файл'
                : 'оба файла пишут глобальный .btn',
            )
          } else {
            log(
              'info',
              caseId === 'props'
                ? 'считаю правила из $primary / $danger'
                : 'создаю <style id="sc-btn"> в document.head',
            )
          }
        },
        () => {
          setPhase('done')
          if (pattern === 'modules') {
            if (caseId === 'scoped') {
              log('ok', 'Button_root_a3f2 ≠ Badge_root_b9k1 — leak нет')
            } else {
              log('err', 'один .btn → Badge выглядит как Primary')
            }
          } else if (caseId === 'props') {
            log('ok', 'sc-pq1 / sc-xy2 — варианты без коллизии имён')
          } else {
            log('warn', 'до inject кнопка без стилей; SSR нужен критический CSS')
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
        if (pattern === 'modules') {
          setHint(
            caseId === 'scoped'
              ? 'Локальные классы после хеша не пересекаются.'
              : 'Глобальный .btn снова общая область имён документа.',
          )
        } else {
          setHint(
            caseId === 'props'
              ? 'Props задают вид; библиотека выдаёт разные классы.'
              : 'Runtime-inject удобен, но без SSR-CSS будет FOUC.',
          )
        }
      },
    )
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {PATTERNS.map((p) => (
          <LabButton
            key={p.id}
            variant="ghost"
            size="sm"
            active={pattern === p.id}
            disabled={busy}
            onClick={() => selectPattern(p.id)}
          >
            {p.label}
          </LabButton>
        ))}
      </div>
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
            setPattern('modules')
            setCaseId('scoped')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <StyleOrgViz pattern={pattern} caseId={caseId} phase={phase} stageRef={stageRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={styles.codeSwitch}>
        {PATTERNS.map((p) => (
          <LabButton
            key={p.id}
            variant="ghost"
            size="sm"
            active={pattern === p.id}
            onClick={() => selectPattern(p.id)}
          >
            {p.label}
          </LabButton>
        ))}
      </div>
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
      title="CSS Modules и CSS-in-JS"
      lead="Изоляция классов: хеши на сборке или стили в JS. На схеме — leak vs scoped и props vs runtime-inject."
      problem={problem}
      code={code}
    />
  )
}
