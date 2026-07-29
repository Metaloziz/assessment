import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { cursorCodeTheme } from './cursorCodeTheme'
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
        style={cursorCodeTheme}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '0.85rem 1rem 1rem',
          fontSize: '0.9rem',
          lineHeight: 1.55,
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono)',
            background: 'transparent',
            textShadow: 'none',
          },
        }}
      >
        {code.trimEnd()}
      </SyntaxHighlighter>
    </div>
  )
}
