import { useCallback, useEffect, useState } from 'react'
import styles from './LiveSwLab.module.css'

type WeatherPayload = {
  error?: string
  current?: {
    time?: string
    temperature_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
  current_units?: {
    temperature_2m?: string
    wind_speed_10m?: string
  }
}

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

/** Минск · Open-Meteo (без API-ключа). URL должен совпадать с sw-lab.js */
export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=53.9006&longitude=27.559&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FMinsk'

const CACHE_NAME = 'assessment-sw-lab-v3'

function swUrl() {
  return `${import.meta.env.BASE_URL}sw-lab.js`
}

function weatherLabel(code: number | undefined): string {
  if (code === undefined) return 'неизвестно'
  if (code === 0) return 'ясно'
  if (code <= 3) return 'переменная облачность'
  if (code <= 48) return 'туман'
  if (code <= 57) return 'морось'
  if (code <= 67) return 'дождь'
  if (code <= 77) return 'снег'
  if (code <= 82) return 'ливень'
  if (code <= 86) return 'снегопад'
  if (code <= 99) return 'гроза'
  return `код ${code}`
}

function formatTime(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type LiveSwLabApi = ReturnType<typeof useLiveSwLab>

export function useLiveSwLab() {
  const [supported] = useState(() => 'serviceWorker' in navigator)
  const [active, setActive] = useState(false)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [via, setVia] = useState('')
  const [raw, setRaw] = useState('')

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-10), line])
  }, [])

  const refreshActive = useCallback(async () => {
    if (!supported) return
    try {
      const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
      const controlling = Boolean(navigator.serviceWorker.controller)
      setActive(Boolean(reg?.active) && controlling)
    } catch {
      setActive(false)
    }
  }, [supported])

  useEffect(() => {
    void refreshActive()
    if (!supported) return
    const onChange = () => void refreshActive()
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [supported, refreshActive])

  const postToSw = async (message: object) => {
    const controller = navigator.serviceWorker.controller
    if (!controller) return
    controller.postMessage(message)
  }

  const register = async () => {
    if (!supported) return
    if (!window.isSecureContext) {
      pushLog({
        kind: 'err',
        text: 'SW нужен secure context (localhost / HTTPS)',
      })
      return
    }

    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register(swUrl(), {
        scope: import.meta.env.BASE_URL,
      })

      // ready может висеть вечно, если worker не активировался — не блокируем UI
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 4000)
        }),
      ])

      if (!ready) {
        pushLog({
          kind: 'err',
          text: 'SW не активировался за 4с — проверь Application → Service Workers',
        })
        await refreshActive()
        return
      }

      if (!navigator.serviceWorker.controller) {
        pushLog({
          kind: 'info',
          text: 'SW установлен — перезагрузка, чтобы страница стала controlled…',
        })
        window.setTimeout(() => {
          window.location.reload()
        }, 250)
        return
      }

      pushLog({ kind: 'ok', text: `SW готов · scope ${reg.scope}` })
      await refreshActive()
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Ошибка register()',
      })
    } finally {
      setBusy(false)
    }
  }

  const unregister = async () => {
    setBusy(true)
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      await caches.delete(CACHE_NAME)
      setActive(false)
      setOffline(false)
      setWeather(null)
      setVia('')
      setRaw('')
      pushLog({ kind: 'info', text: 'SW снят, кэш погоды очищен' })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Ошибка unregister()',
      })
    } finally {
      setBusy(false)
    }
  }

  const clearCache = async () => {
    setBusy(true)
    try {
      if (navigator.serviceWorker.controller) {
        await postToSw({ type: 'CLEAR_CACHE' })
      }
      await caches.delete(CACHE_NAME)
      setVia('')
      pushLog({ kind: 'info', text: `Кэш ${CACHE_NAME} очищен` })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Не удалось очистить кэш',
      })
    } finally {
      setBusy(false)
    }
  }

  const toggleOffline = async () => {
    const next = !offline
    setOffline(next)
    await postToSw({ type: 'SET_OFFLINE', value: next })
    pushLog({
      kind: 'info',
      text: next ? 'Симуляция offline: SW не ходит в сеть' : 'Сеть снова «доступна» для SW',
    })
  }

  const loadWeather = async () => {
    setBusy(true)
    const t0 = performance.now()
    try {
      const swOn = Boolean(navigator.serviceWorker.controller)
      if (swOn) {
        await postToSw({ type: 'SET_OFFLINE', value: offline })
      }

      const res = await fetch(WEATHER_URL)
      const ms = Math.round(performance.now() - t0)
      const source = res.headers.get('X-SW-Lab') ?? (swOn ? 'sw-no-header' : 'без SW · сеть')
      const text = await res.text()
      let data: WeatherPayload
      try {
        data = JSON.parse(text) as WeatherPayload
      } catch {
        data = { error: 'Ответ не JSON' }
      }
      setWeather(data)
      setVia(source)
      setRaw(text)
      pushLog({
        kind: res.ok ? 'ok' : 'err',
        text: `${source} · ${ms} ms · HTTP ${res.status}`,
      })
      if (swOn && source === 'cache-hit') {
        pushLog({
          kind: 'info',
          text: 'В Network может быть ещё запрос к API — это фон (SWR)',
        })
      }
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Fetch failed',
      })
    } finally {
      setBusy(false)
    }
  }

  return {
    supported,
    active,
    offline,
    busy,
    log,
    weather,
    via,
    raw,
    register,
    unregister,
    clearCache,
    toggleOffline,
    loadWeather,
  }
}

