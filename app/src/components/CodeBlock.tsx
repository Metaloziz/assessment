import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import styles from './CodeBlock.module.css'

type Props = {
  code: string
  language?: string
}

export function CodeBlock({ code, language = 'javascript' }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>{language}</div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '0.95rem 1.05rem 1.1rem',
          fontSize: '0.95rem',
          lineHeight: 1.6,
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
