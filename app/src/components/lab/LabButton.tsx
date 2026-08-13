import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './LabButton.module.css'

export type LabButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LabButtonVariant
  /** Highlight for ghost toggles (snippet tabs, mode switches). */
  active?: boolean
  size?: 'md' | 'sm'
  children: ReactNode
}

export const LabButton = forwardRef<HTMLButtonElement, Props>(function LabButton(
  {
    variant = 'secondary',
    active = false,
    size = 'md',
    className,
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
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
    <button ref={ref} type={type} className={classes} {...rest}>
      {children}
    </button>
  )
})
