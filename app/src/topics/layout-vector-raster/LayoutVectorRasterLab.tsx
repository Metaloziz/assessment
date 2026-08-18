import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './LayoutVectorRasterLab.module.css'

const TOPIC_ID = '164-layout-vector-raster'
const STEP = 0.65

type CaseId = 'icon' | 'photo'
type Phase = 'idle' | 'paint' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'icon', label: 'Иконка ×3' },
  { id: 'photo', label: 'Фото' },
]

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  icon: (
    <>
      Один знак: <code>SVG</code> остаётся линией, растр 24×24 на том же месте показывает квадраты.
    </>
  ),
  photo: (
    <>
      Снимок — сетка точек; те же горы кривыми в <code>SVG</code> выглядят как схема, не как фото.
    </>
  ),
}

const SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'logo-svg',
    label: 'logo.svg',
    note: 'Вектор: фигуры в `viewBox`. CSS меняет размер — линии пересчитываются.',
    executable: false,
    languageLabel: 'svg',
    code: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <!-- VECTOR ← пути, не сетка пикселей -->
  <rect
    x="2.5" y="2.5" width="19" height="19" rx="5"
    stroke="currentColor" stroke-width="2"
  />
  <path
    d="M6 16.5 10 10l4 4 4.5-7"
    stroke="currentColor"
    stroke-width="2"
    stroke-linejoin="round"
    stroke-linecap="round"
  />
</svg>`,
  },
  {
    id: 'graphics-css',
    label: 'graphics.css',
    note: '`currentColor` красит SVG вместе с текстом. Растр 24px так не растянуть.',
    executable: false,
    languageLabel: 'css',
    code: `.logo {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--accent);
}

.logo--hero {
  width: 6rem;   /* ← VECTOR: тот же logo.svg */
  height: 6rem;
}

/* RASTER (антипример): иконка 24×24 в шапке
.logo--hero {
  width: 6rem;
  height: 6rem;
  image-rendering: pixelated; /* ← лесенка */
}
*/`,
  },
  {
    id: 'index-html',
    label: 'index.html',
    note: 'Фото — растр и `srcset`. `<image>` внутри SVG не делает снимок вектором.',
    executable: false,
    languageLabel: 'html',
    code: `<header>
  <img class="logo logo--hero" src="/logo.svg" alt="" />
</header>

<picture>
  <source type="image/avif" srcset="hero.avif 800w, hero@2x.avif 1600w" />
  <source type="image/webp" srcset="hero.webp 800w, hero@2x.webp 1600w" />
  <!-- RASTER ← сетка; без 2x на плотном экране мыло -->
  <img
    src="hero.jpg"
    srcset="hero.jpg 800w, hero@2x.jpg 1600w"
    sizes="(max-width: 600px) 100vw, 640px"
    alt="Товар на белом фоне"
  />
</picture>

<!-- ловушка: растр внутри SVG
<svg viewBox="0 0 640 360">
  <image href="hero.jpg" width="640" height="360" />
