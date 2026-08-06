import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './LabButton.module.css'

export type LabButtonVariant = 'primary' | 'secondary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LabButtonVariant
  /** Highlight for ghost toggles (snippet tabs, mode switches). */
  active?: boolean
  size?: 'md' | 'sm'
  children: ReactNode
}

export function LabButton({
  variant = 'secondary',
  active = false,
  size = 'md',
  className,
  type = 'button',
  children,
  ...rest
}: Props) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'sm' ? styles.sm : styles.md,
    active ? styles.active : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
