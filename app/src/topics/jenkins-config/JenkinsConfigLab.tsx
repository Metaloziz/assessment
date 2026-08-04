import { LabTabs } from '../../components/lab/LabTabs'
import {
  JenkinsCodePanel,
  JenkinsProblemPanel,
  JenkinsSandboxPanel,
  useLiveJenkinsLab,
} from './LiveJenkinsLab'
import styles from './JenkinsConfigLab.module.css'

export function JenkinsConfigLab() {
  const lab = useLiveJenkinsLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Свой Jenkinsfile без ручной выкладки</h2>
        <p className={styles.lead}>
          Симулятор Declarative Pipeline: stages, when на main, credentials и post — без Marathon.
        </p>
        <LabTabs
          problem={<JenkinsProblemPanel lab={lab} />}
          sandbox={<JenkinsSandboxPanel lab={lab} />}
          code={<JenkinsCodePanel />}
        />
      </section>
    </div>
  )
}
