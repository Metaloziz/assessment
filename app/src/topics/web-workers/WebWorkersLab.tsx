import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { LabVizPanel } from '../../components/lab/LabViz'
import shell from '../../components/lab/JsLabShell.module.css'
import styles from './LiveWebWorkersLab.module.css'
import { useWebWorkersLab } from './LiveWebWorkersLab'

const TOPIC_ID = '66-web-workers'

type CaseId = 'main' | 'worker'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'main', label: 'На странице' },
  { id: 'worker', label: 'В worker' },
]

const PAIN = (
  <>
    Тяжёлый расчёт в <code>main thread</code> может заморозить страницу: кнопки, таймеры и
    анимация перестают отвечать. <code>Web Worker</code> выносит эту работу в отдельный поток и
    возвращает результат сообщением.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  main: (
    <>
      Та же сумма считается в <code>main thread</code>, поэтому бегунок сверху стопорится до конца
      вычисления.
    </>
  ),
  worker: (
    <>
      Задача уходит через <code>postMessage</code> в <code>Worker</code>, а страница продолжает
      жить, пока ответ не вернётся в <code>onmessage</code>.
    </>
  ),
}

const CODE_INTRO: Record<CaseId, string> = {
  main: 'Смотрите, где тяжёлая функция запускается прямо в `main thread` и блокирует UI до конца.',
  worker:
    'Смотрите связку: `new Worker`, `postMessage`, `onmessage` и cleanup через `terminate()`.',
}

const MAIN_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'main-thread-calc',
    label: 'src/pages/Report.tsx',
    note: 'Тяжёлая функция вызвана прямо в обработчике клика.',
    executable: false,
    languageLabel: 'tsx',
    code: `const sumPrimesUpTo = (limit: number) => {
  /* тяжёлый цикл */
};

export const Report = () => {
  const [result, setResult] = useState<number | null>(null);

  const onRun = () => {
    // MAIN THREAD ← UI ждёт, пока цикл завершится
    const next = sumPrimesUpTo(1_200_000);
    setResult(next);
  };

  return <button onClick={onRun}>Посчитать</button>;
};`,
  },
  {
    id: 'heavy-worker-file',
    label: 'src/topics/web-workers/heavy.worker.ts',
    note: '`self.onmessage` получает лимит, считает и шлёт ответ обратно.',
    executable: false,
    languageLabel: 'ts',
    code: `/// <reference lib="webworker" />

self.onmessage = (event) => {
  const { limit } = event.data; // ← вход из postMessage
  const t0 = performance.now();
  const result = sumPrimesUpTo(limit);

  self.postMessage({
    type: 'sumPrimes',
    limit,
    result,
    ms: Math.round(performance.now() - t0),
  }); // ← ответ в main thread
};`,
  },
]

const WORKER_SNIPPETS: InteractiveSnippet[] = [
  {
    id: 'worker-setup',
    label: 'src/pages/Report.tsx',
    note: '`new Worker(..., { type: "module" })` создаёт отдельный поток рядом со страницей.',
    executable: false,
    languageLabel: 'tsx',
    code: `useEffect(() => {
  const worker = new Worker(
    new URL('./heavy.worker.ts', import.meta.url),
    { type: 'module' }, // ← Vite / bundler-friendly worker
  );

  worker.onmessage = (event) => {
    setResult(event.data.result); // ← ответ вернулся сообщением
  };

  return () => worker.terminate(); // ← cleanup при размонтировании
}, []);`,
  },
  {
    id: 'worker-post-message',
    label: 'src/pages/Report.tsx · run()',
    note: 'Страница только отправляет задачу и не выполняет тяжёлый цикл сама.',
    executable: false,
    languageLabel: 'tsx',
    code: `const runOnWorker = () => {
  if (!workerRef.current) return;

  workerRef.current.postMessage({
    type: 'sumPrimes',
    limit: 1_200_000, // ← задача ушла в worker
  });
};`,
  },
  {
    id: 'heavy-worker-file-live',
    label: 'src/topics/web-workers/heavy.worker.ts',
    note: 'Внутри `Worker` нет DOM, только вычисление и обмен сообщениями.',
    executable: false,
    languageLabel: 'ts',
    code: `self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type !== 'sumPrimes') return;

  const result = sumPrimesUpTo(msg.limit); // ← тяжёлая работа не в UI-потоке
  self.postMessage({ type: 'sumPrimes', result });
};`,
  },
]

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  main: MAIN_SNIPPETS,
  worker: WORKER_SNIPPETS,
}

