import { useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabVizPanel, labVizStyles } from '../../components/lab/LabViz'
import styles from './ReduxSagaThunkLab.module.css'

const TOPIC_ID = '124-redux-saga-thunk'
const STEP = 0.6

type Pattern = 'thunk' | 'saga'
type CaseId = 'race' | 'latest'
type ReqKey = 'a' | 'ap' | 'app'
type ReqStatus = 'idle' | 'pending' | 'ok' | 'cancelled' | 'stale'
type Phase = 'idle' | 'burst' | 'done'

const PATTERNS: Array<{ id: Pattern; label: string }> = [
  { id: 'thunk', label: 'thunk' },
  { id: 'saga', label: 'saga' },
]

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'race', label: 'Гонка' },
  { id: 'latest', label: 'takeLatest' },
]

const REQS: ReqKey[] = ['a', 'ap', 'app']

const PAIN: Record<Pattern, ReactNode> = {
  thunk: (
    <>
      Автокомплит на <code>createAsyncThunk</code>: три запроса <code>a</code> → <code>ap</code> →{' '}
      <code>app</code>. Без отмены медленный ответ перезапишет UI.
    </>
  ),
  saga: (
    <>
      Та же гонка ввода, но через эффекты saga: <code>takeEvery</code> оставляет все задачи,{' '}
      <code>takeLatest</code> гасит предыдущие.
    </>
  ),
}

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  race: (
    <>
      Все три запроса добегают; самый медленный (<code>a</code>) часто затирает свежий UI после{' '}
      <code>app</code>.
    </>
  ),
  latest: (
    <>
      Новый <code>SEARCH</code> отменяет предыдущий: в UI остаётся только результат для{' '}
      <code>app</code>.
    </>
  ),
}

const CODE_INTRO: Record<Pattern, string> = {
  thunk: '`createAsyncThunk` + `AbortSignal`: отмена как у `takeLatest`, но вручную через `promise.abort()`.',
  saga: '`takeLatest` / `takeEvery` + `call` / `put`: middleware сам отменяет предыдущую задачу.',
}

