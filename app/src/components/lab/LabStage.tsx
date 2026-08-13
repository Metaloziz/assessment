import type { HTMLAttributes, ReactNode } from 'react'
import styles from './LabStage.module.css'

type Props = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
}

export function LabStage({ children, className, ...rest }: Props) {
  const classes = [styles.stage, className ?? ''].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
