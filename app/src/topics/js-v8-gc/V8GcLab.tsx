import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '111-js-v8-gc'

/** Имитация «корня»: пока ссылка жива — объект достижим. */
type Retained = { id: number; payload: number[] }

export function V8GcLab() {
  const { lines, log, clear } = useLabLog()
  const [session, setSession] = useState<Retained | null>(null)
  const [cache, setCache] = useState<Map<string, Retained>>(() => new Map())
  const [nextId, setNextId] = useState(1)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Страница «тяжелеет» со временем: данные уже не нужны, но память не отпускает. Сборщик V8
        удаляет только то, до чего нельзя дойти от корней — если ссылка жива, объект остаётся.
      </p>
      <ol className={shell.steps}>
        <li>Создали большой объект и держим на него ссылку — он достижим.</li>
        <li>
          Обнулили ссылку (<code>session = null</code>) — кандидат на сборку (момент GC не
          гарантирован).
        </li>
        <li>Безлимитный кэш — типичная утечка: ключи копятся, ссылки не отпускают.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="secondary" onClick={() => {
            const id = nextId
            setNextId(id + 1)
            const obj: Retained = { id, payload: new Array(50_000).fill(id) }
            setSession(obj)
            log('err', `session #${id} жив — достижим от «корня» (state)`)
          }}
        >
          Держать session
        </LabButton>
        <LabButton variant="primary" disabled={!session}
          onClick={() => {
            const id = session?.id
            setSession(null)
            log('ok', `session #${id} = null — больше не достижим (кандидат на GC)`)
          }}
        >
          Отпустить session
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            const id = nextId
            setNextId(id + 1)
            const key = `k${id}`
            const obj: Retained = { id, payload: new Array(20_000).fill(id) }
            setCache((prev) => {
              const next = new Map(prev)
              next.set(key, obj)
              return next
            })
            log('err', `cache.set("${key}") → размер ${cache.size + 1} (ссылки не отпускают)`)
          }}
        >
          Плохо: cache++ без лимита
        </LabButton>
        <LabButton variant="primary" disabled={cache.size === 0}
          onClick={() => {
            const size = cache.size
            setCache(new Map())
            log('ok', `cache.clear() — отпустили ${size} записей`)
          }}
        >
          Очистить кэш
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        Сейчас удерживаем: session {session ? `#${session.id}` : '—'}, записей в cache:{' '}
        <code>{cache.size}</code>
      </p>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Примеры про достижимость и утечки ссылок. `GC` в браузере не вызываем вручную — чиним удерживаемые ссылки."
      snippets={[
        {
          id: 'reachability',
          label: 'Достижимость',
          note: 'Объект жив, пока есть путь от корня. Момент сборки не определён.',
          code: `let session = { payload: new Array(1000).fill(0) };
console.log('достижим:', session.payload.length);

session = null;
console.log('после null — кандидат на GC (когда именно — неизвестно)');`,
        },
        {
          id: 'cache-leak',
          label: 'Безлимитный кэш',
          note: '`Map` без `TTL`/`LRU` держит все значения. Нужен лимит или явная очистка.',
          code: `const cache = new Map();

function remember(key, value) {
  cache.set(key, value);
}

for (let i = 0; i < 5; i++) {
  remember('user:' + i, { blob: new Array(1000).fill(i) });
}
console.log('размер cache:', cache.size);

// исправление: лимит
const MAX = 3;
function rememberLimited(key, value) {
  cache.set(key, value);
  if (cache.size > MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

rememberLimited('user:5', { blob: [] });
rememberLimited('user:6', { blob: [] });
console.log('после лимита:', cache.size, [...cache.keys()]);`,
        },
        {
          id: 'listener-leak',
          label: 'Слушатель и таймер',
          note: 'Забытый `listener`/`interval` удерживает замыкание и всё, что оно захватило.',
          code: `const huge = { data: new Array(5000).fill('x') };

function onTick() {
  // замыкание держит huge
  console.log('tick, data length:', huge.data.length);
}

const id = setInterval(onTick, 1000);
console.log('interval id:', id);

// утечка, пока не снимем:
clearInterval(id);
console.log('clearInterval — отпустили замыкание (huge может стать мусором)');`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Память держится, пока жива ссылка"
      lead="V8 освобождает недостижимые объекты. Чинят утечки ссылок — кэши, слушатели, таймеры — а не «ручной вызов GC»."
      problem={problem}
      code={code}
    />
  )
}
