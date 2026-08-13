import type { ReactNode } from 'react'
import styles from './LabBadge.module.css'

type Tone = 'default' | 'ok' | 'err' | 'warn' | 'info'

type Props = {
  children: ReactNode
  tone?: Tone
  className?: string
}

export function LabBadge({ children, tone = 'default', className }: Props) {
  const classes = [styles.badge, tone !== 'default' ? styles[tone] : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{children}</span>
}
