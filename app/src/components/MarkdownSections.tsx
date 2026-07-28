import type { ReactNode } from 'react'
import { CodeBlock } from './CodeBlock'
import styles from './MarkdownSections.module.css'

type Props = {
  markdown: string
}

function renderInline(text: string) {
  const parts: Array<string | { type: 'code' | 'bold' | 'link'; text: string; href?: string }> = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push({ type: 'bold', text: token.slice(2, -2) })
    } else if (token.startsWith('`')) {
      parts.push({ type: 'code', text: token.slice(1, -1) })
    } else {
      const link = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (link) parts.push({ type: 'link', text: link[1], href: link[2] })
    }
    last = match.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))

  return parts.map((part, i) => {
    if (typeof part === 'string') return <span key={i}>{part}</span>
    if (part.type === 'bold') return <strong key={i}>{part.text}</strong>
    if (part.type === 'code') return <code key={i}>{part.text}</code>
    return (
      <a key={i} href={part.href} target="_blank" rel="noreferrer">
        {part.text}
      </a>
    )
  })
}

export function MarkdownSections({ markdown }: Props) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let listBuffer: string[] = []

  const flushList = () => {
    if (!listBuffer.length) return
    nodes.push(
      <ul key={`ul-${nodes.length}`} className={styles.list}>
        {listBuffer.map((item, idx) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    listBuffer = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushList()
      const language = trimmed.slice(3).trim() || 'text'
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      nodes.push(<CodeBlock key={`code-${nodes.length}`} language={language} code={codeLines.join('\n')} />)
      i += 1
      continue
    }

    if (trimmed === '---' || trimmed === '') {
      flushList()
      i += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      flushList()
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      nodes.push(
        <blockquote key={`q-${nodes.length}`} className={styles.quote}>
          {quoteLines.map((q, idx) => (
            <p key={idx}>{renderInline(q)}</p>
          ))}
        </blockquote>,
      )
      continue
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.*)$/)
    if (heading) {
      flushList()
      const level = heading[1].length
      const Tag = (level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4'
      nodes.push(
        <Tag key={`h-${nodes.length}`} className={styles.heading}>
          {renderInline(heading[2])}
        </Tag>,
      )
      i += 1
      continue
    }

    const listItem = trimmed.match(/^[-*]\s+(.*)$/) || trimmed.match(/^\d+\.\s+(.*)$/)
    if (listItem) {
      listBuffer.push(listItem[1])
      i += 1
      continue
    }

    if (trimmed.startsWith('|')) {
      flushList()
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i += 1
      }
      const rows = tableLines
        .filter((r) => !/^\|\s*-+/.test(r))
        .map((r) =>
          r
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim()),
        )
      if (rows.length) {
        const [head, ...body] = rows
        nodes.push(
          <div key={`table-${nodes.length}`} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {head.map((cell, idx) => (
                    <th key={idx}>{renderInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    flushList()
    nodes.push(
      <p key={`p-${nodes.length}`} className={styles.paragraph}>
        {renderInline(trimmed)}
      </p>,
    )
    i += 1
  }

  flushList()
  return <div className={styles.root}>{nodes}</div>
}
