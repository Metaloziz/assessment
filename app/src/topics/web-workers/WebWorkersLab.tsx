import { LabTabs } from '../../components/lab/LabTabs'
import {
  WebWorkersCodePanel,
  WebWorkersProblemPanel,
  WebWorkersSandboxPanel,
  useWebWorkersLab,
} from './LiveWebWorkersLab'
import styles from './WebWorkersLab.module.css'

export function WebWorkersLab() {
  const lab = useWebWorkersLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Расчёт без зависания страницы</h2>
        <p className={styles.lead}>
          Тяжёлая сумма простых чисел: на странице UI мёрзнет, в Worker — остаётся живым.
        </p>
        <LabTabs
          problem={<WebWorkersProblemPanel lab={lab} />}
          sandbox={<WebWorkersSandboxPanel lab={lab} />}
          code={<WebWorkersCodePanel />}
        />
      </section>
    </div>
  )
}
