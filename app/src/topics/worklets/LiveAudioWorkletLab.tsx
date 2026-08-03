import { useCallback, useEffect, useRef, useState } from 'react'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import styles from './LiveWorkletsLab.module.css'

type LogLine = { kind: 'ok' | 'err' | 'info'; text: string }

const BAR_COUNT = 7

function audioWorkletUrl() {
  return `${import.meta.env.BASE_URL}audio-lab-processor.js`
}

function clipUrl() {
  return `${import.meta.env.BASE_URL}audio-lab-clip.mp3`
}

/** Берём несколько полос из FFT; низкие частоты приглушены, общая чувствительность −30%. */
function bandsFromAnalyser(analyser: AnalyserNode, out: number[]) {
  const bins = analyser.frequencyBinCount
  const data = new Uint8Array(bins)
  analyser.getByteFrequencyData(data)

  const sensitivity = 0.7 // −30% к прежней чувствительности
  // пропускаем самый низ (DC/бум), иначе первый столбик залипает на максимуме
  const usableStart = Math.max(2, Math.floor(bins * 0.02))
  const usableEnd = Math.floor(bins * 0.5)
  const usable = Math.max(1, usableEnd - usableStart)

  for (let i = 0; i < out.length; i += 1) {
    const start = usableStart + Math.floor((i / out.length) * usable)
    const end = usableStart + Math.floor(((i + 1) / out.length) * usable)
    let sum = 0
    let n = 0
    for (let b = start; b < Math.max(end, start + 1) && b < bins; b += 1) {
      sum += data[b] ?? 0
      n += 1
    }
    const avg = n ? sum / n / 255 : 0
    const next = Math.max(0.08, Math.min(1, avg * sensitivity))
    out[i] = out[i] * 0.55 + next * 0.45
  }
}

export type AudioWorkletLabApi = ReturnType<typeof useAudioWorkletLab>