function StatusBadges({ active, via }: { active: boolean; via: string }) {
  return (
    <div className={styles.statusRow}>
      <span className={active ? styles.on : styles.off}>{active ? 'SW on' : 'SW off'}</span>
      {via ? <span className={styles.via}>{via}</span> : null}
    </div>
  )
}

function WeatherWidget({ weather }: { weather: WeatherPayload | null }) {
  const current = weather?.current
  const units = weather?.current_units
  const temp = current?.temperature_2m
  const wind = current?.wind_speed_10m

  return (
    <div className={styles.widget} aria-live="polite">
      <div className={styles.widgetTitle}>Погода · Минск</div>
      {!weather ? (
        <p className={styles.widgetEmpty}>Ещё не загружали</p>
      ) : weather.error ? (
        <p className={styles.widgetError}>{weather.error}</p>
      ) : (
        <>
          <p className={styles.widgetText}>
            {temp != null ? `${Math.round(temp)}${units?.temperature_2m ?? '°C'}` : '—'}
            <span className={styles.widgetMeta}> · {weatherLabel(current?.weather_code)}</span>
          </p>
          <div className={styles.widgetRow}>
            <span className={styles.badgeTodo}>
              ветер {wind != null ? `${Math.round(wind)} ${units?.wind_speed_10m ?? 'km/h'}` : '—'}
            </span>
            {current?.time ? <span className={styles.badgeDone}>{formatTime(current.time)}</span> : null}
          </div>
        </>
      )}
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

export function SwProblemPanel({ lab }: { lab: LiveSwLabApi }) {
  const {
    supported,
    active,
    offline,
    busy,
    log,
    weather,
    via,
    register,
    unregister,
    toggleOffline,
    loadWeather,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Service Worker в этом браузере недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Виджет погоды каждый раз ждёт API. Без сети — пустой экран; при повторном открытии —
          снова спиннер, хотя снимок уже был.
        </p>
        <div className={styles.problemLabel}>Решение через SW</div>
        <p>
          Перехват прогноза Open-Meteo: отдать кэш сразу, сеть обновить в фоне (SWR); при offline —
          последний снимок, а не ошибка.
        </p>
      </div>

      <StatusBadges active={active} via={via} />

      <div className={styles.actions}>
        {!active ? (
          <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void register()}>
            Включить SW
          </button>
        ) : (
          <button type="button" className="uiBtn uiBtnGhost" disabled={busy} onClick={() => void unregister()}>
            Выключить SW
          </button>
        )}
        <button
          type="button"
          className={`uiBtn ${offline ? 'uiBtnDanger' : 'uiBtnGhost'}`}
          disabled={busy || !active}
          onClick={() => void toggleOffline()}
        >
          {offline ? 'Offline ON' : 'Симулировать offline'}
        </button>
      </div>

      <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void loadWeather()}>
        Загрузить погоду
      </button>

      <WeatherWidget weather={weather} />

      <p className={styles.tip}>
        1) Загрузи без SW — только сеть. 2) Включи SW → первая загрузка <code>network-first</code>. 3)
        Повтор — <code>cache-hit</code> (второй запрос к API в DevTools — фон SWR). 4) Offline ON →
        кэш, не ошибка.
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function SwSandboxPanel({ lab }: { lab: LiveSwLabApi }) {
  const {
    supported,
    active,
    offline,
    busy,
    log,
    weather,
    via,
    raw,
    register,
    unregister,
    clearCache,
    toggleOffline,
    loadWeather,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Service Worker в этом браузере недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Свободный режим: SW, кэш, offline, заголовок <code>X-SW-Lab</code>, Network и Application →
        Cache Storage. API: Open-Meteo, Минск.
      </p>

      <StatusBadges active={active} via={via} />

      <div className={styles.actions}>
        <button type="button" className="uiBtn uiBtnPrimary" disabled={busy || active} onClick={() => void register()}>
          Register
        </button>
        <button type="button" className="uiBtn uiBtnGhost" disabled={busy || !active} onClick={() => void unregister()}>
          Unregister
        </button>
        <button type="button" className="uiBtn uiBtnGhost" disabled={busy} onClick={() => void clearCache()}>
          Clear cache
        </button>
        <button
          type="button"
          className={`uiBtn ${offline ? 'uiBtnDanger' : 'uiBtnGhost'}`}
          disabled={busy || !active}
          onClick={() => void toggleOffline()}
        >
          {offline ? 'Offline ON' : 'Offline OFF'}
        </button>
        <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void loadWeather()}>
          Fetch погода
        </button>
      </div>

      <WeatherWidget weather={weather} />

      {raw ? (
        <pre className={styles.raw} aria-label="Сырой ответ">
          {raw}
        </pre>
      ) : null}

      <LabLog log={log} />
    </div>
  )
}
