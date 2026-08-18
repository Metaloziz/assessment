import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutTypographyLab.module.css'

const TOPIC_ID = '165-layout-typography'
const STEP = 0.65

type CaseId = 'scale' | 'drift'
type Phase = 'idle' | 'paint' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'scale', label: 'Type scale' },
  { id: 'drift', label: 'Случайные px' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  scale: (
    <>
      Заголовок, лид и абзац из <code>rem</code> + <code>line-height</code> токенов — один ритм на
      экранах.
    </>
  ),
  drift: (
    <>
      Три блока с разными <code>px</code>, семействами и синтетическим <code>font-weight: 300</code>{' '}
      — иерархия «плывёт».
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'font-face',
    label: 'fonts.css',
    note: '@font-face: woff2, weight/style, font-display.',
    executable: false,
    languageLabel: 'css',
    code: `@font-face {
  font-family: "Geist";
  src:
    url("/fonts/geist-latin.woff2") format("woff2"),
    url("/fonts/geist-latin.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* ← текст сразу fallback, потом webfont */
}

@font-face {
  font-family: "Geist";
  src: url("/fonts/geist-latin.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

:root {
  /* ← стек: бренд → системный → generic */
  --font-sans: "Geist", system-ui, -apple-system, sans-serif;
}`,
  },
  {
    id: 'typography',
    label: 'typography.css',
    note: 'Type scale и свойства текста через переменные.',
    executable: false,
    languageLabel: 'css',
    code: `:root {
  --text-sm: 0.875rem;
  --text-base: 0.9375rem;
  --text-lg: 1.125rem;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
}

.article__title {
  font-family: var(--font-sans);
  font-size: var(--text-lg);       /* ← SCALE */
  font-weight: 600;
  line-height: var(--leading-tight);
}

.article__lead {
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1.4;
}

.article__body {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* DRIFT (антипример): px и разные family на каждый блок
.article__title { font: 700 22px Georgia; }
.article__lead { font: 300 15px/18px system-ui; }
.article__body { font-size: 13px; font-family: Arial; }
*/`,
  },
  {
    id: 'index-html',
    label: 'index.html',
    note: 'Preconnect и preload критичного woff2.',
    executable: false,
    languageLabel: 'html',
    code: `<!doctype html>
<html lang="ru">
  <head>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <!-- ← preload LCP-шрифта -->
    <link
      rel="preload"
      href="/fonts/geist-latin.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link rel="stylesheet" href="/fonts.css" />
    <link rel="stylesheet" href="/typography.css" />
  </head>
  <body>
    <article class="article">
      <h1 class="article__title">Заголовок</h1>
      <p class="article__lead">Краткий лид абзаца.</p>
      <p class="article__body">Основной текст статьи.</p>
    </article>
  </body>
</html>`,
  },
]

type PreviewId = 'article' | 'card'

const PREVIEWS: Array<{ id: PreviewId; title: string }> = [
  { id: 'article', title: 'Статья' },
  { id: 'card', title: 'Карточка' },
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

function PreviewText({ caseId, visible }: { caseId: CaseId; visible: boolean }) {
  if (!visible) return null

  if (caseId === 'scale') {
    return (
      <>
        <h3 className={styles.scaleH}>Заголовок материала</h3>
        <p className={styles.scaleLead}>Лид: одна мысль на абзац, читаемый кегль.</p>
        <p className={styles.scaleBody}>
          Основной текст — rem, единый line-height, один sans-стек на все уровни.
        </p>
      </>
    )
  }

  return (
    <>
      <h3 className={styles.driftH}>Заголовок материала</h3>
      <p className={styles.driftLead}>Лид: 15px / 18px и weight 300 без файла.</p>
      <p className={styles.driftBody}>Тело: 13px Arial — другой ритм и семейство.</p>
    </>
  )
}

function metaLabel(caseId: CaseId, visible: boolean) {
  if (!visible) return 'ещё не показано'
  return caseId === 'scale' ? 'rem · var(--text-*) · один стек' : '22/15/13 px · 3 family'
}

function TypographyViz({
  phase,
  caseId,
  stageRef,
}: {
  phase: Phase
  caseId: CaseId
  stageRef: MutableRefObject<HTMLDivElement | null>
}) {
  const scale = caseId === 'scale'
  const painted = phase === 'paint' || phase === 'done'
  const done = phase === 'done'

  return (
    <LabVizPanel
      title="Типографика на экранах"
      meta={scale ? 'type scale + font-family' : 'случайные px и family'}
    >
      <div ref={stageRef} className={styles.stage}>
        {PREVIEWS.map((preview) => (
          <div
            key={preview.id}
            className={[
              styles.card,
              painted && styles.cardOn,
              done && scale && styles.cardOk,
              done && !scale && styles.cardWarn,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>{preview.title}</span>
              <span className={styles.cardMeta}>{metaLabel(caseId, painted)}</span>
            </div>
            <div className={styles.preview}>
              {painted ? (
                <PreviewText caseId={caseId} visible={painted} />
              ) : (
                <span className={styles.previewGhost}>Текст появится после запуска</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </LabVizPanel>
  )
}

export function LayoutTypographyLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('scale')
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
    const scale = caseId === 'scale'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('paint')
          log(
            'info',
            scale
              ? 'рисую заголовок / лид / body из rem-токенов и --font-sans'
              : 'три блока с px, Georgia, Arial и синтетическим weight 300',
          )
        },
        () => {
          setPhase('done')
          if (scale) {
            log('ok', 'Статья и карточка — один ритм и стек')
          } else {
            log('err', 'Кегли 22/15/13 px и разные family — иерархия расходится')
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
          scale
            ? 'Type scale и font-family держат читаемую иерархию на всех блоках.'
            : 'Без шкалы и стека каждый блок «свой» — текст труднее сканировать.',
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
            setCaseId('scale')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Типографика — не только «красивый шрифт»: без шкалы размеров и стека family заголовки и
        абзацы на соседних блоках расходятся по кеглю и ритму.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <TypographyViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="@font-face + type scale; preload woff2 для LCP-текста."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Типографика"
      lead="font-family, свойства текста и подключение webfont — один ритм vs хаос px."
      problem={problem}
      code={code}
    />
  )
}
