import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './TimelineSketch.module.css'

gsap.registerPlugin(useGSAP)

type Track = {
  id: string
  label: string
  color: string
  start: number
  width: number
}

const TRACKS: Track[] = [
  { id: 'js', label: 'JS (long task)', color: '#f48771', start: 8, width: 28 },
  { id: 'layout', label: 'Layout / Paint', color: '#dcdcaa', start: 34, width: 18 },
  { id: 'net', label: 'Network', color: '#81a1c1', start: 2, width: 55 },
]

const MARKERS = [
  { id: 'fcp', label: 'FCP', at: 22 },
  { id: 'lcp', label: 'LCP', at: 48 },
]

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function TimelineSketch() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [recorded, setRecorded] = useState(false)
  const [recording, setRecording] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)

  const { contextSafe } = useGSAP({ scope: rootRef })

  const record = contextSafe(() => {
    if (recording) return
    setRecording(true)
    setFocus(null)
    setRecorded(false)

    const finish = () => {
      setRecorded(true)
      setRecording(false)
    }

    if (prefersReducedMotion()) {
      gsap.set('.tlBar', { scaleX: 1 })
      gsap.set('.tlMarker', { opacity: 1, y: 0 })
      finish()
      return
    }

    gsap.set('.tlBar', { scaleX: 0, transformOrigin: 'left center' })
    gsap.set('.tlMarker', { opacity: 0, y: -6 })
    gsap.to('.tlBar', {
      scaleX: 1,
      duration: 0.85,
      stagger: 0.12,
      ease: 'power2.out',
      onComplete: finish,
    })
    gsap.to('.tlMarker', {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.1,
      delay: 0.4,
    })
  })

  const note =
    focus === 'js'
      ? 'Long task > 50 мс блокирует main thread → страдает INP / TBT.'
      : focus === 'layout'
        ? 'Layout/Paint после стилей и DOM — jank, если слишком часто.'
        : focus === 'net'
          ? 'Водопад сети: TTFB, размер, кэш. Смотрите и во вкладке Network.'
          : focus === 'fcp'
            ? 'FCP — первая отрисовка текста/картинки. Lab-метрика Lighthouse.'
            : focus === 'lcp'
              ? 'LCP — крупнейший контент. Цель ≤ 2.5 с (Field/Lab).'
              : null

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`uiBtn ${recording ? 'uiBtnDanger' : 'uiBtnPrimary'}`}
          onClick={record}
          disabled={recording}
        >
          {recording ? 'Recording…' : recorded ? 'Record again' : '● Record'}
        </button>
        <span className={styles.hint}>DevTools → Performance</span>
      </div>

      <div className={`${styles.panel} ${recorded || recording ? styles.visible : ''}`}>
        <div className={styles.ruler} aria-hidden>
          <span>0 ms</span>
          <span>500</span>
          <span>1000</span>
          <span>1500</span>
        </div>

        <div className={styles.markers}>
          {MARKERS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`tlMarker ${styles.marker}`}
              style={{ left: `${m.at}%` }}
              onClick={() => setFocus(focus === m.id ? null : m.id)}
              disabled={!recorded}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className={styles.tracks}>
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.track}
              onClick={() => setFocus(focus === t.id ? null : t.id)}
              disabled={!recorded}
            >
              <span className={styles.trackLabel}>{t.label}</span>
              <span className={styles.trackLane}>
                <span
                  className={`tlBar ${styles.bar}`}
                  style={{
                    left: `${t.start}%`,
                    width: `${t.width}%`,
                    background: t.color,
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      {note ? <p className={styles.note}>{note}</p> : null}
      {!recorded && !recording ? (
        <p className={styles.empty}>Нажмите Record — появится упрощённый flamechart.</p>
      ) : null}
    </div>
  )
}
