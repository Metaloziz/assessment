import type { TopicLevel } from '../content'
import { LEVEL_META } from '../content'
import styles from './LevelBadge.module.css'

type Props = {
  level: TopicLevel
  size?: 'sm' | 'md'
}

export function LevelBadge({ level, size = 'sm' }: Props) {
  const meta = LEVEL_META[level]
  return (
    <span
      className={`${styles.square} ${styles[level]} ${styles[size]}`}
      title={meta.label}
      aria-label={`Уровень ${meta.label}`}
    />
  )
}
