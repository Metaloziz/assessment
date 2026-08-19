import { useCallback, useEffect, useRef, useState } from 'react'
import { buildLabStandUrl } from '../../lib/standUrl'
import type { LabTabId } from './LabTabs'
import styles from './LabStandLink.module.css'

type Props = {
  topicId: string
  labTab: LabTabId
}

function LinkIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </svg>
  )
}

export function LabStandLink({ topicId, labTab }: Props) {
  const url = buildLabStandUrl(topicId, labTab)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }, [url])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <footer className={styles.root}>
      <a
        className={styles.iconBtn}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Открыть стенд в новой вкладке"
        title={url}
      >
        <LinkIcon />
      </a>
      <button
        type="button"
        className={styles.iconBtn}
        data-copied={copied ? 'true' : 'false'}
        aria-label={copied ? 'Ссылка скопирована' : 'Скопировать ссылку на стенд'}
        title={copied ? 'Скопировано' : 'Скопировать'}
        onClick={() => void copy()}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </footer>
  )
}