</svg>
-->`,
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
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function LogoSvg() {
  return (
    <svg className={styles.svgMark} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 16.5 10 10l4 4 4.5-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function drawLogo(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 24
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = '#9ecbff'
  ctx.lineWidth = 2 * s
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.roundRect(2.5 * s, 2.5 * s, 19 * s, 19 * s, 5 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(6 * s, 16.5 * s)
  ctx.lineTo(10 * s, 10 * s)
  ctx.lineTo(14 * s, 14 * s)
  ctx.lineTo(18.5 * s, 7 * s)
  ctx.stroke()
}

function drawPhoto(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#3d6ea8')
  sky.addColorStop(0.55, '#c48a5a')
  sky.addColorStop(1, '#6b4a38')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#f0c36a'
  ctx.beginPath()
  ctx.arc(w * 0.78, h * 0.28, h * 0.16, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#4a3a32'
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(w * 0.28, h * 0.42)
  ctx.lineTo(w * 0.52, h)
  ctx.fill()
  ctx.fillStyle = '#3a2e28'
  ctx.beginPath()
  ctx.moveTo(w * 0.38, h)
  ctx.lineTo(w * 0.68, h * 0.36)
  ctx.lineTo(w, h)
  ctx.fill()

  const image = ctx.getImageData(0, 0, w, h)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28
    data[i] = Math.max(0, Math.min(255, data[i] + n))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n))
  }
  ctx.putImageData(image, 0, 0)
}

function RasterLogo() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width = 24
    canvas.height = 24
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    drawLogo(ctx, 24)
  }, [])
  return <canvas ref={ref} className={styles.rasterCanvas} aria-hidden />
}

function RasterPhoto() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width = 120
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawPhoto(ctx, 120, 80)
  }, [])
  return <canvas ref={ref} className={styles.photoCanvas} aria-hidden />
}

function PhotoSvg() {
  return (
    <svg className={styles.photoSvg} viewBox="0 0 120 80" aria-hidden="true">
      <rect width="120" height="80" fill="#4a7aad" />
      <circle cx="94" cy="22" r="12" fill="#e8c45a" />
      <polygon points="0,80 34,34 62,80" fill="#6b5a4a" />
      <polygon points="46,80 82,28 120,80" fill="#5a4a3c" />
    </svg>
  )
}

function sourceMeta(kind: 'vector' | 'raster', caseId: CaseId, visible: boolean) {
  if (!visible) return 'ещё нет'
  if (caseId === 'icon') {
    return kind === 'vector' ? 'SVG · viewBox 24' : 'PNG-сетка 24×24'
  }
  return kind === 'vector' ? 'SVG · контуры' : 'JPEG-сетка + зерно'
}

type VizProps = {
  phase: Phase
  caseId: CaseId
  stageRef: MutableRefObject<HTMLDivElement | null>
}

function GraphicsViz({ phase, caseId, stageRef }: VizProps) {
  const painted = phase === 'paint' || phase === 'done'
  const done = phase === 'done'
  const large = caseId === 'icon' && phase === 'done'
  const vectorOk = caseId === 'icon' ? done : false
  const rasterOk = caseId === 'photo' ? done : false
  const vectorWarn = caseId === 'photo' ? done : false
  const rasterWarn = caseId === 'icon' ? done : false

  return (
    <LabVizPanel
      title={caseId === 'icon' ? 'Один знак, два файла' : 'Снимок и схема'}
      meta={caseId === 'icon' ? 'масштаб ×3' : 'фото против контуров'}
    >
      <div ref={stageRef} className={styles.stage}>
        <div
          className={[
            styles.card,
            painted && styles.cardOn,
            vectorOk && styles.cardOk,
            vectorWarn && styles.cardWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Вектор</span>
            <span className={styles.cardMeta}>{sourceMeta('vector', caseId, painted)}</span>
          </div>
          {painted ? (
            <div className={styles.preview}>
              {caseId === 'icon' ? (
                <div className={[styles.markFrame, large && styles.markFrameLg].filter(Boolean).join(' ')}>
                  <LogoSvg />
                </div>
              ) : (
                <div className={styles.photoFrame}>
                  <PhotoSvg />
                </div>
              )}
            </div>
          ) : (
            <div className={styles.previewGhost}>нет картинки</div>
          )}
        </div>

        <div
          className={[
            styles.card,
            painted && styles.cardOn,
            rasterOk && styles.cardOk,
            rasterWarn && styles.cardWarn,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Растр</span>
            <span className={styles.cardMeta}>{sourceMeta('raster', caseId, painted)}</span>
          </div>
          {painted ? (
            <div className={styles.preview}>
              {caseId === 'icon' ? (
                <div className={[styles.markFrame, large && styles.markFrameLg].filter(Boolean).join(' ')}>
                  <RasterLogo />
                </div>
              ) : (
                <div className={styles.photoFrame}>
                  <RasterPhoto />
                </div>
              )}
            </div>
          ) : (
            <div className={styles.previewGhost}>нет картинки</div>
          )}
        </div>
      </div>
    </LabVizPanel>
  )
}

export function LayoutVectorRasterLab() {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('icon')
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
    const icon = caseId === 'icon'

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('paint')
          log(
            'info',
            icon ? 'кладу один знак: SVG и сетка 24×24' : 'кладу пейзаж контурами и сеткой точек',
          )
        },
        () => {
          setPhase('done')
          if (icon) {
            log('ok', 'SVG пересчитал линии')
            log('err', 'растр 24×24 — квадраты')
          } else {
            log('ok', 'растр держит полутона и зерно')
            log('err', 'SVG остался схемой')
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
          icon
            ? 'вектор пересчитал линии; растр 24px показал квадраты.'
            : 'снимок — сетка пикселей; контуры SVG не заменяют фото.',
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
            setCaseId('icon')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>
        Вектор помнит фигуры и остаётся чётким при любом размере. Растр — готовая сетка точек: фото
        выглядит живо, иконка 24px при увеличении распадается на квадраты.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <GraphicsViz phase={phase} caseId={caseId} stageRef={stageRef} />

      {hint ? <p className={shell.hint}>Итог: {hint}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="`SVG` — фигуры и `currentColor`; фото — `picture` / `srcset`. Встроенный `<image>` уже не вектор."
      snippets={SNIPPETS}
    />
  )

  return (
    <JsLabShell
      title="Вектор и растр"
      lead="Иконка и фото — разные файлы: SVG против JPEG. На стенде один сюжет, два способа хранения."
      problem={problem}
      code={code}
    />
  )
}
