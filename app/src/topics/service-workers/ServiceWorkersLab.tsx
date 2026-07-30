import { LabTabs } from '../../components/lab/LabTabs'
import { SwProblemPanel, SwSandboxPanel, useLiveSwLab } from './LiveSwLab'
import styles from './ServiceWorkersLab.module.css'

export function ServiceWorkersLab() {
  const lab = useLiveSwLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Погода без пустого офлайна</h2>
        <p className={styles.lead}>
          SW кэширует прогноз Open-Meteo (Минск): снимок сразу, обновление в фоне, переживание
          offline.
        </p>
        <LabTabs problem={<SwProblemPanel lab={lab} />} sandbox={<SwSandboxPanel lab={lab} />} />
      </section>
    </div>
  )
}
