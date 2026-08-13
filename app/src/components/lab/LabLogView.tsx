import type { LabLogLine } from './useLabLog'
import styles from './LabLogView.module.css'

type Props = {
  lines: LabLogLine[]
  emptyText?: string
}

export function LabLogView({ lines, emptyText = 'Лог пуст — нажмите действие.' }: Props) {
  if (lines.length === 0) {
    return <pre className={`${styles.log} ${styles.logEmpty}`}>{emptyText}</pre>
  }

  return (
    <pre className={styles.log}>
      {lines.map((line, i) => {
        const cls =
          line.kind === 'ok'
            ? styles.logOk
            : line.kind === 'err'
              ? styles.logErr
              : line.kind === 'warn'
                ? styles.logWarn
                : styles.logInfo
        return (
          <div key={`${i}-${line.text}`} className={cls}>
            {line.text}
          </div>
        )
      })}
    </pre>
  )
}
