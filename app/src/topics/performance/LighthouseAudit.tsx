import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './LighthouseAudit.module.css'

gsap.registerPlugin(useGSAP)

type CategoryId = 'performance' | 'accessibility' | 'bestPractices' | 'seo'

type Category = {
  id: CategoryId
  label: string
  score: number
  detail: string
}

const TARGETS: Category[] = [
  {
    id: 'performance',
    label: 'Performance',
    score: 72,
    detail: 'FCP, LCP, TBT, CLS, Speed Index — lab-метрики на эмулируемом устройстве.',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    score: 91,
    detail: 'Контраст, aria, семантика, focus order — не заменяет ручной a11y-аудит.',
  },
  {
    id: 'bestPractices',
    label: 'Best Practices',
    score: 88,
    detail: 'HTTPS, console errors, устаревшие API, безопасные библиотеки.',
  },
  {
    id: 'seo',
    label: 'SEO',
    score: 96,
    detail: 'meta description, crawlable links, viewport, robots — базовые проверки.',
  },
]

function scoreTone(score: number): 'good' | 'ok' | 'poor' {
  if (score >= 90) return 'good'
  if (score >= 50) return 'ok'
  return 'poor'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LighthouseAudit() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [scores, setScores] = useState<Record<CategoryId, number> | null>(null)
  const [active, setActive] = useState<CategoryId | null>(null)

  const { contextSafe } = useGSAP({ scope: rootRef })

  const run = contextSafe(() => {
    if (running) return
    setRunning(true)
    setActive(null)
    setScores({
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
    })

    const next: Record<CategoryId, number> = {
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
    }

    if (prefersReducedMotion()) {
      for (const cat of TARGETS) next[cat.id] = cat.score
      setScores({ ...next })
      setRunning(false)
      return
    }

    const tl = gsap.timeline({
      onComplete: () => setRunning(false),
    })

    TARGETS.forEach((cat, i) => {
      const proxy = { v: 0 }
      tl.to(
        proxy,
        {
          v: cat.score,
          duration: 0.7,
          ease: 'power2.out',
          onUpdate: () => {
            next[cat.id] = Math.round(proxy.v)
            setScores({ ...next })
          },
        },
        i * 0.12,
      )
    })
  })

  const selected = TARGETS.find((c) => c.id === active)

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="uiBtn uiBtnPrimary"
          onClick={run}
          disabled={running}
        >
          {running ? 'Анализ…' : scores ? 'Перезапустить' : 'Run audit'}
        </button>
        <span className={styles.hint}>lab-данные · не Field</span>
      </div>

      <div className={styles.grid}>
        {TARGETS.map((cat) => {
          const value = scores?.[cat.id]
          const tone = value == null ? 'idle' : scoreTone(value)
          return (
            <button
              key={cat.id}
              type="button"
              className={`${styles.card} ${styles[tone]} ${active === cat.id ? styles.selected : ''}`}
              onClick={() => setActive(active === cat.id ? null : cat.id)}
              disabled={value == null}
            >
              <span className={styles.ring} data-tone={tone}>
                <span className={styles.score}>{value ?? '—'}</span>
              </span>
              <span className={styles.label}>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {selected ? <p className={styles.detail}>{selected.detail}</p> : null}
    </div>
  )
}
