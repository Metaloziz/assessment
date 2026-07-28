import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './MemoryCostSketch.module.css'

gsap.registerPlugin(useGSAP)

export function MemoryCostSketch() {
  const rootRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [versions, setVersions] = useState([{ id: 0, label: 'v0' }])

  const { contextSafe } = useGSAP({ scope: rootRef })

  const addVersion = contextSafe(() => {
    const nextId = versions.length
    setVersions((prev) => [...prev, { id: nextId, label: `v${nextId}` }])
    requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const nodes = railRef.current?.querySelectorAll('[data-block]')
      const last = nodes?.[nodes.length - 1]
      if (!last || reduced) return
      gsap.fromTo(
        last,
        { opacity: 0, y: 18, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' },
      )
    })
  })

  const reset = () => setVersions([{ id: 0, label: 'v0' }])

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" onClick={addVersion}>
          Immutable update
        </button>
        <button type="button" className="uiBtn uiBtnGhost" onClick={reset}>
          Сброс
        </button>
      </div>
      <div ref={railRef} className={styles.rail} aria-label="Версии объектов в памяти">
        {versions.map((v, idx) => (
          <div
            key={v.id}
            data-block
            className={`${styles.block} ${idx === versions.length - 1 ? styles.current : styles.old}`}
          >
            <span>{v.label}</span>
            <small>{idx === versions.length - 1 ? 'active' : 'retained?'}</small>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Каждый immutable update создаёт новую версию. Старые живут, пока на них есть ссылки — это цена
        предсказуемости.
      </p>
    </div>
  )
}
