import { CookieFlags } from './CookieFlags'
import styles from './CookiesLab.module.css'

export function CookiesLab() {
  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.title}>Атрибуты Set-Cookie</h2>
        <p className={styles.lead}>
          Включайте флаги и смотрите заголовок и последствия для JS / HTTPS / cross-site.
        </p>
        <CookieFlags />
      </section>
    </div>
  )
}