const CODE_SNIPPETS: Record<Pattern, InteractiveSnippet[]> = {
  thunk: [
    {
      id: 'search-slice',
      label: 'src/search/searchSlice.ts',
      note: '`signal` из thunkAPI прокидывают в `fetch` — иначе `.abort()` не остановит сеть.',
      executable: false,
      languageLabel: 'ts',
      code: `import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// ═══════════════════════════════════════════
// THUNK ← async вне reducer
// ═══════════════════════════════════════════
export const fetchSearch = createAsyncThunk(
  'search/fetch',
  async (query: string, { signal }) => {
    const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
      signal, // ← AbortSignal от promise.abort()
    });
    if (!res.ok) throw new Error('search failed');
    return (await res.json()) as { items: string[] };
  },
);

const searchSlice = createSlice({
  name: 'search',
  initialState: { result: null as string[] | null, status: 'idle' as const },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSearch.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSearch.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.result = action.payload.items;
      })
      .addCase(fetchSearch.rejected, (state, action) => {
        if (action.meta.aborted) return; // ← тихий cancel
        state.status = 'failed';
      });
  },
});

export default searchSlice.reducer;`,
    },
    {
      id: 'search-box',
      label: 'src/search/SearchBox.tsx',
      note: 'Модель `takeLatest` в thunk: перед новым `dispatch` зовут `.abort()` у прошлого promise.',
      executable: false,
      languageLabel: 'tsx',
      code: `import { useRef } from 'react';
import { useAppDispatch } from '../hooks';
import { fetchSearch } from './searchSlice';

export function SearchBox() {
  const dispatch = useAppDispatch();
  const inFlight = useRef<ReturnType<typeof dispatch> | null>(null);

  const onChange = (query: string) => {
    inFlight.current?.abort?.(); // ← отмена предыдущего
    const promise = dispatch(fetchSearch(query));
    inFlight.current = promise;
  };

  return <input onChange={(e) => onChange(e.target.value)} placeholder="Поиск…" />;
}`,
    },
  ],
  saga: [
    {
      id: 'search-saga',
      label: 'src/search/searchSaga.ts',
      note: '`takeLatest` сам отменяет предыдущий worker; `takeEvery` — нет.',
      executable: false,
      languageLabel: 'ts',
      code: `import { call, put, takeLatest, delay } from 'redux-saga/effects';

function* searchWorker(action: { type: string; payload: string }) {
  try {
    yield delay(300); // ← debounce
    const data: { items: string[] } = yield call(searchApi, action.payload);
    yield put({ type: 'search/loaded', payload: data.items }); // ← put = dispatch
  } catch {
    yield put({ type: 'search/failed' });
  }
}

// ═══════════════════════════════════════════
// SAGA ← takeLatest гасит прошлый SEARCH
// ═══════════════════════════════════════════
export function* watchSearch() {
  yield takeLatest('SEARCH', searchWorker); // ← не takeEvery
}`,
    },
    {
      id: 'store-saga',
      label: 'src/store.ts',
      note: 'Saga подключают отдельно; thunk middleware в RTK уже есть по умолчанию.',
      executable: false,
      languageLabel: 'ts',
      code: `import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import searchReducer from './search/searchSlice';
import { watchSearch } from './search/searchSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: { search: searchReducer },
  middleware: (getDefault) =>
    getDefault({ thunk: false }).concat(sagaMiddleware), // ← saga вместо thunk
});

sagaMiddleware.run(watchSearch);`,
    },
  ],
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nodeCls(...mods: Array<string | false | undefined>) {
  return [labVizStyles.node, ...mods.filter(Boolean)].join(' ')
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

function reqSub(status: ReqStatus, key: ReqKey): string {
  switch (status) {
    case 'pending':
      return 'in-flight…'
    case 'ok':
      return `ok «${key}»`
    case 'cancelled':
      return 'aborted'
    case 'stale':
      return 'stale overwrite'
    default:
      return 'idle'
  }
}

function PatternSwitch({
  value,
  disabled,
  onChange,
}: {
  value: Pattern
  disabled?: boolean
  onChange: (id: Pattern) => void
}) {
  return (
    <div className={shell.row}>
      {PATTERNS.map((p) => (
        <LabButton
          key={p.id}
          variant="ghost"
          size="sm"
          active={value === p.id}
          disabled={disabled}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </LabButton>
      ))}
    </div>
  )
}

function RaceViz({
  reqs,
  uiResult,
  phase,
  caseId,
  pattern,
  resultRef,
}: {
  reqs: Record<ReqKey, ReqStatus>
  uiResult: string | null
  phase: Phase
  caseId: CaseId
  pattern: Pattern
  resultRef: MutableRefObject<HTMLDivElement | null>
}) {
  const meta =
    pattern === 'saga'
      ? caseId === 'latest'
        ? 'takeLatest'
        : 'takeEvery'
      : caseId === 'latest'
        ? 'abort + signal'
        : 'без отмены'

  return (
    <LabVizPanel title="Автокомплит · in-flight" meta={meta}>
      <div className={styles.layout}>
        <div
          className={nodeCls(
            phase !== 'idle' && labVizStyles.nodeActive,
            phase === 'done' && labVizStyles.nodeOk,
          )}
        >
          <span className={labVizStyles.nodeLabel}>Input</span>
          <span className={labVizStyles.nodeSub}>
            {phase === 'idle' ? 'печатает…' : 'a → ap → app'}
          </span>
        </div>

        <div className={styles.lanes} aria-label="Запросы в полёте">
          {REQS.map((key) => {
            const st = reqs[key]
            return (
              <div
                key={key}
                className={nodeCls(
                  st === 'pending' && labVizStyles.nodeActive,
                  st === 'ok' && labVizStyles.nodeOk,
                  (st === 'cancelled' || st === 'stale') && labVizStyles.nodeErr,
                  st === 'stale' && styles.nodeWarn,
                )}
              >
                <span className={labVizStyles.nodeLabel}>req «{key}»</span>
                <span className={labVizStyles.nodeSub}>{reqSub(st, key)}</span>
              </div>
            )
          })}
        </div>

        <div
          ref={resultRef}
          className={nodeCls(
            phase === 'done' && (caseId === 'latest' ? labVizStyles.nodeOk : styles.nodeWarn),
            phase === 'burst' && uiResult != null && labVizStyles.nodeActive,
          )}
        >
          <span className={labVizStyles.nodeLabel}>UI result</span>
          <span className={labVizStyles.nodeSub}>{uiResult ?? '—'}</span>
        </div>
      </div>
    </LabVizPanel>
  )
}

const idleReqs = (): Record<ReqKey, ReqStatus> => ({
  a: 'idle',
  ap: 'idle',
  app: 'idle',
})

export function ReduxSagaThunkLab() {
  const { lines, log, clear } = useLabLog()
  const [pattern, setPattern] = useState<Pattern>('thunk')
  const [caseId, setCaseId] = useState<CaseId>('race')
  const [phase, setPhase] = useState<Phase>('idle')
  const [reqs, setReqs] = useState<Record<ReqKey, ReqStatus>>(idleReqs)
  const [uiResult, setUiResult] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)

  const resetViz = () => {
    setPhase('idle')
    setReqs(idleReqs())
    setUiResult(null)
    setHint(null)
    if (resultRef.current) gsap.set(resultRef.current, { clearProps: 'transform,opacity' })
  }

  const selectPattern = (next: Pattern) => {
    tlRef.current?.kill()
    setBusy(false)
    setPattern(next)
    clear()
    resetViz()
  }

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    setBusy(false)
    setCaseId(next)
    clear()
    resetViz()
  }

  const run = () => {
    clear()
    resetViz()
    setBusy(true)
    setPhase('burst')

    const latest = caseId === 'latest'
    const engine = pattern === 'saga' ? 'saga' : 'thunk'

    if (latest) {
      playTimeline(
        tlRef,
        [
          () => {
            setReqs({ a: 'pending', ap: 'idle', app: 'idle' })
            log('info', `${engine}: SEARCH «a»`)
          },
          () => {
            setReqs({ a: 'cancelled', ap: 'pending', app: 'idle' })
            log('ok', `${engine}: cancel «a», SEARCH «ap»`)
          },
          () => {
            setReqs({ a: 'cancelled', ap: 'cancelled', app: 'pending' })
            log('ok', `${engine}: cancel «ap», SEARCH «app»`)
          },
          () => {
            setReqs({ a: 'cancelled', ap: 'cancelled', app: 'ok' })
            setUiResult('результаты для «app»')
            setPhase('done')
            log('ok', 'UI ← «app» · устаревшие aborted')
            setHint(
              pattern === 'saga'
                ? 'takeLatest оставил только последний worker'
                : 'promise.abort() + signal — модель takeLatest в thunk',
            )
          },
        ],
        (tl) => {
          if (!resultRef.current) return
          gsap.set(resultRef.current, { scale: 0.94, opacity: 0.55 })
          tl.to(resultRef.current, { scale: 1, opacity: 1 }, STEP * 3)
        },
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => {
          setReqs({ a: 'pending', ap: 'idle', app: 'idle' })
          log('info', `${engine}: старт «a» (медленный)`)
        },
        () => {
          setReqs({ a: 'pending', ap: 'pending', app: 'idle' })
          log('info', `${engine}: старт «ap»`)
        },
        () => {
          setReqs({ a: 'pending', ap: 'pending', app: 'pending' })
          log('info', `${engine}: старт «app» (быстрый)`)
        },
        () => {
          setReqs({ a: 'pending', ap: 'pending', app: 'ok' })
          setUiResult('результаты для «app»')
        },
        () => {
          setReqs({ a: 'pending', ap: 'ok', app: 'ok' })
          setUiResult('результаты для «ap»')
        },
        () => {
          setReqs({ a: 'stale', ap: 'ok', app: 'ok' })
          setUiResult('результаты для «a»')
          setPhase('done')
          log('err', 'медленный «a» перезаписал UI после «app»')
          setHint(
            pattern === 'saga'
              ? 'takeEvery как гонка без отмены — stale response в UI'
              : 'без abort все fulfilled добегают и могут затереть UI',
          )
        },
      ],
      (tl) => {
        if (!resultRef.current) return
        gsap.set(resultRef.current, { scale: 0.94, opacity: 0.55 })
        tl.to(resultRef.current, { scale: 1, opacity: 1 }, STEP * 3)
      },
      () => setBusy(false),
    )
  }

  const reset = () => {
    tlRef.current?.kill()
    setBusy(false)
    clear()
    resetViz()
  }

  const problem = (
    <div className={shell.panel}>
      <PatternSwitch value={pattern} disabled={busy} onChange={selectPattern} />

      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN[pattern]}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <RaceViz
        reqs={reqs}
        uiResult={uiResult}
        phase={phase}
        caseId={caseId}
        pattern={pattern}
        resultRef={resultRef}
      />

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <PatternSwitch value={pattern} onChange={selectPattern} />
      <InteractiveCodePanel
        key={pattern}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[pattern]}
        snippets={CODE_SNIPPETS[pattern]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Гонка поиска: thunk vs saga"
      lead="Async вне reducer: thunk проще; saga даёт takeLatest / race из коробки. Контраст — устаревший ответ в UI."
      problem={problem}
      code={code}
    />
  )
}
