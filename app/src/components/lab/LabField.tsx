import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import styles from './LabField.module.css'

type LabFieldProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  /** Horizontal label+control (legacy checkbox rows). */
  inline?: boolean
}

export function LabField({ label, children, className, inline = false }: LabFieldProps) {
  const classes = [styles.field, inline ? styles.inline : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <label className={classes}>
      <span>{label}</span>
      {children}
    </label>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement>
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function LabInput(props: InputProps) {
  return <input className={styles.control} {...props} />
}

export function LabSelect(props: SelectProps) {
  return <select className={styles.control} {...props} />
}

export function LabTextarea(props: TextareaProps) {
  return <textarea className={styles.control} {...props} />
}
