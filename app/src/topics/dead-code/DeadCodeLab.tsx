import { LayerCompare } from './LayerCompare'
import styles from './DeadCodeLab.module.css'

export function DeadCodeLab() {
  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Исходники vs бандл</h2>
        <p className={styles.lead}>
          Один и тот же проект глазами <code>ts-prune</code> и Statoscope — метки used/unused
          могут не совпадать.
        </p>
        <LayerCompare />
      </section>
    </div>
  )
}
