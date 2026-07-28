import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { SwitchSimulator } from './SwitchSimulator'
import { SwitchVsCheckout } from './SwitchVsCheckout'
import styles from './GitSwitchLab.module.css'

gsap.registerPlugin(useGSAP)

export function GitSwitchLab() {
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
        <h2 className={styles.title}>Симулятор switch</h2>
        <p className={styles.lead}>
          Клик по ветке = <code>git switch</code>. Включите «незакоммиченные правки» —
          Git откажется переключаться.
        </p>
        <SwitchSimulator />
      </section>

      <section className={`labSection ${styles.section}`}>
        <h2 className={styles.title}>switch vs checkout</h2>
        <p className={styles.lead}>
          Переключайте вкладки и сравните зону ответственности: ветки отдельно,
          файлы — через <code>restore</code>.
        </p>
        <SwitchVsCheckout />
      </section>
    </div>
  )
}
