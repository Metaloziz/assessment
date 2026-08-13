import { useMemo, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

type Person = { name: string }

function introduce(this: Person, greeting: string, punctuation: string) {
  return `${greeting}, ${this.name}${punctuation}`
}

export function BindCallApplyLab() {
  const { lines, log, clear } = useLabLog(60)
  const [name, setName] = useState('Лена')
  const [greeting, setGreeting] = useState('Привет')
  const [punctuation, setPunctuation] = useState('!')
  const [boundReady, setBoundReady] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const boundRef = useRef<((punc: string) => string) | null>(null)

  const person = useMemo<Person>(() => ({ name }), [name])
  const other = useMemo<Person>(() => ({ name: 'Игорь' }), [])

  const stopInterval = () => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      log('info', 'setInterval остановлен')
    }
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужно поздороваться от имени пользователя. Метод <code>introduce</code> читает{' '}
        <code>this.name</code>. Его передали в таймер «как есть» — имя пропало, в логе мусор или
        ошибка. Надо явно подставить контекст.
      </p>
      <ol className={shell.steps}>
        <li>
          Шаг 1 — оторвите метод: сохраните <code>const fn = introduce</code> и вызовите без объекта.
        </li>
        <li>
          Шаг 2 — разовый вызов: <code>call(person, greeting, &apos;!&apos;)</code> и{' '}
          <code>apply(person, [greeting, &apos;.&apos;])</code> (у apply аргументы массивом).
        </li>
        <li>
          Шаг 3 — для таймера: <code>bind(person, greeting)</code>, затем крутите связанную функцию в{' '}
          <code>setInterval</code>.
        </li>
      </ol>

      <div className={shell.row}>
        <span className={shell.badge}>person.name = {person.name}</span>
      </div>

      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const fn = introduce as (greeting: string, punctuation: string) => string
            try {
              const result = fn('Привет', '!')
              log('err', `оторванный вызов → ${result}`)
            } catch (e) {
              log('err', `оторванный вызов: ${e instanceof Error ? e.message : String(e)}`)
            }
            log('info', 'без объекта слева от точки this больше не person')
          }}
        >
          1. Сломать (оторвать метод)
        </LabButton>
      </div>

      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            const viaCall = introduce.call(person, greeting, '!')
            log('ok', `call(person, '${greeting}', '!') → ${viaCall}`)
          }}
        >
          2a. call(person, a, b)
        </LabButton>
        <LabButton
          variant="primary"
          onClick={() => {
            const args: [string, string] = [greeting, '.']
            const viaApply = introduce.apply(person, args)
            log('ok', `apply(person, ['${greeting}', '.']) → ${viaApply}`)
          }}
        >
          2b. apply(person, [a, b])
        </LabButton>
      </div>

      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            stopInterval()
            const bound = introduce.bind(person, greeting)
            boundRef.current = bound
            setBoundReady(true)
            let n = 0
            intervalRef.current = window.setInterval(() => {
              n += 1
              log('ok', `interval #${n}: ${bound('!')}`)
            }, 900)
            log('info', `bind(person, '${greeting}') → функция для setInterval`)
          }}
        >
          3. bind + setInterval
        </LabButton>
        <LabButton onClick={stopInterval}>Стоп interval</LabButton>
      </div>

      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>
        Крутите контекст и аргументы. Смотрите: <code>call</code> — список, <code>apply</code> —
        массив, <code>bind</code> — новая функция. Стрелка <code>this</code> не меняет.
      </p>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>this.name (person)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={shell.field}>
          <span>greeting</span>
          <input value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        </label>
        <label className={shell.field}>
          <span>punctuation</span>
          <input value={punctuation} onChange={(e) => setPunctuation(e.target.value)} maxLength={3} />
        </label>
      </div>

      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const result = introduce.call(person, greeting, punctuation)
            log('ok', `call → ${result}`)
          }}
        >
          call(person, …)
        </LabButton>
        <LabButton
          onClick={() => {
            const result = introduce.apply(person, [greeting, punctuation])
            log('ok', `apply → ${result}`)
          }}
        >
          apply(person, […])
        </LabButton>
        <LabButton
          onClick={() => {
            const result = introduce.call(other, greeting, punctuation)
            log('ok', `call(other={name:'Игорь'}) → ${result}`)
          }}
        >
          call(другой this)
        </LabButton>
      </div>

      <div className={shell.row}>
        <LabButton
          onClick={() => {
            boundRef.current = introduce.bind(person, greeting)
            setBoundReady(true)
            log('info', `создали bound = introduce.bind(person, '${greeting}')`)
          }}
        >
          bind(person, greeting)
        </LabButton>
        <LabButton
          disabled={!boundReady || !boundRef.current}
          onClick={() => {
            const fn = boundRef.current
            if (!fn) return
            log('ok', `bound('${punctuation}') → ${fn(punctuation)}`)
          }}
        >
          Вызвать bound(punctuation)
        </LabButton>
        <LabButton
          onClick={() => {
            // Частичное применение: greeting уже в bind, punctuation позже
            const greet = introduce.bind(person, greeting)
            log('ok', `частичный bind: greet('?') → ${greet('?')}`)
          }}
        >
          Частичный bind
        </LabButton>
      </div>

      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const bad = {
              name: 'Объект',
              say: () => `привет, ${bad.name}`,
            }
            const detached = bad.say
            log('info', `стрелка-метод оторвана: ${detached()}`)
            log(
              'info',
              'у стрелки call/apply/bind не меняют this — для подмены нужна обычная function',
            )
          }}
        >
          Ловушка: стрелка
        </LabButton>
        <LabButton
          onClick={() => {
            const args = [greeting, punctuation] as [string, string]
            log('info', `массив args = ${JSON.stringify(args)}`)
            log('ok', `то же через call+spread: ${introduce.call(person, ...args)}`)
            log('ok', `то же через apply: ${introduce.apply(person, args)}`)
          }}
        >
          apply vs call+…args
        </LabButton>
        <LabButton onClick={clear}>Очистить лог</LabButton>
      </div>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      intro="Одна функция — три способа задать this. Разница call и apply только в форме аргументов."
      snippets={[
        {
          label: 'Сигнатура',
          code: `fn.call(thisArg, a, b)      // аргументы списком
fn.apply(thisArg, [a, b])  // аргументы одним массивом
fn.bind(thisArg, a)        // новая функция, this закреплён`,
        },
        {
          label: 'Пример из теории',
          code: `function introduce(greeting, punctuation) {
  return \`\${greeting}, \${this.name}\${punctuation}\`;
}

const person = { name: 'Лена' };

introduce.call(person, 'Привет', '!');
introduce.apply(person, ['Здравствуйте', '.']);

const greetLena = introduce.bind(person, 'Привет');
greetLena('!'); // Привет, Лена!`,
        },
        {
          label: 'Колбэк не теряет this',
          code: `const tick = introduce.bind(person, 'Тик');
setInterval(() => tick('!'), 1000);

// или
setInterval(introduce.bind(person, 'Тик', '!'), 1000);`,
        },
        {
          label: 'Ловушка со стрелкой',
          note: 'call / apply / bind не подменяют this у стрелочной функции.',
          code: `const arrow = () => this.name;
arrow.call({ name: 'Лена' }); // this всё равно внешний`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Метод потерял объект"
      lead="call и apply вызывают сразу с нужным this; у apply второй аргумент — массив. bind отдаёт функцию, которую можно безопасно отдать в таймер."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