export function useAudioWorkletLab() {
  const [supported] = useState(
    () => typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
  )
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [gain, setGain] = useState(0.3)
  const [loop, setLoop] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.12))
  const [log, setLog] = useState<LogLine[]>([])

  const ctxRef = useRef<AudioContext | null>(null)
  const nodeRef = useRef<AudioWorkletNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const moduleReadyRef = useRef(false)
  const levelsRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0.12))
  const rafRef = useRef<number | null>(null)

  const pushLog = useCallback((line: LogLine) => {
    setLog((prev) => [...prev.slice(-10), line])
  }, [])

  const stopMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    levelsRef.current = Array.from({ length: BAR_COUNT }, () => 0.12)
    setLevels(levelsRef.current.slice())
  }, [])

  const startMeter = useCallback(() => {
    const tick = () => {
      const analyser = analyserRef.current
      if (analyser) {
        bandsFromAnalyser(analyser, levelsRef.current)
        setLevels(levelsRef.current.slice())
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const applyGain = useCallback(() => {
    const param = nodeRef.current?.parameters.get('gain')
    if (param) param.value = gain
  }, [gain])

  useEffect(() => {
    applyGain()
  }, [applyGain])

  useEffect(() => {
    return () => {
      stopMeter()
      try {
        sourceRef.current?.stop()
      } catch {
        /* already stopped */
      }
      try {
        sourceRef.current?.disconnect()
        nodeRef.current?.disconnect()
        analyserRef.current?.disconnect()
        void ctxRef.current?.close()
      } catch {
        /* ignore */
      }
      sourceRef.current = null
      nodeRef.current = null
      analyserRef.current = null
      ctxRef.current = null
    }
  }, [stopMeter])

  const ensureContext = async () => {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) throw new Error('AudioContext недоступен')

    if (!ctxRef.current) {
      ctxRef.current = new Ctx()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    if (!moduleReadyRef.current) {
      await ctx.audioWorklet.addModule(audioWorkletUrl())
      moduleReadyRef.current = true
      pushLog({ kind: 'ok', text: 'audioWorklet.addModule(lab-gain)' })
    }

    if (!bufferRef.current) {
      const res = await fetch(clipUrl())
      if (!res.ok) throw new Error(`Не удалось загрузить клип (${res.status})`)
      const data = await res.arrayBuffer()
      const buffer = await ctx.decodeAudioData(data.slice(0))
      bufferRef.current = buffer
      setDuration(buffer.duration)
      pushLog({
        kind: 'ok',
        text: `decodeAudioData · ${buffer.duration.toFixed(1)} s · audio-lab-clip.mp3`,
      })
    }

    return ctx
  }

  const stopSourceOnly = () => {
    try {
      sourceRef.current?.stop()
    } catch {
      /* ignore */
    }
    try {
      sourceRef.current?.disconnect()
    } catch {
      /* ignore */
    }
    sourceRef.current = null
    setPlaying(false)
    stopMeter()
  }

  const start = async () => {
    if (!supported) {
      pushLog({ kind: 'err', text: 'Web Audio / AudioWorklet недоступны' })
      return
    }
    setBusy(true)
    try {
      const ctx = await ensureContext()
      stopSourceOnly()

      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.72
        analyserRef.current = analyser
      }

      if (!nodeRef.current) {
        const node = new AudioWorkletNode(ctx, 'lab-gain')
        node.connect(analyserRef.current)
        analyserRef.current.connect(ctx.destination)
        nodeRef.current = node
      }
      applyGain()

      const buffer = bufferRef.current
      if (!buffer) throw new Error('Буфер клипа пуст')

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = loop
      source.connect(nodeRef.current)
      source.onended = () => {
        if (sourceRef.current === source) {
          sourceRef.current = null
          setPlaying(false)
          stopMeter()
          pushLog({ kind: 'info', text: 'клип закончился' })
        }
      }
      source.start(0)
      sourceRef.current = source
      setPlaying(true)
      startMeter()
      pushLog({
        kind: 'info',
        text: `play · worklet + AnalyserNode · loop=${loop}`,
      })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Не удалось запустить клип',
      })
      setPlaying(false)
      stopMeter()
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    try {
      stopSourceOnly()
      try {
        nodeRef.current?.disconnect()
        analyserRef.current?.disconnect()
      } catch {
        /* ignore */
      }
      nodeRef.current = null
      analyserRef.current = null
      if (ctxRef.current) {
        await ctxRef.current.close()
        ctxRef.current = null
      }
      moduleReadyRef.current = false
      bufferRef.current = null
      setDuration(null)
      pushLog({ kind: 'info', text: 'stop · context closed' })
    } catch (err) {
      pushLog({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Stop failed',
      })
    } finally {
      setBusy(false)
    }
  }

  return {
    supported,
    playing,
    busy,
    gain,
    setGain,
    loop,
    setLoop,
    duration,
    levels,
    log,
    start,
    stop,
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

function Meter({
  playing,
  duration,
  levels,
}: {
  playing: boolean
  duration: number | null
  levels: number[]
}) {
  return (
    <div className={`${styles.audioMeter} ${playing ? styles.audioMeterOn : ''}`}>
      <div className={styles.audioMeterLabel}>
        {playing ? 'клип · волны из AnalyserNode' : 'тихо'}
      </div>
      <div className={styles.audioBars} aria-hidden>
        {levels.map((level, i) => (
          <span
            key={i}
            className={styles.audioBar}
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>
      <div className={styles.caption}>
        audio-lab-clip.mp3
        {duration != null ? ` · ${duration.toFixed(1)} s` : ''}
        {' · '}
        worklet → analyser
      </div>
    </div>
  )
}

export function AudioWorkletProblemPanel({ lab }: { lab: AudioWorkletLabApi }) {
  const { supported, playing, busy, duration, levels, log, start, stop } = lab

  if (!supported) {
    return <p className={styles.warn}>Web Audio API в этом браузере недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <div className={styles.problem}>
        <div className={styles.problemLabel}>Проблема</div>
        <p>
          Нужно проиграть короткий аудиоклип и обработать его «на лету». Если всю обработку держать
          на странице, UI может подлагивать.
        </p>
        <div className={styles.problemLabel}>Решение</div>
        <p>
          Клип идёт в AudioWorklet (gain), а полоски читают спектр через AnalyserNode — в такт
          файлу.
        </p>
      </div>

      <Meter playing={playing} duration={duration} levels={levels} />

      <div className={styles.actions}>
        {!playing ? (
          <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void start()}>
            Старт
          </button>
        ) : (
          <button type="button" className="uiBtn uiBtnDanger" disabled={busy} onClick={() => void stop()}>
            Стоп
          </button>
        )}
      </div>

      <p className={styles.tip}>
        Старт по клику — это autoplay policy, не диалог permissions. Волны из спектра клипа
        (AnalyserNode), не CSS-анимация. Файл: <code>public/audio-lab-clip.mp3</code>.
      </p>

      <LabLog log={log} />
    </div>
  )
}

export function AudioWorkletSandboxPanel({ lab }: { lab: AudioWorkletLabApi }) {
  const {
    supported,
    playing,
    busy,
    gain,
    setGain,
    loop,
    setLoop,
    duration,
    levels,
    log,
    start,
    stop,
  } = lab

  if (!supported) {
    return <p className={styles.warn}>Web Audio API недоступен.</p>
  }

  return (
    <div className={styles.root}>
      <p className={styles.tip}>
        Цепочка: buffer → worklet(gain) → AnalyserNode → speakers. Громкость и loop — в
        песочнице.
      </p>

      <Meter playing={playing} duration={duration} levels={levels} />

      <label className={styles.field}>
        <span>громкость ({gain.toFixed(2)})</span>
        <input
          type="range"
          min={0}
          max={1.2}
          step={0.01}
          value={gain}
          onChange={(e) => setGain(Number(e.target.value))}
        />
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={loop}
          disabled={playing}
          onChange={(e) => setLoop(e.target.checked)}
        />
        loop (вступит со следующего Start)
      </label>

      <div className={styles.actions}>
        {!playing ? (
          <button type="button" className="uiBtn uiBtnPrimary" disabled={busy} onClick={() => void start()}>
            Start
          </button>
        ) : (
          <button type="button" className="uiBtn uiBtnDanger" disabled={busy} onClick={() => void stop()}>
            Stop
          </button>
        )}
      </div>

      <LabLog log={log} />
    </div>
  )
}

export function AudioWorkletCodePanel() {
  return (
    <LabCodePanel
      intro="Клип через worklet; визуализация — AnalyserNode.getByteFrequencyData в requestAnimationFrame."
      snippets={[
        {
          label: 'Цепочка',
          code: `source.connect(worklet)
worklet.connect(analyser)
analyser.connect(ctx.destination)`,
        },
        {
          label: 'Полоски в такт',
          code: `const data = new Uint8Array(analyser.frequencyBinCount)

function tick() {
  analyser.getByteFrequencyData(data)
  // data[i] → высота полоски
  requestAnimationFrame(tick)
}
tick()`,
        },
        {
          label: 'Gain processor',
          code: `registerProcessor('lab-gain', class extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const gain = parameters.gain[0] ?? 0.3
    // output = input * gain
    return true
  }
})`,
        },
      ]}
    />
  )
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