const PulseMeter = ({ pulse, frozen }: { pulse: number; frozen: boolean }) => (
  <div className={styles.pulseWrap} aria-live="polite">
    <div className={styles.pulseLabel}>Отзывчивость страницы</div>
    <div className={styles.pulseTrack}>
      <div
        className={`${styles.pulseDot} ${frozen ? styles.pulseFrozen : ''}`}
        style={{ left: `${pulse % 100}%` }}
      />
    </div>
    <div className={styles.pulseMeta}>
      {frozen ? 'страница занята циклом' : 'страница свободна, индикатор движется'}
    </div>
  </div>
)

const ResultRow = ({
  label,
  value,
}: {
  label: string
  value: { result: number; ms: number } | null
}) => (
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

export const WebWorkersLab = () => {
  const lab = useWebWorkersLab()
  const [caseId, setCaseId] = useState<CaseId>('main')
  const { supported, limit, setLimit, busy, pulse, lastMain, lastWorker, log, runOnMain, runOnWorker, resetViz } =
    lab

  const selectCase = (next: CaseId) => {
    if (busy) return
    setCaseId(next)
    resetViz()
  }

  const run = () => {
    if (caseId === 'main') runOnMain()
    else runOnWorker()
  }

  const problem = !supported ? (
    <div className={shell.panel}>
      <p className={shell.pain}>
        <code>Web Worker</code> в этом браузере недоступен.
      </p>
    </div>
  ) : (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            disabled={busy != null}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy != null} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy != null} onClick={resetViz}>
          Сброс
        </LabButton>
      </div>

      <label className={shell.field}>
        <span>
          Нагрузка для <code>sumPrimesUpTo</code>
        </span>
        <input
          type="range"
          min={200_000}
          max={2_500_000}
          step={100_000}
          value={limit}
          disabled={busy != null}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
      </label>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <LabVizPanel
        title="Тяжёлый расчёт"
        meta={
          busy === 'main'
            ? 'main thread занят'
            : busy === 'worker'
              ? 'worker считает'
              : caseId === 'main'
                ? 'расчёт на странице'
                : 'расчёт в фоне'
        }
      >
        <PulseMeter pulse={pulse} frozen={busy === 'main'} />
        <div className={styles.problem} style={{ marginTop: '0.7rem' }}>
          <div className={styles.problemLabel}>Маршрут задачи</div>
          <p>
            {caseId === 'main' ? (
              <>
                Кнопка сразу запускает цикл в <code>main thread</code>, поэтому браузер занят одной
                тяжёлой работой.
              </>
            ) : (
              <>
                Страница шлёт задачу через <code>postMessage</code>; отдельный <code>Worker</code>{' '}
                считает и отвечает в <code>onmessage</code>.
              </>
            )}
          </p>
        </div>
        <div style={{ marginTop: '0.7rem' }}>
          <ResultRow label="Main" value={lastMain} />
        </div>
        <div style={{ marginTop: '0.45rem' }}>
          <ResultRow label="Worker" value={lastWorker} />
        </div>
      </LabVizPanel>

      <LabLogView
        lines={log.map((line) => ({
          kind: line.kind,
          text: line.text,
        }))}
        emptyText="Лог пуст — выберите кейс и запустите расчёт."
      />
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Web Workers"
      lead="Живой стенд: один и тот же тяжёлый расчёт либо блокирует `main thread`, либо уходит в `Worker` и не замораживает интерфейс."
      problem={problem}
      code={code}
    />
  )
}
