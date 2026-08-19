import styles from './SentryFallback.module.css'

type Props = {
  onRetry: () => void
}

export function SentryFallback({ onRetry }: Props) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Что-то пошло не так</h1>
      <p className={styles.text}>Ошибка уже отправлена в мониторинг. Можно обновить страницу или повторить.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
        <button type="button" className={styles.btnSecondary} onClick={onRetry}>
          Повторить
        </button>
      </div>
    </div>
  )
}
