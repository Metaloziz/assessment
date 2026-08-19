import { useCallback, useEffect, useRef, useState } from 'react'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './LiveWebWorkersLab.module.css'
import type { HeavyRequest, HeavyResponse } from './heavy.types'

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

function sumPrimesUpTo(limit: number): number {
  if (limit < 2) return 0
  const sieve = new Uint8Array(limit + 1)
  sieve.fill(1)
  sieve[0] = 0
  sieve[1] = 0
  for (let i = 2; i * i <= limit; i += 1) {
    if (!sieve[i]) continue
    for (let j = i * i; j <= limit; j += i) sieve[j] = 0
  }
  let sum = 0
  for (let i = 2; i <= limit; i += 1) {
    if (sieve[i]) sum += i
  }
  return sum
}

export type WebWorkersLabApi = ReturnType<typeof useWebWorkersLab>

export function useWebWorkersLab() {
  const [supported] = useState(() => typeof Worker !== 'undefined')
  const [limit, setLimit] = useState(1_200_000)
  const [busy, setBusy] = useState<'main' | 'worker' | null>(null)
  const [pulse, setPulse] = useState(0)
  const [lastMain, setLastMain] = useState<{ result: number; ms: number } | null>(null)
  const [lastWorker, setLastWorker] = useState<{ result: number; ms: number } | null>(null)
  const [log, setLog] = useState<LogLine[]>([])
  const workerRef = useRef<Worker | null>(null)

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-12), line])
  }, [])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      setPulse((p) => (p + 1) % 1000)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('./heavy.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<HeavyResponse>) => {
      const data = event.data
      if (!data || data.type !== 'sumPrimes') return
      setLastWorker({ result: data.result, ms: data.ms })
      setBusy(null)
      pushLog({
        kind: 'ok',
        text: `worker · sum primes ≤ ${data.limit} = ${data.result} · ${data.ms} ms`,
      })
    }
    worker.onerror = (err) => {
      setBusy(null)
      pushLog({ kind: 'err', text: err.message || 'Worker error' })
    }
    workerRef.current = worker
    pushLog({ kind: 'info', text: 'Worker создан' })
    return worker
  }, [pushLog])

  const runOnMain = () => {
    if (busy) return
    setBusy('main')
    pushLog({ kind: 'info', text: `main thread · limit ${limit}… UI может зависнуть` })
    // дать кадру отрисовать busy-состояние
    window.setTimeout(() => {
      const t0 = performance.now()
      try {
        const result = sumPrimesUpTo(limit)
        const ms = Math.round(performance.now() - t0)
        setLastMain({ result, ms })
        pushLog({ kind: 'ok', text: `main · ${result} · ${ms} ms` })
      } catch (err) {
        pushLog({
          kind: 'err',
          text: err instanceof Error ? err.message : 'Main calc failed',
        })
      } finally {
        setBusy(null)
      }
    }, 30)
  }

  const runOnWorker = () => {
    if (!supported) {
      pushLog({ kind: 'err', text: 'Worker API недоступен' })
      return
    }
    if (busy) return
    setBusy('worker')
    const worker = ensureWorker()
    const msg: HeavyRequest = { type: 'sumPrimes', limit }
    pushLog({ kind: 'info', text: `postMessage → worker · limit ${limit}` })
    worker.postMessage(msg)
  }

  const terminateWorker = () => {
    if (!workerRef.current) {
      pushLog({ kind: 'info', text: 'Worker ещё не создан' })
      return
    }
    workerRef.current.terminate()
    workerRef.current = null
    setBusy((b) => (b === 'worker' ? null : b))
    pushLog({ kind: 'info', text: 'worker.terminate()' })
  }

  const resetViz = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    setBusy(null)
    setLastMain(null)
    setLastWorker(null)
    setLog([])
  }

  return {
    supported,
    limit,
    setLimit,
    busy,
    pulse,
    lastMain,
    lastWorker,
    log,
    runOnMain,
    runOnWorker,
    terminateWorker,
    resetViz,
  }
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

function PulseMeter({ pulse, frozen }: { pulse: number; frozen: boolean }) {
  return (
    <div className={styles.pulseWrap} aria-live="polite">
      <div className={styles.pulseLabel}>Живой UI (анимация)</div>
      <div className={styles.pulseTrack}>
        <div
          className={`${styles.pulseDot} ${frozen ? styles.pulseFrozen : ''}`}
          style={{ left: `${pulse % 100}%` }}
        />
      </div>
      <div className={styles.pulseMeta}>
        {frozen ? 'поток занят — анимация стопорится' : 'поток свободен — точка бежит'}
      </div>
    </div>
  )
}

