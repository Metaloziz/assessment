import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '114-js-mixins'

type AnyCtor = new (...args: any[]) => any

function withTimestamp(Base: AnyCtor) {
  return class extends Base {
    createdAt = new Date()
    ageMs() {
      return Date.now() - this.createdAt.getTime()
    }
  }
}

function withLogger(Base: AnyCtor) {
  return class extends Base {
    log(msg: string) {
      return `[${this.title ?? '?'}] ${msg}`
    }
  }
}

class Task {
  title: string
  constructor(title: string) {
    this.title = title
  }
}

const TimedTask = withTimestamp(Task)
const LoggedTimedTask = withLogger(withTimestamp(Task))

export function MixinsLab() {
  const { lines, log, clear } = useLabLog()
  const [task, setTask] = useState<InstanceType<typeof LoggedTimedTask> | null>(null)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужны timestamp и лог у задачи, но плодить глубокое <code>extends</code> ради двух методов
        жалко. Подмешаем поведение через class factory.
      </p>
      <ol className={shell.steps}>
        <li>
          <code>withTimestamp(Base)</code> → <code>class extends Base</code>.
        </li>
        <li>
          Стек: <code>withLogger(withTimestamp(Task))</code>.
        </li>
        <li>Конфликт имён и толстые зависимости — лучше сервис, не mixin.</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => {
            const t = new LoggedTimedTask('Купить хлеб')
            setTask(t)
            log('ok', `LoggedTimedTask: title=${t.title}`)
            log('ok', `ageMs()≈${t.ageMs()}ms`)
            log('ok', t.log('готово'))
          }}
        >
          Собрать Task + mixins
        </LabButton>
        <LabButton variant="secondary" disabled={!task}
          onClick={() => {
            if (!task) return
            log('ok', `ageMs()≈${task.ageMs()}ms; ${task.log('тик')}`)
          }}
        >
          Проверить ageMs / log
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            const onlyTime = new TimedTask('Без логгера')
            log('info', `только timestamp: ageMs≈${onlyTime.ageMs()}, log? ${'log' in onlyTime}`)
          }}
        >
          Только timestamp
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Примеси как class factory и `applyMixin`. Смотрите цепочку `extends` и конфликты имён."
      snippets={[
        {
          id: 'factory',
          label: 'withTimestamp(Base)',
          code: `const withTimestamp = (Base) =>
  class extends Base {
    createdAt = new Date();
    ageMs() {
      return Date.now() - this.createdAt.getTime();
    }
  };

class Task {
  constructor(title) {
    this.title = title;
  }
}

class TimedTask extends withTimestamp(Task) {}
const t = new TimedTask('demo');
console.log(t.title, t.ageMs() >= 0);`,
        },
        {
          id: 'stack',
          label: 'Несколько mixins',
          code: `const withTimestamp = (Base) =>
  class extends Base {
    createdAt = Date.now();
  };

const withLogger = (Base) =>
  class extends Base {
    log(msg) {
      return '[' + this.title + '] ' + msg;
    }
  };

class Task {
  constructor(title) {
    this.title = title;
  }
}

const Rich = withLogger(withTimestamp(Task));
const t = new Rich('A');
console.log(t.createdAt, t.log('hi'));`,
        },
        {
          id: 'define',
          label: 'applyMixin + конфликт',
          code: `function applyMixin(target, source) {
  for (const key of Reflect.ownKeys(source)) {
    if (key === 'constructor') continue;
    if (key in target) throw new Error('Конфликт: ' + String(key));
    Object.defineProperty(
      target,
      key,
      Object.getOwnPropertyDescriptor(source, key),
    );
  }
}

try {
  applyMixin({ greet() { return 'hi'; } }, { greet() { return 'yo'; } });
} catch (err) {
  console.log(err.message);
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Подмешать поведение, не плодя иерархию"
      lead="Mixin-class-factory добавляет методы через extends; следите за this-контрактом и конфликтами имён."
      problem={problem}
      code={code}
    />
  )
}
