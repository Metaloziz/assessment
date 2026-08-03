import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabTabs } from '../../components/lab/LabTabs'
import { WebApisProblemPanel, WebApisSandboxPanel, useWebApisLab } from './LiveWebApisLab'
import styles from './WebApisLab.module.css'

function WebApisCodePanel() {
  return (
    <LabCodePanel
      intro="Типичный паттерн: проверить поддержку → вызвать API по жесту пользователя → обработать отказ."
      snippets={[
        {
          label: 'Web Share + fallback',
          code: `if (navigator.share) {
  await navigator.share({ title: 'Meetup', url: location.href })
} else if (navigator.clipboard?.writeText) {
  await navigator.clipboard.writeText(location.href)
}`,
        },
        {
          label: 'Notification по жесту',
          code: `const permission = await Notification.requestPermission()
if (permission === 'granted') {
  new Notification('Meetup', { body: 'Напоминание через час' })
}`,
        },
      ]}
    />
  )
}

export function WebApisLab() {
  const lab = useWebApisLab()

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Карточка митапа: Share и напоминание</h2>
        <p className={styles.lead}>
          Feature-detect → нативный share или fallback; Notification по жесту. Push/Payment — в
          песочнице и в логе как отдельные контуры.
        </p>
        <LabTabs
          problem={<WebApisProblemPanel lab={lab} />}
          sandbox={<WebApisSandboxPanel lab={lab} />}
          code={<WebApisCodePanel />}
        />
      </section>
    </div>
  )
}
