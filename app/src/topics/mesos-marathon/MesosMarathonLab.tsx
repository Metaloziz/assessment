import { LabTabs } from '../../components/lab/LabTabs'
import {
  MesosCodePanel,
  MesosProblemPanel,
  MesosSandboxPanel,
  useLiveMesosLab,
} from './LiveMesosLab'
import styles from './MesosMarathonLab.module.css'

export function MesosMarathonLab() {
  const lab = useLiveMesosLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Кластер, который сам поднимает сервис</h2>
        <p className={styles.lead}>
          Симулятор Mesos/Marathon: desired state, resource offers и перезапуск задач после падения
          агента.
        </p>
        <LabTabs
          problem={<MesosProblemPanel lab={lab} />}
          sandbox={<MesosSandboxPanel lab={lab} />}
          code={<MesosCodePanel />}
        />
      </section>
    </div>
  )
}
