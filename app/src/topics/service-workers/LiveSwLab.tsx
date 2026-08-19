import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { LabButton } from '../../components/lab/LabButton'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabNode, LabVizPanel } from '../../components/lab/LabViz'
import shell from '../../components/lab/JsLabShell.module.css'
import { useLabLog } from '../../components/lab/useLabLog'
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

/** Минск · Open-Meteo (без API-ключа). URL должен совпадать с sw-lab.js */
export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=53.9006&longitude=27.559&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FMinsk'

const CACHE_NAME = 'assessment-sw-lab-v3'
type SwCaseId = 'warm' | 'offline'

const CASES: Array<{ id: SwCaseId; label: string }> = [
  { id: 'warm', label: 'повторный запрос' },
  { id: 'offline', label: 'offline с кэшем' },
]

const CASE_BRIEF: Record<SwCaseId, ReactNode> = {
  warm: (
    <>
      Первый ответ приходит из сети, а повторный уже отдаёт <code>Cache Storage</code>.
    </>
  ),
  offline: (
    <>
      Сначала прогреваем кэш из сети, потом выключаем сеть и получаем последний снимок через{' '}
      <code>Service Worker</code>.
    </>
  ),
}

const HINT: Record<SwCaseId, ReactNode> = {
  warm: (
    <>
      Итог: второй запрос не ждёт интернет с нуля, потому что <code>Service Worker</code> уже держит
      снимок в <code>Cache Storage</code>.
    </>
  ),
  offline: (
    <>
      Итог: сеть пропала, но пустого экрана нет, потому что <code>Service Worker</code> вернул
      последний закэшированный ответ.
    </>
  ),
}

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
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [via, setVia] = useState('')
  const [caseId, setCaseId] = useState<SwCaseId>('warm')
  const [finished, setFinished] = useState(false)
  const { lines, log, clear } = useLabLog(8)

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

  const setOfflineMode = useCallback(
    async (value: boolean) => {
      setOffline(value)
      await postToSw({ type: 'SET_OFFLINE', value })
    },
    [],
  )

  const clearCache = useCallback(async () => {
    if (navigator.serviceWorker.controller) {
      await postToSw({ type: 'CLEAR_CACHE' })
    }
    await caches.delete(CACHE_NAME)
    setVia('')
  }, [])

  const resetDemo = useCallback(async () => {
    clear()
    setFinished(false)
    setBusy(true)
    try {
      await setOfflineMode(false)
      await clearCache()
      setWeather(null)
      log('info', 'Стенд сброшен: offline выключен, кэш очищен')
    } catch (err) {
      log('err', err instanceof Error ? err.message : 'Не удалось сбросить стенд')
    } finally {
      setBusy(false)
    }
  }, [clear, clearCache, log, setOfflineMode])

  const ensureControlled = useCallback(async () => {
    if (!supported) return false
    if (!window.isSecureContext) {
      log('err', 'Нужен secure context: localhost или HTTPS')
      return false
    }

    if (navigator.serviceWorker.controller) {
      await refreshActive()
      return true
    }

    try {
      const reg = await navigator.serviceWorker.register(swUrl(), {
        scope: import.meta.env.BASE_URL,
      })
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 4000)
        }),
      ])

      if (!ready) {
        log('err', 'SW не активировался за 4 секунды')
        return false
      }

      if (!navigator.serviceWorker.controller) {
        log('info', `SW установлен для ${reg.scope}`)
        log('warn', 'Перезагружаю страницу, чтобы SW начал контролировать вкладку')
        window.setTimeout(() => {
          window.location.reload()
        }, 250)
        return false
      }

      log('ok', `SW готов · scope ${reg.scope}`)
      await refreshActive()
      return true
    } catch (err) {
      log('err', err instanceof Error ? err.message : 'Ошибка register()')
      return false
    }
  }, [log, refreshActive, supported])

  const fetchWeather = useCallback(async (label: string) => {
    const t0 = performance.now()
    try {
      const res = await fetch(WEATHER_URL)
      const ms = Math.round(performance.now() - t0)
      const source = res.headers.get('X-SW-Lab') ?? 'без SW · сеть'
      const text = await res.text()
      let data: WeatherPayload
      try {
        data = JSON.parse(text) as WeatherPayload
      } catch {
        data = { error: 'Ответ не JSON' }
      }
      setWeather(data)
      setVia(source)
      log(res.ok ? 'ok' : 'err', `${label}: ${source} · ${ms} ms · HTTP ${res.status}`)
      if (source === 'cache-hit') {
        log('info', 'Фоновый запрос в сеть всё ещё возможен: это revalidate после cache-hit')
      }
      return source
    } catch (err) {
      log('err', err instanceof Error ? err.message : 'Fetch failed')
      return null
    }
  }, [log])

  const runCase = useCallback(async () => {
    clear()
    setFinished(false)
    setBusy(true)

    try {
      const ready = await ensureControlled()
      if (!ready) return

      await setOfflineMode(false)
      await clearCache()
      setWeather(null)
      log('info', 'Кэш очищен перед прогоном')

      if (caseId === 'warm') {
        log('info', 'Первый запрос идёт в сеть и кладёт ответ в кэш')
        await fetchWeather('первый запрос')
        log('info', 'Повторный запрос должен прийти из кэша')
        await fetchWeather('повторный запрос')
      } else {
        log('info', 'Сначала прогреваем кэш из сети')
        await fetchWeather('прогрев кэша')
        await setOfflineMode(true)
        log('warn', 'Сеть для SW выключена, ждём ответ из кэша')
        await fetchWeather('offline')
      }

      setFinished(true)
    } finally {
      setBusy(false)
    }
  }, [caseId, clear, clearCache, ensureControlled, fetchWeather, log, setOfflineMode])

  return {
    supported,
    active,
    offline,
    busy,
    lines,
    weather,
    via,
    caseId,
    finished,
    setCaseId,
    runCase,
    resetDemo,
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

export function SwProblemPanel({ lab }: { lab: LiveSwLabApi }) {
  const {
    supported,
    active,
    offline,
    busy,
    lines,
    weather,
    via,
    caseId,
    finished,
    setCaseId,
    runCase,
    resetDemo,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Service Worker в этом браузере недоступен.</p>
  }

  return (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={busy}
            onClick={() => setCaseId(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>
      <div className={shell.row}>
        <LabButton variant="primary" size="sm" disabled={busy} onClick={() => void runCase()}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" size="sm" disabled={busy} onClick={() => void resetDemo()}>
          Сброс
        </LabButton>
      </div>
      <p className={shell.pain}>
        Без <code>Service Worker</code> виджет каждый раз ждёт сеть заново. Если интернет пропал,
        страница легко остаётся без данных, хотя снимок уже можно было сохранить.
      </p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel
        title="виджет прогноза"
        meta={
          <>
            {active ? 'SW on' : 'SW off'} · {offline ? 'offline для SW' : 'сеть доступна'}
          </>
        }
      >
        <div className={styles.scene}>
          <WeatherWidget weather={weather} />
          <div className={styles.route}>
            <LabNode label="страница" sub="fetch()" state={via ? 'ok' : 'idle'} />
            <LabNode
              label="service worker"
              sub={active ? 'контролирует вкладку' : 'ещё не подключён'}
              state={active ? 'ok' : 'idle'}
            />
            <div className={styles.routeFork}>
              <LabNode
                label="кэш"
                sub={
                  via === 'cache-hit'
                    ? 'cache-hit'
                    : via === 'cache-offline'
                      ? 'offline fallback'
                      : 'ждёт ответ'
                }
                state={via === 'cache-hit' || via === 'cache-offline' ? 'ok' : 'idle'}
              />
              <LabNode
                label="сеть"
                sub={
                  via === 'network-first'
                    ? 'network-first'
                    : offline
                      ? 'для SW выключена'
                      : 'используется при прогреве'
                }
                state={via === 'network-first' ? 'active' : offline ? 'err' : 'idle'}
              />
            </div>
          </div>
          <StatusBadges active={active} via={via} />
        </div>
      </LabVizPanel>

      {finished ? <p className={shell.hint}>{HINT[caseId]}</p> : null}
      <LabLogView lines={lines} />
    </div>
  )
}
