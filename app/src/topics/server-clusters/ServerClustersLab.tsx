import { LabTabs } from '../../components/lab/LabTabs'
import {
  ClustersCodePanel,
  ClustersProblemPanel,
  ClustersSandboxPanel,
  useLiveServerClustersLab,
} from './LiveServerClustersLab'
import styles from './ServerClustersLab.module.css'

export function ServerClustersLab() {
  const lab = useLiveServerClustersLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Зачем менеджер кластера</h2>
        <p className={styles.lead}>
          Один сервер — единая точка отказа. Несколько узлов + менеджер держат desired replicas и
          сами чинят падения.
        </p>
        <LabTabs
          problem={<ClustersProblemPanel lab={lab} />}
          sandbox={<ClustersSandboxPanel lab={lab} />}
          code={<ClustersCodePanel />}
        />
      </section>
    </div>
  )
}
