import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import styles from './LabViz.module.css'

type LabVizPanelProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
  compact?: boolean
}

export const LabVizPanel = forwardRef<HTMLDivElement, LabVizPanelProps>(function LabVizPanel(
  { title, meta, children, className, compact = false, ...rest },
  ref,
) {
  const classes = [styles.viz, compact ? styles.vizCompact : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={classes} {...rest}>
      <div className={styles.vizHead}>
        <p className={styles.vizTitle}>{title}</p>
        {meta != null && meta !== false ? <p className={styles.vizMeta}>{meta}</p> : null}
      </div>
      {children}
    </div>
  )
})

export type LabNodeState = 'idle' | 'active' | 'ok' | 'err'

type LabNodeProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  sub?: ReactNode
  state?: LabNodeState
}

export const LabNode = forwardRef<HTMLDivElement, LabNodeProps>(function LabNode(
  { label, sub, state = 'idle', className, ...rest },
  ref,
) {
  const stateClass =
    state === 'active'
      ? styles.nodeActive
      : state === 'ok'
        ? styles.nodeOk
        : state === 'err'
          ? styles.nodeErr
          : ''
  const classes = [styles.node, stateClass, className ?? ''].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={classes} {...rest}>
      <span className={styles.nodeLabel}>{label}</span>
      {sub != null ? <span className={styles.nodeSub}>{sub}</span> : null}
    </div>
  )
})

/** CSS module for composing node/viz classes when LabNode markup is too rigid (GSAP, custom innards). */
export { styles as labVizStyles }
