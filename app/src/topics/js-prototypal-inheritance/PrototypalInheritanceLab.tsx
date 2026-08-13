import { useMemo, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function PrototypalInheritanceLab() {
  const { lines, log, clear } = useLabLog()
  const animal = useMemo(
    () => ({
      kind: 'animal',
      speak() {
        return `${this.kind} sound`
      },
    }),
    [],
  )
  const [dogName, setDogName] = useState('Rex')

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Есть общий «животный» поведение. Нужна собака, которая говорит по-своему, но умеет и общее —
        без <code>class</code>, через <code>Object.create</code>.
      </p>
      <ol className={shell.steps}>
        <li>Создайте объект с прототипом animal.</li>
        <li>Задайте свой <code>kind</code> / имя.</li>
        <li>Вызовите унаследованный метод.</li>
      </ol>
      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => {
            const dog = Object.create(animal) as { kind: string; name?: string; speak: () => string }
            dog.kind = 'dog'
            dog.name = dogName
            log('ok', `${dog.name}: ${dog.speak()} (proto kind was animal)`)
          }}
        >
          Object.create(animal)
        </LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <div className={shell.field}>
        <span>кличка</span>
        <input value={dogName} onChange={(e) => setDogName(e.target.value)} />
      </div>
      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const dog = Object.create(animal)
            log('info', `getPrototypeOf(dog)===animal → ${Object.getPrototypeOf(dog) === animal}`)
          }}
        >
          Проверить прототип
        </LabButton>
        <LabButton
          onClick={() => {
            const dog = Object.create(animal) as { speak: () => string; speakLoud?: () => string }
            dog.speakLoud = function () {
              return this.speak().toUpperCase()
            }
            log('info', dog.speakLoud())
          }}
        >
          Добавить свой метод
        </LabButton>
        <LabButton onClick={clear}>Очистить</LabButton>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Object.create',
          code: `const animal = { speak() { return this.kind; } };
const dog = Object.create(animal);
dog.kind = 'dog';
dog.speak();`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Собака наследует поведение"
      lead="Прототипное наследование — делегирование через Object.create."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
