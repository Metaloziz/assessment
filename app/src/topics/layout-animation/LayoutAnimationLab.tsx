import { useEffect, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutAnimationLab.module.css'

const TOPIC_ID = '170-layout-animation'

type CaseId = 'fade' | 'slide' | 'scale' | 'ease' | 'transition' | 'width' | 'stagger' | 'reduced'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'fade', label: 'Opacity' },
  { id: 'slide', label: 'Transform' },
  { id: 'scale', label: 'Scale' },
  { id: 'ease', label: 'Easing' },
  { id: 'transition', label: 'Transition' },
  { id: 'stagger', label: 'Delay' },
  { id: 'width', label: 'Width' },
  { id: 'reduced', label: 'Reduced' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  fade: (
    <>
      <code>@keyframes</code> меняет только <code>opacity</code> — обычно дёшево для композитора.
    </>
  ),
  slide: (
    <>
      Сдвиг через <code>transform: translateX</code>, без <code>left</code> / <code>margin</code>.
    </>
  ),
  scale: (
    <>
      <code>transform: scale</code> — тот же класс «дешёвых» свойств, что и translate.
    </>
  ),
  ease: (
    <>
      Та же траектория, но <code>cubic-bezier(0.22, 1, 0.36, 1)</code> — мягкий выбег.
    </>
  ),
  transition: (
    <>
      Класс переключает состояние: <code>transition</code> плавно ведёт A → B и обратно.
    </>
  ),
  stagger: (
    <>
      Три блока с разным <code>animation-delay</code> — каскад без JS-таймлайна.
    </>
  ),
  width: (
    <>
      Анимация <code>width</code> гоняет layout на каждом кадре — заметно дороже transform.
    </>
  ),
  reduced: (
    <>
      Без motion: конечный кадр сразу — как при <code>prefers-reduced-motion: reduce</code>.
    </>
  ),
}

const CASE_META: Record<CaseId, string> = {
  fade: 'keyframes · opacity',
  slide: 'keyframes · translateX',
  scale: 'keyframes · scale',
  ease: 'cubic-bezier',
  transition: 'transition · toggle class',
  stagger: 'animation-delay',
  width: 'layout thrash',
  reduced: 'motion off',
}

const CASE_CSS: Record<CaseId, string> = {
  fade: `animation: fade 1.1s ease-in-out infinite alternate;
/* только opacity */`,
  slide: `animation: slide 1.1s ease-in-out infinite alternate;
/* transform — не left */`,
  scale: `animation: scale 1.1s ease-in-out infinite alternate;`,
  ease: `animation-timing-function:
  cubic-bezier(0.22, 1, 0.36, 1);`,
  transition: `transition: transform 450ms ease,
            opacity 450ms ease;
.isOn { transform: translateX(1.6rem); }`,
  stagger: `.b { animation-delay: 0.15s; }
.c { animation-delay: 0.3s; }`,
  width: `animation: growWidth 1.2s …;
/* WARN: width → layout */`,
  reduced: `@media (prefers-reduced-motion: reduce) {
  animation: none;
  transition: none;
}`,
}

const FRAME_CLASS: Record<CaseId, string> = {
  fade: styles.fade,
  slide: styles.slide,
  scale: styles.scale,
  ease: styles.ease,
  transition: styles.transition,
  stagger: styles.stagger,
  width: styles.width,
  reduced: styles.reduced,
}

const WARN_CASES: Partial<Record<CaseId, true>> = {
  width: true,
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'transition',
    label: 'transition.css',
    note: 'Переход на смену класса. Свойства перечислять явно — не all.',
    executable: false,
    languageLabel: 'css',
    code: `.panel {
  opacity: 0;
  transform: translateY(0.5rem);
  transition:
    opacity 200ms ease,
    transform 200ms ease; /* ← не left/width */
}

.panel.isOpen {
  opacity: 1;
  transform: translateY(0);
}`,
  },
  {
    id: 'keyframes',
    label: 'keyframes.css',
    note: 'Сценарий и каскад delay. Transform/opacity предпочтительнее layout.',
    executable: false,
    languageLabel: 'css',
    code: `@keyframes slide {
  from { transform: translateX(-1rem); }
  to   { transform: translateX(1rem); }
}

.chip {
  animation: slide 1.1s ease-in-out infinite alternate;
}

.chip:nth-child(2) { animation-delay: 0.15s; } /* ← stagger */
.chip:nth-child(3) { animation-delay: 0.3s; }`,
  },
  {
    id: 'reduced-layout',
    label: 'reduced-layout.css',
    note: 'Reduced-motion обязателен. Width — антипример для UI-motion.',
    executable: false,
    languageLabel: 'css',
    code: `@media (prefers-reduced-motion: reduce) {
  .panel,
  .chip {
    animation: none;
    transition: none;
  }
}

/* WARN: layout на каждом кадре
.bad {
  animation: grow 1s infinite alternate;
}
@keyframes grow {
  from { width: 3rem; }
  to   { width: 7rem; }
}
*/`,
  },
]

function AnimViz({ caseId, transitionOn }: { caseId: CaseId; transitionOn: boolean }) {
  const warn = Boolean(WARN_CASES[caseId])
  const multi = caseId === 'stagger'
  const boxes = multi ? ['A', 'B', 'C'] : ['A']

  return (
    <LabVizPanel title="Движение блока" meta={CASE_META[caseId]}>
      <div className={styles.stage}>
        <div
          className={[
            styles.frame,
            FRAME_CLASS[caseId],
            caseId === 'transition' && transitionOn && styles.transitionIsOn,
            warn ? styles.frameWarn : styles.frameOk,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {boxes.map((label) => (
            <div
              key={`${caseId}-${label}`}
              className={[styles.box, warn && styles.boxWarn].filter(Boolean).join(' ')}
            >
              <span className={styles.boxLabel}>{label}</span>
              <span className={styles.boxRole}>
                {caseId === 'width'
                  ? 'width'
                  : caseId === 'reduced'
                    ? 'статично'
                    : caseId === 'transition'
                      ? transitionOn
                        ? 'to'
                        : 'from'
                      : caseId === 'stagger'
                        ? 'delay'
                        : 'motion'}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.metaRow}>
          <code className={styles.metaCode}>{CASE_CSS[caseId]}</code>
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutAnimationLab() {
  const [caseId, setCaseId] = useState<CaseId>('fade')
  const [transitionOn, setTransitionOn] = useState(false)

  useEffect(() => {
    if (caseId !== 'transition') {
      setTransitionOn(false)
      return
    }
    setTransitionOn(false)
    const kick = window.setTimeout(() => setTransitionOn(true), 80)
    const id = window.setInterval(() => setTransitionOn((v) => !v), 1100)
    return () => {
      window.clearTimeout(kick)
      window.clearInterval(id)
    }
  }, [caseId])

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => setCaseId(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <p className={shell.pain}>
        Один блок (или три с delay). Меняется способ анимации — видно разницу между transform,
        transition, layout и отключением motion.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <AnimViz caseId={caseId} transitionOn={transitionOn} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`transition` на смену состояния; `@keyframes` для сценария. Transform/opacity дёшево; width — нет; reduced-motion — обязательно."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Анимация"
      lead="Переключай приём — сразу видно, как движется блок и чем это отличается."
      problem={problem}
      code={code}
    />
  )
}
