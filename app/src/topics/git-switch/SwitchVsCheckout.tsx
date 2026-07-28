import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './SwitchVsCheckout.module.css'

gsap.registerPlugin(useGSAP)

type Side = 'switch' | 'checkout'

type Capability = {
  id: string
  label: string
  switch: boolean
  checkout: boolean
  note: string
}

const CAPABILITIES: Capability[] = [
  {
    id: 'branches',
    label: 'Переключить ветку',
    switch: true,
    checkout: true,
    note: 'switch develop · checkout develop',
  },
  {
    id: 'create',
    label: 'Создать ветку и перейти',
    switch: true,
    checkout: true,
    note: 'switch -c name · checkout -b name',
  },
  {
    id: 'files',
    label: 'Восстановить файл',
    switch: false,
    checkout: true,
    note: 'checkout -- file.js → лучше restore',
  },
  {
    id: 'detached',
    label: 'Detached HEAD по коммиту',
    switch: false,
    checkout: true,
    note: 'checkout abc1234 (или switch -d)',
  },
]

const TASKS = [
  {
    task: 'Перейти на ветку',
    modern: 'git switch branch',
    legacy: 'git checkout branch',
  },
  {
    task: 'Создать и перейти',
    modern: 'git switch -c name',
    legacy: 'git checkout -b name',
  },
  {
    task: 'Откатить файл',
    modern: 'git restore file',
    legacy: 'git checkout -- file',
  },
]

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function SwitchVsCheckout() {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<Side>('switch')

  const { contextSafe } = useGSAP({ scope: rootRef })

  const select = contextSafe((next: Side) => {
    setSide(next)
    if (prefersReducedMotion() || !panelRef.current) return
    gsap.fromTo(
      panelRef.current,
      { opacity: 0.35, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
    )
  })

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.toggle} role="tablist" aria-label="switch или checkout">
        <button
          type="button"
          role="tab"
          aria-selected={side === 'switch'}
          className={`${styles.tab} ${side === 'switch' ? styles.activeSwitch : ''}`}
          onClick={() => select('switch')}
        >
          git switch
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === 'checkout'}
          className={`${styles.tab} ${side === 'checkout' ? styles.activeCheckout : ''}`}
          onClick={() => select('checkout')}
        >
          git checkout
        </button>
      </div>

      <div ref={panelRef} className={styles.panel}>
        <p className={styles.tagline}>
          {side === 'switch'
            ? 'Узкая команда: только ветки. Намерение читается из имени.'
            : 'Универсальная команда: ветки + файлы + коммиты. Легко перепутать смысл.'}
        </p>

        <ul className={styles.caps}>
          {CAPABILITIES.map((cap) => {
            const allowed = side === 'switch' ? cap.switch : cap.checkout
            return (
              <li
                key={cap.id}
                className={`${styles.cap} ${allowed ? styles.yes : styles.no}`}
              >
                <span className={styles.mark} aria-hidden>
                  {allowed ? '●' : '○'}
                </span>
                <div className={styles.capBody}>
                  <span className={styles.capLabel}>{cap.label}</span>
                  <span className={styles.capNote}>{cap.note}</span>
                </div>
                <span className={styles.capStatus}>{allowed ? 'да' : 'нет'}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={styles.compare}>
        <div className={styles.compareHead}>
          <span>Задача</span>
          <span>Современно</span>
          <span>Раньше</span>
        </div>
        {TASKS.map((row) => (
          <div key={row.task} className={styles.compareRow}>
            <span className={styles.task}>{row.task}</span>
            <code className={styles.modern}>{row.modern}</code>
            <code className={styles.legacy}>{row.legacy}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
