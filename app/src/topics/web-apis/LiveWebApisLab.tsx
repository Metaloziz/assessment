import { useCallback, useEffect, useMemo, useState } from 'react'
import { LabButton } from '../../components/lab/LabButton'
import styles from './LiveWebApisLab.module.css'

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

type SupportMap = {
  share: boolean
  clipboard: boolean
  notification: boolean
  payment: boolean
  push: boolean
  credentials: boolean
  secure: boolean
}

const EVENT = {
  title: 'Frontend Meetup · Минск',
  text: 'Разбор Web APIs: Share, Push, Payment Request',
}

function eventUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}#/topics/67-web-apis`
}

function detectSupport(): SupportMap {
  return {
    share: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    clipboard:
      typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText),
    notification: typeof Notification !== 'undefined',
    payment: typeof PaymentRequest !== 'undefined',
    push:
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
    credentials: typeof navigator !== 'undefined' && 'credentials' in navigator,
    secure: typeof window !== 'undefined' && window.isSecureContext,
  }
}

export type WebApisLabApi = ReturnType<typeof useWebApisLab>

export function useWebApisLab() {
  const [support, setSupport] = useState<SupportMap>(() => detectSupport())
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'),
  )
  const [log, setLog] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)
  const [lastShare, setLastShare] = useState<'native' | 'clipboard' | 'manual' | ''>('')
  const [remindOn, setRemindOn] = useState(false)

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-12), line])
  }, [])

  const refresh = useCallback(() => {
    setSupport(detectSupport())
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const sharePayload = useMemo(
    () => ({
      title: EVENT.title,
      text: EVENT.text,
      url: eventUrl(),
    }),
    [],
  )

  const shareNativeOrFallback = async () => {
    setBusy(true)
    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
        setLastShare('native')
        pushLog({ kind: 'ok', text: 'navigator.share() — системный sheet' })
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${sharePayload.title}\n${sharePayload.url}`)
        setLastShare('clipboard')
        pushLog({ kind: 'info', text: 'Share нет → clipboard.writeText (fallback)' })
        return
      }
      setLastShare('manual')
      pushLog({
        kind: 'err',
        text: 'Нет Share и Clipboard — покажи свои кнопки / скопируй URL вручную',
      })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'Error'
      if (name === 'AbortError') {
        pushLog({ kind: 'info', text: 'Share отменён пользователем' })
      } else {
        pushLog({
          kind: 'err',
          text: err instanceof Error ? err.message : 'Share failed',
        })
      }
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const copyOnly = async () => {
    setBusy(true)
    try {
      await navigator.clipboard.writeText(sharePayload.url)
      setLastShare('clipboard')
      pushLog({ kind: 'ok', text: 'URL скопирован в буфер' })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Clipboard failed',
      })
    } finally {
      setBusy(false)
    }
  }

  const requestNotifyPermission = async () => {
    setBusy(true)
    try {
      if (typeof Notification === 'undefined') {
        pushLog({ kind: 'err', text: 'Notification API недоступен' })
        return
      }
      if (!window.isSecureContext) {
        pushLog({ kind: 'err', text: 'Notifications нужен secure context (HTTPS / localhost)' })
        return
      }
      const result = await Notification.requestPermission()
      setPermission(result)
      pushLog({
        kind: result === 'granted' ? 'ok' : 'info',
        text: `Notification.permission → ${result}`,
      })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'requestPermission failed',
      })
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const showLocalNotification = async () => {
    setBusy(true)
    try {
      if (typeof Notification === 'undefined') {
        pushLog({ kind: 'err', text: 'Notification API недоступен' })
        return
      }
      if (Notification.permission !== 'granted') {
        pushLog({ kind: 'err', text: 'Сначала permission = granted (по жесту пользователя)' })
        return
      }
      const n = new Notification(EVENT.title, {
        body: 'Напоминание через 1 час · это Notifications API (не Push с сервера)',
        tag: 'assessment-web-apis-lab',
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
      setRemindOn(true)
      pushLog({
        kind: 'ok',
        text: 'show Notification — локально. Push с сервера = SW + PushManager + бэкенд',
      })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Notification failed',
      })
    } finally {
      setBusy(false)
    }
  }

  const tryPaymentRequest = async () => {
    setBusy(true)
    try {
      if (typeof PaymentRequest === 'undefined') {
        pushLog({ kind: 'err', text: 'PaymentRequest не поддерживается — нужен fallback UI' })
        return
      }
      const request = new PaymentRequest(
        [{ supportedMethods: 'https://example.com/pay' }],
        {
          total: {
            label: 'Билет Meetup',
            amount: { currency: 'BYN', value: '25.00' },
          },
        },
      )
      const can = await request.canMakePayment().catch(() => false)
      pushLog({
        kind: 'info',
        text: `canMakePayment() → ${can} (без реального метода оплаты UI не откроется)`,
      })
      if (!can) {
        pushLog({
          kind: 'info',
          text: 'Payment Request ≠ эквайринг: это UX-оболочка, биллинг на сервере',
        })
        return
      }
      const response = await request.show()
      await response.complete('success')
      pushLog({ kind: 'ok', text: 'PaymentRequest.show() завершён' })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'Error'
      if (name === 'NotSupportedError' || name === 'AbortError') {
        pushLog({ kind: 'info', text: `${name}: ожидаемо без настроенного payment method` })
      } else {
        pushLog({
          kind: 'err',
          text: err instanceof Error ? err.message : 'PaymentRequest failed',
        })
      }
    } finally {
      setBusy(false)
      refresh()
    }
  }

  return {
    support,
    permission,
    log,
    busy,
    lastShare,
    remindOn,
    sharePayload,
    refresh,
    shareNativeOrFallback,
    copyOnly,
    requestNotifyPermission,
    showLocalNotification,
    tryPaymentRequest,
  }
}

function SupportRow({ support }: { support: SupportMap }) {
  const items: { key: keyof SupportMap; label: string }[] = [
    { key: 'secure', label: 'secure' },
    { key: 'share', label: 'share' },
    { key: 'clipboard', label: 'clipboard' },
    { key: 'notification', label: 'notification' },
    { key: 'push', label: 'push mgr' },
    { key: 'payment', label: 'payment' },
    { key: 'credentials', label: 'webauthn' },
  ]

  return (
    <div className={styles.support} aria-label="Поддержка API">
      {items.map(({ key, label }) => (
        <span key={key} className={support[key] ? styles.badgeOn : styles.badgeOff}>
          {label}
        </span>
      ))}
    </div>
  )
}

function LabLog({ log }: { log: LogLine[] }) {
  return (
    <pre className={styles.log} aria-live="polite">
      {log.length === 0 ? 'лог пуст' : null}
      {log.map((line, i) => (
        <span key={`${i}-${line.text}`} className={styles[line.kind]}>
          {line.text}
          {'\n'}
        </span>
      ))}
    </pre>
  )
}

function EventCard({
  lastShare,
  remindOn,
}: {
  lastShare: string
  remindOn: boolean
}) {
  return (
    <div className={styles.card} aria-live="polite">
      <div className={styles.cardKicker}>Митап</div>
      <p className={styles.cardTitle}>{EVENT.title}</p>
      <p className={styles.cardText}>{EVENT.text}</p>
      <div className={styles.cardMeta}>
        {lastShare ? (
          <span className={styles.via}>share · {lastShare}</span>
        ) : (
          <span className={styles.muted}>ещё не делились</span>
        )}
        {remindOn ? <span className={styles.via}>remind · local</span> : null}
      </div>
    </div>
  )
}

export function WebApisProblemPanel({ lab }: { lab: WebApisLabApi }) {
  const {
    support,
    permission,
    log,
    busy,
    lastShare,
    remindOn,
    shareNativeOrFallback,
    requestNotifyPermission,
    showLocalNotification,
  } = lab

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          На карточке события кнопки «Поделиться» и «Напомнить» без проверки поддержки: на десктопе
          Share падает, permission всплывает без жеста, Push путают с локальным Notification.
        </p>
        <div className={styles.problemLabel}>Решение через Web APIs</div>
        <p>
          Feature-detect → <code>navigator.share</code> или clipboard-fallback; уведомление только
          после жеста и <code>requestPermission</code>. Push «с сервера» — отдельный контур (SW +
          подписка).
        </p>
      </div>

      <SupportRow support={support} />
      <EventCard lastShare={lastShare} remindOn={remindOn} />

      <div className={styles.actions}>
        <LabButton variant="primary" disabled={busy} onClick={() => void shareNativeOrFallback()}>
          Поделиться
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy || permission === 'granted' || permission === 'unsupported'}
          onClick={() => void requestNotifyPermission()}
        >
          Разрешить уведомления
        </LabButton>
        <LabButton
          variant="primary"
          disabled={busy || permission !== 'granted'}
          onClick={() => void showLocalNotification()}
        >
          Напомнить
        </LabButton>
      </div>

      <p className={styles.tip}>
        1) Поделись — на телефоне часто native sheet, на десктопе чаще clipboard. 2) Разреши
        уведомления по клику. 3) «Напомнить» покажет локальный Notification (это ещё не Push).
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function WebApisSandboxPanel({ lab }: { lab: WebApisLabApi }) {
  const {
    support,
    permission,
    log,
    busy,
    lastShare,
    remindOn,
    sharePayload,
    refresh,
    shareNativeOrFallback,
    copyOnly,
    requestNotifyPermission,
    showLocalNotification,
    tryPaymentRequest,
  } = lab

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Крути API по отдельности. Смотри permission в адресной строке и Application →
        Notifications. Payment Request без payment method обычно даст NotSupported — это норма для
        демо.
      </p>

      <SupportRow support={support} />
      <EventCard lastShare={lastShare} remindOn={remindOn} />

      <p className={styles.metaLine}>
        permission: <code>{permission}</code>
        {' · '}
        payload url: <code className={styles.url}>{sharePayload.url}</code>
      </p>

      <div className={styles.actions}>
        <LabButton variant="secondary" disabled={busy} onClick={refresh}>
          Refresh detect
        </LabButton>
        <LabButton variant="primary" disabled={busy} onClick={() => void shareNativeOrFallback()}>
          Share / fallback
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy || !support.clipboard}
          onClick={() => void copyOnly()}
        >
          Clipboard only
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy || !support.notification}
          onClick={() => void requestNotifyPermission()}
        >
          requestPermission
        </LabButton>
        <LabButton
          variant="primary"
          disabled={busy || permission !== 'granted'}
          onClick={() => void showLocalNotification()}
        >
          new Notification
        </LabButton>
        <LabButton
          variant="secondary"
          disabled={busy || !support.payment}
          onClick={() => void tryPaymentRequest()}
        >
          PaymentRequest
        </LabButton>
      </div>

      <LabLog log={log} />
    </div>
  )
}
