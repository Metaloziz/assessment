import { useState } from 'react'
import styles from './LayerCompare.module.css'

type Layer = 'source' | 'bundle'

type Item = {
  id: string
  name: string
  /** unused for this layer? */
  unusedIn: Layer[]
  note: string
}

const ITEMS: Item[] = [
  {
    id: 'formatDate',
    name: 'utils/formatDate.ts',
    unusedIn: ['source', 'bundle'],
    note: 'Экспорт никто не импортирует → видят оба слоя',
  },
  {
    id: 'legacyApi',
    name: 'api/legacyClient.ts',
    unusedIn: ['source'],
    note: 'В исходниках orphan export, но всё ещё в бандле через старый entry',
  },
  {
    id: 'lodash',
    name: 'node_modules/lodash',
    unusedIn: [],
    note: 'Используется; Statoscope покажет размер и возможные дубликаты',
  },
  {
    id: 'settings',
    name: 'pages/Settings (lazy)',
    unusedIn: [],
    note: 'Динамический import — ts-prune может ошибиться, в бандле чанк живой',
  },
]

export function LayerCompare() {
  const [layer, setLayer] = useState<Layer>('source')

  return (
    <div className={styles.root}>
      <div className={styles.toggle} role="tablist" aria-label="Слой анализа">
        <button
          type="button"
          role="tab"
          aria-selected={layer === 'source'}
          className={`${styles.tab} ${layer === 'source' ? styles.active : ''}`}
          onClick={() => setLayer('source')}
        >
          ts-prune
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={layer === 'bundle'}
          className={`${styles.tab} ${layer === 'bundle' ? styles.active : ''}`}
          onClick={() => setLayer('bundle')}
        >
          Statoscope
        </button>
      </div>

      <p className={styles.hint}>
        {layer === 'source'
          ? 'Исходники: неиспользуемые экспорты TypeScript'
          : 'Бандл: модули и связи в webpack stats'}
      </p>

      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const dead = item.unusedIn.includes(layer)
          return (
            <li key={item.id} className={`${styles.row} ${dead ? styles.dead : styles.alive}`}>
              <span className={styles.mark} aria-hidden>
                {dead ? '○' : '●'}
              </span>
              <div className={styles.body}>
                <code className={styles.name}>{item.name}</code>
                <span className={styles.note}>{item.note}</span>
              </div>
              <span className={styles.badge}>{dead ? 'unused' : 'used'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
