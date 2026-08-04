import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './LiveWorkletsLab.module.css'

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

function paintWorkletUrl() {
  return `${import.meta.env.BASE_URL}paint-lab-stripes.js`
}

type CssWithPaint = typeof CSS & {
  paintWorklet: { addModule: (moduleURL: string) => Promise<void> }
}

function getPaintWorklet() {
  if (typeof CSS === 'undefined' || !('paintWorklet' in CSS)) return null
  return (CSS as CssWithPaint).paintWorklet
}

export type WorkletsLabApi = ReturnType<typeof useWorkletsLab>

export function useWorkletsLab() {
  const [supported] = useState(() => getPaintWorklet() != null)
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [color, setColor] = useState('#69b1ff')
  const [gap, setGap] = useState(14)
  const [angle, setAngle] = useState(25)
  const [log, setLog] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-10), line])
  }, [])

  const loadWorklet = useCallback(async () => {
    const paintWorklet = getPaintWorklet()
    if (!paintWorklet) {
      pushLog({ kind: 'err', text: 'CSS.paintWorklet не поддерживается в этом браузере' })
      return false
    }
    setBusy(true)
    try {
      await paintWorklet.addModule(paintWorkletUrl())
      setReady(true)
      pushLog({ kind: 'ok', text: `addModule(${paintWorkletUrl()})` })
      return true
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Не удалось загрузить paint worklet',
      })
      return false
    } finally {
      setBusy(false)
    }
  }, [pushLog])

  useEffect(() => {
    if (!supported) return
    void loadWorklet()
  }, [supported, loadWorklet])

  const previewStyle = {
    ['--lab-stripe-color' as string]: color,
    ['--lab-stripe-gap' as string]: String(gap),
    ['--lab-stripe-angle' as string]: String(angle),
    backgroundImage: enabled && ready ? 'paint(lab-stripes)' : undefined,
    backgroundColor: enabled && ready ? undefined : '#1a1a1a',
  }

  return {
    supported,
    ready,
    enabled,
    setEnabled,
    color,
    setColor,
    gap,
    setGap,
    angle,
    setAngle,
    log,
    busy,
    previewStyle,
    loadWorklet,
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

function Preview({
  style,
  caption,
}: {
  style: CSSProperties
  caption: string
}) {
  return (
    <div className={styles.previewWrap}>
      <div className={styles.preview} style={style} aria-label="Превью paint worklet">
        <div className={styles.previewCard}>
          <div className={styles.previewTitle}>Карточка</div>
          <p className={styles.previewText}>Фон рисует paint worklet, не картинка.</p>
        </div>
      </div>
      <p className={styles.caption}>{caption}</p>
    </div>
  )
}

export function WorkletsProblemPanel({ lab }: { lab: WorkletsLabApi }) {
  const { supported, ready, enabled, setEnabled, previewStyle, log, busy, loadWorklet } = lab

  if (!supported) {
    return (
      <div className={styles.root}>
        <p className={styles.warn}>
          CSS Paint Worklet здесь недоступен (часто так в Firefox/Safari). Открой Chrome/Edge —
          или смотри вкладку «Код».
        </p>
        <LabLog log={log} />
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Нужен живой полосатый фон на карточке. Картинку тащить тяжело, а рисовать canvas при
          каждом resize — лишняя возня.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Подключаем маленький paint worklet: браузер сам рисует фон через CSS{' '}
          <code>paint(lab-stripes)</code>.
        </p>
      </div>

      <Preview
        style={previewStyle}
        caption={ready ? (enabled ? 'paint включён' : 'paint выключен') : 'worklet грузится…'}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className="uiBtn uiBtnPrimary"
          disabled={busy || !ready}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? 'Выключить фон' : 'Включить фон'}
        </button>
        <button
          type="button"
          className="uiBtn uiBtnGhost"
          disabled={busy}
          onClick={() => void loadWorklet()}
        >
          Перезагрузить worklet
        </button>
      </div>

      <p className={styles.tip}>
        Включи/выключи фон и потяни окно — полоски перерисуются сами. Это не Web Worker и не
        картинка.
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function WorkletsSandboxPanel({ lab }: { lab: WorkletsLabApi }) {
  const {
    supported,
    ready,
    enabled,
    setEnabled,
    color,
    setColor,
    gap,
    setGap,
    angle,
    setAngle,
    previewStyle,
    log,
    busy,
    loadWorklet,
  } = lab

  if (!supported) {
    return (
      <p className={styles.warn}>
        Paint Worklet не поддерживается — крутить параметры тут не получится. Сравни с Chrome.
      </p>
    )
  }

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Крути CSS-переменные: цвет, шаг, угол. Они уходят в worklet через{' '}
        <code>inputProperties</code>.
      </p>

      <Preview
        style={previewStyle}
        caption={ready ? `paint(lab-stripes) · gap ${gap} · ${angle}°` : 'не готов'}
      />

      <div className={styles.controls}>
        <label className={styles.field}>
          <span>цвет</span>
          <input
            type="color"
            value={color}
            disabled={!ready}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>шаг полос ({gap}px)</span>
          <input
            type="range"
            min={6}
            max={40}
            value={gap}
            disabled={!ready}
            onChange={(e) => setGap(Number(e.target.value))}
          />
        </label>
        <label className={styles.field}>
          <span>угол ({angle}°)</span>
          <input
            type="range"
            min={0}
            max={90}
            value={angle}
            disabled={!ready}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="uiBtn uiBtnPrimary"
          disabled={!ready}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? 'Disable paint' : 'Enable paint'}
        </button>
        <button
          type="button"
          className="uiBtn uiBtnGhost"
          disabled={busy}
          onClick={() => void loadWorklet()}
        >
          addModule again
        </button>
      </div>

      <LabLog log={log} />
    </div>
  )
}

export function WorkletsCodePanel() {
  return (
    <LabCodePanel
      intro="Worklet — узкий скрипт для paint/audio, не универсальный Web Worker. Ниже — Paint (Houdini) и намёк на AudioWorklet."
      snippets={[
        {
          label: 'Paint worklet: registerPaint',
          code: `class LabStripesPainter {
  static get inputProperties() {
    return ['--lab-stripe-color', '--lab-stripe-gap']
  }
  paint(ctx, geom, props) {
    const color = String(props.get('--lab-stripe-color') || '#69b1ff')
    // рисуем в ctx под размер geom
  }
}
registerPaint('lab-stripes', LabStripesPainter)`,
        },
        {
          label: 'Подключить и использовать в CSS',
          code: `await CSS.paintWorklet.addModule('/paint-lab-stripes.js')

.box {
  --lab-stripe-color: #69b1ff;
  --lab-stripe-gap: 14;
  background-image: paint(lab-stripes);
}`,
        },
        {
          label: 'Feature-detect',
          code: `if ('paintWorklet' in CSS) {
  await CSS.paintWorklet.addModule(url)
} else {
  // fallback: обычный CSS / картинка / canvas
}`,
        },
        {
          label: 'AudioWorklet — см. вариацию Audio',
          note: 'Переключи лабу на вкладку Audio сверху — там полный сценарий со звуком.',
          code: `await audioContext.audioWorklet.addModule('/audio-lab-processor.js')
const node = new AudioWorkletNode(audioContext, 'lab-tone')
node.connect(audioContext.destination)`,
        },
      ]}
    />
  )
}
