import { LabTabs } from '../../components/lab/LabTabs'
import {
  IndexedDbCodePanel,
  IndexedDbProblemPanel,
  IndexedDbSandboxPanel,
  useIndexedDbLab,
} from './LiveIndexedDbLab'
import styles from './IndexedDbLab.module.css'

export function IndexedDbLab() {
  const lab = useIndexedDbLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Черновик, который не пропадает</h2>
        <p className={styles.lead}>
          Сохраняем заметку в браузере и читаем её после обновления страницы.
        </p>
        <LabTabs
          problem={<IndexedDbProblemPanel lab={lab} />}
          sandbox={<IndexedDbSandboxPanel lab={lab} />}
          code={<IndexedDbCodePanel />}
        />
      </section>
    </div>
  )
}
