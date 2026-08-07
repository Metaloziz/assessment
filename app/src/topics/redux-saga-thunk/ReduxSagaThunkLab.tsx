import { useCallback, useMemo, useRef, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog, type LabLogKind } from '../../components/lab/useLabLog'

const TOPIC_ID = '124-redux-saga-thunk'

type SearchMode = 'thunk-race' | 'take-latest'

type SearchState = {
  query: string
  result: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  mode: SearchMode
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = window.setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Чем короче запрос — тем дольше «сеть» (имитация гонки). */
function latencyFor(query: string) {
  return Math.max(200, 1000 - query.length * 250)
}

export const fetchSearch = createAsyncThunk(
  'search/fetch',
  async (query: string, { signal }) => {
    await sleep(latencyFor(query), signal)
    return `результаты для «${query}»`
  },
)

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    query: '',
    result: null,
    status: 'idle',
    mode: 'thunk-race',
  } satisfies SearchState as SearchState,
  reducers: {
    setMode(state, action: PayloadAction<SearchMode>) {
      state.mode = action.payload
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    resetResult(state) {
      state.result = null
      state.status = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSearch.pending, (state, action) => {
        state.status = 'loading'
        state.query = action.meta.arg
      })
      .addCase(fetchSearch.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.result = action.payload
      })
      .addCase(fetchSearch.rejected, (state, action) => {
        if (action.meta.aborted) return
        state.status = 'failed'
        state.result = null
      })
  },
})

const { setMode, setQuery, resetResult } = searchSlice.actions

function createLabStore() {
  return configureStore({
    reducer: { search: searchSlice.reducer },
  })
}

type LabStore = ReturnType<typeof createLabStore>
type RootState = ReturnType<LabStore['getState']>
type AppDispatch = LabStore['dispatch']

function useAppDispatch() {
  return useDispatch<AppDispatch>()
}

function useAppSelector<T>(sel: (s: RootState) => T) {
  return useSelector(sel)
}

function SearchProblem({
  log,
  clear,
  lines,
}: {
  log: (kind: LabLogKind, text: string) => void
  clear: () => void
  lines: { kind: LabLogKind; text: string }[]
}) {
  const dispatch = useAppDispatch()
  const { query, result, status, mode } = useAppSelector((s) => s.search)
  const [busy, setBusy] = useState(false)
  const inFlightRef = useRef<{ abort: () => void } | null>(null)
  const seqRef = useRef(0)

  const runSearch = useCallback(
    async (q: string, opts?: { cancelPrevious?: boolean }) => {
      const id = ++seqRef.current
      if (opts?.cancelPrevious) {
        inFlightRef.current?.abort()
        log('ok', `#${id} takeLatest: отменили предыдущий, старт «${q}»`)
      } else {
        log('info', `#${id} thunk: старт «${q}» без отмены (~${latencyFor(q)}ms)`)
      }

      const promise = dispatch(fetchSearch(q))
      if (opts?.cancelPrevious) {
        inFlightRef.current = promise
      }

      try {
        const action = await promise
        if (fetchSearch.fulfilled.match(action)) {
          log(
            opts?.cancelPrevious ? 'ok' : 'err',
            `#${id} fulfilled → ${action.payload}${
              opts?.cancelPrevious ? '' : ' (может перезаписать свежий UI)'
            }`,
          )
        } else if (action.meta.aborted) {
          log('ok', `#${id} aborted «${q}»`)
        }
      } catch {
        log('err', `#${id} ошибка`)
      }
    },
    [dispatch, log],
  )

  const burst = async () => {
    setBusy(true)
    const queries = ['a', 'ap', 'app']
    const cancelPrevious = mode === 'take-latest'
    if (cancelPrevious) {
      log('ok', 'режим saga/`takeLatest`: каждый новый SEARCH гасит предыдущий')
      for (const q of queries) {
        void runSearch(q, { cancelPrevious: true })
        await sleep(70)
      }
      await sleep(1100)
    } else {
      log('ok', 'режим thunk без отмены: все три добегут')
      await Promise.all(queries.map((q) => runSearch(q, { cancelPrevious: false })))
      log('err', 'итог: медленный «a» часто перезаписывает UI после «app»')
    }
    setBusy(false)
  }

  return (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Автокомплит на <code>createAsyncThunk</code>: пользователь печатает{' '}
        <code>a</code> → <code>ap</code> → <code>app</code>. Без отмены ответы приходят вразнобой.
        Модель <code>takeLatest</code> (как в <code>redux-saga</code>) вызывает{' '}
        <code>promise.abort()</code> у предыдущего thunk.
      </p>
      <ol className={shell.steps}>
        <li>
          Режим <code>thunk-race</code>: три запроса живут параллельно.
        </li>
        <li>
          Режим <code>take-latest</code>: новый <code>dispatch</code> отменяет старый через{' '}
          <code>AbortSignal</code>.
        </li>
        <li>
          Для CRUD хватит одного <code>createAsyncThunk</code> без гонок ввода.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant={mode === 'thunk-race' ? 'primary' : 'ghost'}
          size="sm"
          active={mode === 'thunk-race'}
          disabled={busy}
          onClick={() => dispatch(setMode('thunk-race'))}
        >
          thunk-race
        </LabButton>
        <LabButton
          variant={mode === 'take-latest' ? 'primary' : 'ghost'}
          size="sm"
          active={mode === 'take-latest'}
          disabled={busy}
          onClick={() => dispatch(setMode('take-latest'))}
        >
          takeLatest
        </LabButton>
      </div>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>запрос</span>
          <input
            value={query}
            disabled={busy}
            onChange={(e) => dispatch(setQuery(e.target.value))}
            placeholder="app"
          />
        </label>
        <LabButton
          variant="secondary"
          disabled={busy || !query.trim()}
          onClick={() =>
            void runSearch(query.trim(), { cancelPrevious: mode === 'take-latest' })
          }
        >
          dispatch(fetchSearch)
        </LabButton>
        <LabButton variant="primary" disabled={busy} onClick={() => void burst()}>
          Burst a → ap → app
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            inFlightRef.current?.abort()
            dispatch(resetResult())
            clear()
          }}
        >
          Очистить
        </LabButton>
      </div>

      <p className={shell.hint}>
        status: <code>{status}</code>, UI result: <code>{result ?? '—'}</code>, mode:{' '}
        <code>{mode}</code>
      </p>

      <LabLogView lines={lines} />
    </div>
  )
}

