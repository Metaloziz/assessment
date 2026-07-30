import { useMemo, useState } from 'react'
import styles from './CookieFlags.module.css'

type SameSite = 'Strict' | 'Lax' | 'None'

export function CookieFlags() {
  const [httpOnly, setHttpOnly] = useState(true)
  const [secure, setSecure] = useState(true)
  const [sameSite, setSameSite] = useState<SameSite>('Lax')
  const [maxAge, setMaxAge] = useState(true)

  const header = useMemo(() => {
    const parts = ['sessionId=abc123', 'Path=/']
    if (maxAge) parts.push('Max-Age=86400')
    if (httpOnly) parts.push('HttpOnly')
    if (secure || sameSite === 'None') parts.push('Secure')
    parts.push(`SameSite=${sameSite}`)
    return `Set-Cookie: ${parts.join('; ')}`
  }, [httpOnly, secure, sameSite, maxAge])

  const jsReadable = !httpOnly
  const needsSecureFix = sameSite === 'None' && !secure

  return (
    <div className={styles.root}>
      <div className={styles.flags}>
        <label className={styles.flag}>
          <input type="checkbox" checked={httpOnly} onChange={(e) => setHttpOnly(e.target.checked)} />
          HttpOnly
        </label>
        <label className={styles.flag}>
          <input
            type="checkbox"
            checked={secure || sameSite === 'None'}
            disabled={sameSite === 'None'}
            onChange={(e) => setSecure(e.target.checked)}
          />
          Secure
        </label>
        <label className={styles.flag}>
          <input type="checkbox" checked={maxAge} onChange={(e) => setMaxAge(e.target.checked)} />
          Max-Age
        </label>
      </div>

      <div className={styles.sameSite} role="group" aria-label="SameSite">
        {(['Strict', 'Lax', 'None'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.chip} ${sameSite === value ? styles.chipActive : ''}`}
            onClick={() => {
              setSameSite(value)
              if (value === 'None') setSecure(true)
            }}
          >
            SameSite={value}
          </button>
        ))}
      </div>

      <pre className={styles.header}>{header}</pre>

      <ul className={styles.effects}>
        <li className={jsReadable ? styles.warn : styles.ok}>
          {jsReadable
            ? 'document.cookie может прочитать значение — XSS опаснее'
            : 'JS не видит cookie (HttpOnly) — лучше для session token'}
        </li>
        <li className={secure || sameSite === 'None' ? styles.ok : styles.warn}>
          {secure || sameSite === 'None'
            ? 'Уходит только по HTTPS (Secure)'
            : 'Может уйти по HTTP — на проде обычно плохо'}
        </li>
        <li className={styles.info}>
          {sameSite === 'Strict' && 'Почти не едет в cross-site сценариях'}
          {sameSite === 'Lax' && 'Едет при обычном переходе по ссылке (top-level GET)'}
          {sameSite === 'None' && 'Разрешает cross-site; обязательно Secure'}
        </li>
        {needsSecureFix ? (
          <li className={styles.warn}>SameSite=None без Secure браузеры отклонят</li>
        ) : null}
      </ul>
    </div>
  )
}
