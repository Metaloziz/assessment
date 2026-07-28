import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import styles from './ProsConsDeck.module.css'

gsap.registerPlugin(useGSAP)

const PROS = [
  'Предсказуемость и отсутствие побочных эффектов',
  'Сравнение по ссылке для React / memo',
  'История изменений и time-travel',
  'Проще reasoning в больших приложениях',
]

const CONS = [
  'Дополнительная память на новые структуры',
  'Громоздкие nested updates без Immer',
  'Shallow copy не защищает вложенность',
  'Не нужно для локальных temporary значений',
]

export function ProsConsDeck() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<string | null>(null)

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      gsap.from('.deckCard', {
        opacity: 0,
        y: 16,
        stagger: 0.06,
        duration: 0.4,
        ease: 'power2.out',
      })
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className={styles.root}>
      <div className={styles.column}>
        <h3 className={styles.heading}>Плюсы</h3>
        {PROS.map((text, i) => {
          const id = `pro-${i}`
          const isOpen = open === id
          return (
            <button
              key={id}
              type="button"
              className={`deckCard ${styles.card} ${styles.pro} ${isOpen ? styles.open : ''}`}
              onClick={() => setOpen(isOpen ? null : id)}
            >
              <span className={styles.index}>0{i + 1}</span>
              <span className={styles.text}>{text}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.column}>
        <h3 className={styles.heading}>Минусы</h3>
        {CONS.map((text, i) => {
          const id = `con-${i}`
          const isOpen = open === id
          return (
            <button
              key={id}
              type="button"
              className={`deckCard ${styles.card} ${styles.con} ${isOpen ? styles.open : ''}`}
              onClick={() => setOpen(isOpen ? null : id)}
            >
              <span className={styles.index}>0{i + 1}</span>
              <span className={styles.text}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
