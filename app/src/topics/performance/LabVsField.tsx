import { useState } from 'react'
import styles from './LabVsField.module.css'

const LAB = [
  'Lighthouse, DevTools Performance',
  'Контролируемая среда (CPU/сеть throttle)',
  'Хорошо для регрессий в CI',
  'Не отражает всех пользователей',
]

const FIELD = [
  'CrUX, RUM, web-vitals в проде',
  'Реальные устройства и сети',
  'Core Web Vitals для Search',
  'Шумнее, нужна выборка',
]

export function LabVsField() {
  const [side, setSide] = useState<'lab' | 'field'>('lab')
  const items = side === 'lab' ? LAB : FIELD

  return (
    <div className={styles.root}>
      <div className={styles.toggle} role="tablist" aria-label="Lab или Field">
        <button
          type="button"
          role="tab"
          aria-selected={side === 'lab'}
          className={`${styles.tab} ${side === 'lab' ? styles.active : ''}`}
          onClick={() => setSide('lab')}
        >
          Lab
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === 'field'}
          className={`${styles.tab} ${side === 'field' ? styles.active : ''}`}
          onClick={() => setSide('field')}
        >
          Field
        </button>
      </div>
      <ul className={styles.list}>
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <p className={styles.footer}>
        На собеседовании: «Lighthouse — lab; CrUX/RUM — field. Оптимизируем по field, отлаживаем в
        lab.»
      </p>
    </div>
  )
}
