import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { LighthouseAudit } from './LighthouseAudit'
import { TimelineSketch } from './TimelineSketch'
import { LabVsField } from './LabVsField'
import styles from './PerformanceLab.module.css'

gsap.registerPlugin(useGSAP)

export function PerformanceLab() {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      gsap.from('.labSection', {
        opacity: 0,
        y: 14,
        stagger: 0.1,
        duration: 0.45,
        ease: 'power2.out',
      })
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className={styles.root}>
      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Lighthouse audit</h2>
        <p className={styles.lead}>
          Запустите аудит и посмотрите категории score. Клик по категории — что внутри.
        </p>
        <LighthouseAudit />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Performance timeline</h2>
        <p className={styles.lead}>
          Упрощённая запись: long task, layout/paint, сеть и маркеры FCP / LCP.
        </p>
        <TimelineSketch />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>Lab vs Field</h2>
        <p className={styles.lead}>Lighthouse/DevTools ≠ реальные пользователи (CrUX / RUM).</p>
        <LabVsField />
      </section>
    </div>
  )
}
