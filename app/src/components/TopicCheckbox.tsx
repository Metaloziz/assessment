import type { KeyboardEvent, MouseEvent } from 'react'
import styles from './TopicCheckbox.module.css'
import { useProgressStore } from '../store/progress'

type Props = {
  topicId: string
  label?: string
  size?: 'sm' | 'md'
}

export function TopicCheckbox({ topicId, label, size = 'sm' }: Props) {
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
      className={`${styles.root} ${styles[size]} ${completed ? styles.checked : ''}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle(e)
      }}
      aria-pressed={completed}
      aria-label={label ?? (completed ? 'Снять отметку пройдено' : 'Отметить пройденным')}
      title={completed ? 'Пройдено' : 'Отметить пройденным'}
    >
      <span className={styles.box} aria-hidden>
        {completed ? '✓' : ''}
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </button>
  )
}
