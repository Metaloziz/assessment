import { useCallback, useEffect, useRef, useState } from 'react'
import { buildLabStandUrl } from '../../lib/standUrl'
import type { LabTabId } from './LabTabs'
import styles from './LabStandLink.module.css'

type Props = {
  topicId: string
  labTab: LabTabId
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
      <p className={styles.label}>Стенд</p>
      <div className={styles.row}>
        <p className={styles.url}>
          <a className={styles.urlLink} href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </p>
        <button
          type="button"
          className={styles.copyBtn}
          data-copied={copied ? 'true' : 'false'}
          aria-label={copied ? 'Ссылка скопирована' : 'Скопировать ссылку на стенд'}
          title={copied ? 'Скопировано' : 'Скопировать'}
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <p className={styles.hint} aria-live="polite">
        {copied ? 'Скопировано' : '\u00a0'}
      </p>
    </footer>
  )
}