function SearchLabInner() {
  const { lines, log, clear } = useLabLog()
  return <SearchProblem log={log} clear={clear} lines={lines} />
}

export function ReduxSagaThunkLab() {
  const store = useMemo(() => createLabStore(), [])

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      languageLabel="typescript"
      intro="Эталоны React + TypeScript + RTK. Живой store — во вкладке «Решение проблемы». `executable: false` — сниппеты не гоняются в `new Function`."
      snippets={[
        {
          id: 'async-thunk',
          label: 'createAsyncThunk',
          executable: false,
          note: '`signal` из thunkAPI — тот же `AbortSignal`, что у `promise.abort()` после `dispatch`.',
          code: `import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchSearch = createAsyncThunk(
  'search/fetch',
  async (query: string, { signal }) => {
    const res = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
      signal,
    });
    if (!res.ok) throw new Error('search failed');
    return (await res.json()) as { items: string[] };
  },
);

type SearchState = {
  result: string[] | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
};

const searchSlice = createSlice({
  name: 'search',
  initialState: { result: null, status: 'idle' } satisfies SearchState,
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
        if (action.meta.aborted) return; // takeLatest: тихий cancel
        state.status = 'failed';
      });
  },
});

export default searchSlice.reducer;`,
        },
        {
          id: 'take-latest',
          label: 'takeLatest через abort',
          executable: false,
          note: 'У saga это `takeLatest`. В RTK — храните promise от `dispatch` и зовите `.abort()` перед новым поиском.',
          code: `import { useRef } from 'react';
import { useAppDispatch } from './hooks';
import { fetchSearch } from './searchSlice';

export function SearchBox() {
  const dispatch = useAppDispatch();
  const inFlight = useRef<ReturnType<typeof dispatch> | null>(null);

  const onChange = (query: string) => {
    // модель redux-saga takeLatest
    inFlight.current?.abort?.();
    const promise = dispatch(fetchSearch(query));
    inFlight.current = promise;
  };

  return (
    <input
      onChange={(e) => onChange(e.target.value)}
      placeholder="Поиск…"
    />
  );
}`,
        },
        {
          id: 'provider',
          label: 'Store + Provider',
          executable: false,
          note: '`configureStore` уже кладёт thunk middleware. Saga подключают отдельно через `getDefaultMiddleware().concat(sagaMiddleware)`.',
          code: `import { configureStore } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import searchReducer from './searchSlice';

export const store = configureStore({
  reducer: { search: searchReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export function App() {
  return (
    <Provider store={store}>
      <SearchBox />
    </Provider>
  );
}`,
        },
        {
          id: 'when',
          label: 'thunk vs saga',
          executable: false,
          note: 'CRUD → `createAsyncThunk`. Отмена, debounce, multi-step, polling → saga (`takeLatest`, `race`, `fork`).',
          code: `type Case =
  | 'list users'
  | 'save form'
  | 'autocomplete'
  | 'checkout wizard'
  | 'polling'
  | 'race timeout';

function choose(c: Case): 'thunk' | 'saga' {
  switch (c) {
    case 'list users':
    case 'save form':
      return 'thunk';
    case 'autocomplete':
    case 'checkout wizard':
    case 'polling':
    case 'race timeout':
      return 'saga';
  }
}

const cases: Case[] = [
  'list users',
  'save form',
  'autocomplete',
  'checkout wizard',
  'polling',
  'race timeout',
];

cases.forEach((c) => {
  console.log(c, '→', choose(c));
});`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Гонка поиска на createAsyncThunk"
      lead="React + TypeScript + RTK: async уводим из reducer. Thunk проще; отмена как у saga — через AbortSignal / takeLatest."
      problem={
        <Provider store={store}>
          <SearchLabInner />
        </Provider>
      }
      code={code}
    />
  )
}
