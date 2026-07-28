import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './MutationVsCopyDemo.module.css'

gsap.registerPlugin(useGSAP)

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MutationVsCopyDemo() {
  const rootRef = useRef<HTMLDivElement>(null)
  const mutatedRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const [mutAge, setMutAge] = useState(25)
  const [copyAge, setCopyAge] = useState<number | null>(null)
  const [eq, setEq] = useState<boolean | null>(null)

  const { contextSafe } = useGSAP({ scope: rootRef })

  const mutate = contextSafe(() => {
    setMutAge(26)
    setEq(true)
    if (prefersReducedMotion()) return
    gsap.fromTo(
      mutatedRef.current,
      { boxShadow: '0 0 0 0 rgba(224, 122, 95, 0.0)' },
      {
        boxShadow: '0 0 0 6px rgba(224, 122, 95, 0.25)',
        duration: 0.35,
        yoyo: true,
        repeat: 1,
      },
    )
    gsap.to(mutatedRef.current?.querySelector('[data-field="age"]') ?? null, {
      color: '#e07a5f',
      scale: 1.08,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
    })
  })

  const copy = contextSafe(() => {
    setCopyAge(26)
    setEq(false)
    if (prefersReducedMotion()) return
    gsap.fromTo(
      copyRef.current,
      { opacity: 0, x: -24, scale: 0.92 },
      { opacity: 1, x: 0, scale: 1, duration: 0.45, ease: 'power2.out' },
    )
    gsap.to(originalRef.current, {
      outlineColor: 'rgba(61, 186, 154, 0.5)',
      duration: 0.3,
      yoyo: true,
      repeat: 1,
    })
  })

  const reset = () => {
    setMutAge(25)
    setCopyAge(null)
    setEq(null)
    gsap.set([mutatedRef.current, copyRef.current, originalRef.current], { clearProps: 'all' })
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnDanger" onClick={mutate}>
          Мутировать
        </button>
        <button type="button" className="uiBtn uiBtnPrimary" onClick={copy}>
          Скопировать
        </button>
        <button type="button" className="uiBtn uiBtnGhost" onClick={reset}>
          Сброс
        </button>
      </div>

      <div className={styles.stage}>
        <div ref={mutatedRef} className={styles.card}>
          <div className={styles.cardTitle}>Мутация in-place</div>
          <pre className={styles.code}>
{`const user = { name: 'Anna', age: ${mutAge} }
user.age = 26  // тот же объект`}
          </pre>
          <div className={styles.fields}>
            <span>name: Anna</span>
            <span data-field="age">age: {mutAge}</span>
          </div>
          <div className={styles.hint}>Ссылка не меняется → React может не увидеть обновление</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Immutable copy</div>
          <div className={styles.pair}>
            <div ref={originalRef} className={`${styles.mini} ${styles.original}`}>
              <div>prev</div>
              <code>{`{ age: 25 }`}</code>
            </div>
            <div ref={copyRef} className={`${styles.mini} ${styles.copy} ${copyAge === null ? styles.hidden : ''}`}>
              <div>next</div>
              <code>{`{ age: ${copyAge ?? 26} }`}</code>
            </div>
          </div>
          <pre className={styles.code}>{`const next = { ...user, age: 26 }`}</pre>
          <div className={styles.hint}>Новый объект → новая ссылка</div>
        </div>
      </div>

      <div className={styles.eq}>
        <code>prev === next</code>
        <span className={eq === null ? styles.muted : eq ? styles.bad : styles.good}>
          {eq === null ? '—' : eq ? 'true (опасно для UI)' : 'false (React увидит изменение)'}
        </span>
      </div>
    </div>
  )
}
