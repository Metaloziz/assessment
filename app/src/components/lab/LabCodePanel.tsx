import { CodeBlock } from '../CodeBlock'
import styles from './LabCodePanel.module.css'

export type LabCodeSnippet = {
  label: string
  code: string
  language?: string
  note?: string
}

type Props = {
  intro?: string
  snippets: LabCodeSnippet[]
}

/** Общая вёрстка вкладки «Код» в лабораториях. */
export function LabCodePanel({ intro, snippets }: Props) {
  return (
    <div className={styles.root}>
      {intro ? <p className={styles.intro}>{intro}</p> : null}
      {snippets.map((snippet) => (
        <div key={snippet.label} className={styles.block}>
          <p className={styles.label}>{snippet.label}</p>
          {snippet.note ? <p className={styles.note}>{snippet.note}</p> : null}
          <CodeBlock code={snippet.code} language={snippet.language ?? 'javascript'} />
        </div>
      ))}
    </div>
  )
}
