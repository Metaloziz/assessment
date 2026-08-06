import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '113-js-class-engine'

class Person {
  constructor(name: string) {
    this.name = name
  }
  name: string
  greet() {
    return `Привет, ${this.name}`
  }
  static from(data: { name: string }) {
    return new this(data.name)
  }
}

class Employee extends Person {
  role: string
  constructor(name: string, role: string) {
    super(name)
    this.role = role
  }
}

export function ClassEngineLab() {
  const { lines, log, clear } = useLabLog()
  const [person, setPerson] = useState<Person | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Кажется, что <code>class</code> — «другая ООП-модель». На деле движок всё ещё кладёт методы на
        прототип и связывает экземпляры через <code>[[Prototype]]</code>. Нужно увидеть это руками:{' '}
        <code>getPrototypeOf</code>, <code>extends</code>, вызов без <code>new</code>.
      </p>
      <ol className={shell.steps}>
        <li>
          Создайте экземпляр — метод <code>greet</code> не свой, он на <code>Person.prototype</code>.
        </li>
        <li>
          <code>Employee extends Person</code> — две цепочки: у объекта и у конструктора.
        </li>
        <li>Вызов класса без <code>new</code> — ошибка (не как у старой function).</li>
      </ol>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => {
            const p = Person.from({ name: 'Ада' })
            setPerson(p)
            log('ok', `Person.from → name=${p.name}`)
            log(
              'ok',
              `getPrototypeOf(p) === Person.prototype → ${Object.getPrototypeOf(p) === Person.prototype}`,
            )
            log('ok', `hasOwnProperty('greet') → ${Object.prototype.hasOwnProperty.call(p, 'greet')}`)
            log('ok', `p.greet() → ${p.greet()}`)
          }}
        >
          Создать Person
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            const e = new Employee('Лиза', 'eng')
            setEmployee(e)
            log('ok', `Employee → ${e.name}, role=${e.role}`)
            log(
              'ok',
              `прототип экземпляра → Employee.prototype? ${Object.getPrototypeOf(e) === Employee.prototype}`,
            )
            log(
              'ok',
              `Employee.prototype → Person.prototype? ${Object.getPrototypeOf(Employee.prototype) === Person.prototype}`,
            )
            log(
              'ok',
              `getPrototypeOf(Employee) === Person? ${Object.getPrototypeOf(Employee) === Person}`,
            )
          }}
        >
          Employee extends Person
        </LabButton>
        <LabButton variant="secondary" onClick={() => {
            try {
              // @ts-expect-error демонстрация вызова без new
              Person()
              log('err', 'неожиданно вызвалось без new')
            } catch (err) {
              log(
                'err',
                `без new: ${err instanceof Error ? err.message : String(err)}`,
              )
            }
          }}
        >
          Вызвать Person() без new
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        Сейчас: Person {person ? `«${person.name}»` : '—'}, Employee{' '}
        {employee ? `«${employee.name}/${employee.role}»` : '—'}
      </p>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Смотрите прототипные связи класса так, как их видит движок: `prototype`, `getPrototypeOf`, `extends`, `new`."
      snippets={[
        {
          id: 'prototype',
          label: 'Конструктор + prototype',
          code: `class Person {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return 'Привет, ' + this.name;
  }
}

const user = new Person('Ада');
console.log(Object.getPrototypeOf(user) === Person.prototype);
console.log(Object.prototype.hasOwnProperty.call(user, 'greet')); // false
console.log(user.greet());
console.log(Object.getOwnPropertyDescriptor(Person.prototype, 'greet').enumerable);`,
        },
        {
          id: 'extends',
          label: 'Две цепочки extends',
          code: `class Person {
  constructor(name) { this.name = name; }
  greet() { return this.name; }
}

class Employee extends Person {
  constructor(name, role) {
    super(name);
    this.role = role;
  }
}

const e = new Employee('Лиза', 'eng');
console.log(Object.getPrototypeOf(e) === Employee.prototype);
console.log(Object.getPrototypeOf(Employee.prototype) === Person.prototype);
console.log(Object.getPrototypeOf(Employee) === Person);
console.log(e.greet());`,
        },
        {
          id: 'new-only',
          label: 'Только через new',
          code: `class Counter {
  constructor() { this.n = 0; }
}

try {
  Counter();
} catch (err) {
  console.log('без new:', err.name, err.message);
}

const c = new Counter();
console.log('с new:', c.n);`,
        },
        {
          id: 'super-order',
          label: 'this до super',
          note: 'В конструкторе наследника `this` недоступен до `super(...)`.',
          code: `class Base {
  constructor() { this.ready = true; }
}

class Bad extends Base {
  constructor() {
    try {
      console.log(this);
    } catch (err) {
      console.log('до super:', err.message);
    }
    super();
    console.log('после super ready=', this.ready);
  }
}

new Bad();`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Класс = конструктор + прототип (с жёсткой семантикой)"
      lead="Движок связывает экземпляры с Class.prototype; extends строит две цепочки; без new класс не вызвать."
      problem={problem}
      code={code}
    />
  )
}
