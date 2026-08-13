import { useMemo, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

function makeCounter() {
  let count = 0
  return () => ++count
}

export function LexicalEnvironmentLab() {
  const { lines, log, clear } = useLabLog()
  const [first] = useState(() => makeCounter())
  const [second] = useState(() => makeCounter())
  const [sharedTick, setSharedTick] = useState(0)

  const brokenShared = useMemo(() => {
    let count = 0
    return {
      bumpA: () => ++count,
      bumpB: () => ++count,
      peek: () => count,
    }
  }, [])

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Сделали «счётчик кликов», вызвали фабрику дважды — а оба счётчика крутят одно и то же число.
        Нужны два независимых счётчика.
      </p>
      <ol className={shell.steps}>
        <li>Создайте фабрику, которая замыкает свой <code>count</code>.</li>
        <li>Каждый вызов фабрики — новое окружение.</li>
        <li>Проверьте: первый счётчик на 3, второй всё ещё на 0.</li>
      </ol>
      <div className={shell.row}>
        <LabButton onClick={() => log('info', `shared A → ${brokenShared.bumpA()}`)}>
          Сломанный: bump A
        </LabButton>
        <LabButton onClick={() => log('info', `shared B → ${brokenShared.bumpB()}`)}>
          Сломанный: bump B
        </LabButton>
        <LabButton
          variant="primary"
          onClick={() => {
            const a = first()
            const b = first()
            const c = second()
            log('ok', `правильно: first=${a}, first=${b}, second=${c}`)
          }}
        >
          Правильные счётчики ×2 / ×1
        </LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Крутите два независимых счётчика и один «общий» — сравните лог.</p>
      <div className={shell.row}>
        <LabButton onClick={() => log('ok', `first → ${first()}`)}>first++</LabButton>
        <LabButton onClick={() => log('ok', `second → ${second()}`)}>second++</LabButton>
        <LabButton
          onClick={() => {
            setSharedTick((n) => n + 1)
            log('info', `shared.peek после bumpA → ${brokenShared.bumpA()} (tick ${sharedTick + 1})`)
          }}
        >
          shared bump
        </LabButton>
        <LabButton onClick={clear}>Очистить лог</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      intro="Замыкание держит ссылку на переменную окружения, а не снимок числа."
      snippets={[
        {
          label: 'Фабрика с отдельным окружением',
          code: `function makeCounter() {
  let count = 0;
  return () => ++count;
}

const a = makeCounter();
const b = makeCounter();
a(); // 1
b(); // 1 — своё окружение`,
        },
        {
          label: 'Ловушка: один count на двоих',
          code: `let count = 0;
const bumpA = () => ++count;
const bumpB = () => ++count;
// оба меняют одну переменную`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Счётчик, который помнит"
      lead="Фабрика создаёт лексическое окружение; каждый вызов — свой count."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