function ResultRow({
  label,
  value,
}: {
  label: string
  value: { result: number; ms: number } | null
}) {
  return (
    <div className={styles.resultRow}>
      <span className={styles.resultLabel}>{label}</span>
      {value ? (
        <span className={styles.resultValue}>
          {value.result.toLocaleString('ru-RU')} · {value.ms} ms
        </span>
      ) : (
        <span className={styles.resultEmpty}>ещё не считали</span>
      )}
    </div>
  )
}

export function WebWorkersProblemPanel({ lab }: { lab: WebWorkersLabApi }) {
  const {
    supported,
    limit,
    busy,
    pulse,
    lastMain,
    lastWorker,
    log,
    runOnMain,
    runOnWorker,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Web Workers в этом браузере недоступны.</p>
  }

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Нажал «Посчитать» — страница зависла: кнопка не отпускается, анимация дёргается. Тяжёлая
          работа блокирует интерфейс.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Тот же расчёт отдаём фоновому скрипту (Web Worker). Страница остаётся живой, ответ
          приходит сообщением.
        </p>
      </div>

      <PulseMeter pulse={pulse} frozen={busy === 'main'} />

      <p className={styles.hint}>Сумма простых чисел до {limit.toLocaleString('ru-RU')}</p>

      <div className={styles.actions}>
        <LabButton variant="danger" disabled={busy != null} onClick={runOnMain}>
          Считать на странице
        </LabButton>
        <LabButton variant="primary" disabled={busy != null} onClick={runOnWorker}>
          Считать в Worker
        </LabButton>
      </div>

      <ResultRow label="Страница" value={lastMain} />
      <ResultRow label="Worker" value={lastWorker} />

      <p className={styles.tip}>
        Сначала посчитай на странице — смотри на точку сверху. Потом в Worker: точка продолжает
        бежать.
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function WebWorkersSandboxPanel({ lab }: { lab: WebWorkersLabApi }) {
  const {
    supported,
    limit,
    setLimit,
    busy,
    pulse,
    lastMain,
    lastWorker,
    log,
    runOnMain,
    runOnWorker,
    terminateWorker,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Web Workers в этом браузере недоступны.</p>
  }

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Меняй нагрузку, сравнивай main vs worker, останавливай worker. В DevTools → Sources можно
        увидеть отдельный поток Worker.
      </p>

      <PulseMeter pulse={pulse} frozen={busy === 'main'} />

      <label className={styles.field}>
        <span>limit (чем больше — тяжелее)</span>
        <input
          type="range"
          min={200_000}
          max={2_500_000}
          step={100_000}
          value={limit}
          disabled={busy != null}
          onChange={(e) => setLimit(Number(e.target.value))}
        />
        <span className={styles.rangeValue}>{limit.toLocaleString('ru-RU')}</span>
      </label>

      <div className={styles.actions}>
        <LabButton variant="danger" disabled={busy != null} onClick={runOnMain}>
          Main thread
        </LabButton>
        <LabButton variant="primary" disabled={busy != null} onClick={runOnWorker}>
          Worker
        </LabButton>
        <LabButton variant="secondary" disabled={busy === 'main'} onClick={terminateWorker}>
          terminate()
        </LabButton>
      </div>

      <ResultRow label="Main" value={lastMain} />
      <ResultRow label="Worker" value={lastWorker} />
      <LabLog log={log} />
    </div>
  )
}

export function WebWorkersCodePanel() {
  return (
    <LabCodePanel
      intro="Worker — отдельный JS-поток без DOM. Связь только через сообщения."
      snippets={[
        {
          label: 'Создать Worker (Vite)',
          code: `const worker = new Worker(
  new URL('./heavy.worker.ts', import.meta.url),
  { type: 'module' },
)`,
        },
        {
          label: 'Отправить задачу и получить ответ',
          code: `worker.postMessage({ type: 'sumPrimes', limit: 1_000_000 })

worker.onmessage = (event) => {
  console.log(event.data.result, event.data.ms)
}

worker.onerror = (err) => console.error(err)`,
        },
        {
          label: 'Внутри worker-файла',
          code: `self.onmessage = (event) => {
  const { limit } = event.data
  const result = heavyCalc(limit)
  self.postMessage({ result })
}`,
        },
        {
          label: 'Остановить Worker',
          note: 'В React делай terminate в cleanup useEffect.',
          code: `worker.terminate()
// или внутри воркера: self.close()`,
        },
      ]}
    />
  )
}
