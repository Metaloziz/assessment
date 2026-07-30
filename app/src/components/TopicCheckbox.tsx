import type { KeyboardEvent, MouseEvent } from 'react'
import { useProgressHydrated } from '../hooks/useProgressHydrated'
import { useProgressStore } from '../store/progress'
import styles from './TopicCheckbox.module.css'

type Props = {
  topicId: string
  label?: string
  size?: 'sm' | 'md'
}

export function TopicCheckbox({ topicId, label, size = 'sm' }: Props) {
  const hydrated = useProgressHydrated()
  const completed = useProgressStore((s) => Boolean(s.completedIds[topicId]))
  const toggleCompleted = useProgressStore((s) => s.toggleCompleted)

  const onToggle = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleCompleted(topicId)
  }

  return (
    <button
      type="button"
      className={`${styles.root} ${styles[size]} ${hydrated && completed ? styles.checked : ''}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle(e)
      }}
      aria-pressed={hydrated && completed}
      aria-label={label ?? (completed ? 'Снять отметку пройдено' : 'Отметить пройденным')}
      title={completed ? 'Пройдено' : 'Отметить пройденным'}
      data-hydrated={hydrated ? 'true' : 'false'}
    >
      <span className={styles.box} aria-hidden>
        {hydrated && completed ? '✓' : ''}
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </button>
  )
}
