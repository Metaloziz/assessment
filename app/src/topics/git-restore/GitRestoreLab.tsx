import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { RestoreSimulator } from './RestoreSimulator'
import styles from './GitRestoreLab.module.css'

gsap.registerPlugin(useGSAP)

export function GitRestoreLab() {
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
        <h2 className={styles.title}>Симулятор restore</h2>
        <p className={styles.lead}>
          Три слоя файла: HEAD → Index → Working tree. Кнопки показывают, куда
          пишет <code>git restore</code> и флаги <code>--staged</code> /{' '}
          <code>--source</code>.
        </p>
        <RestoreSimulator />
      </section>
    </div>
  )
}
