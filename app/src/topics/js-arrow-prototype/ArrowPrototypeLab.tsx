import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function ArrowPrototypeLab() {
  const { lines, log, clear } = useLabLog()

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Хотели сделать «класс» через стрелку: <code>new Arrow()</code> — и сразу TypeError. Нужно
        понять, чем стрелка отличается от обычной функции-конструктора.
      </p>
      <ol className={shell.steps}>
        <li>Попробуйте вызвать стрелку через <code>new</code>.</li>
        <li>Сравните наличие <code>prototype</code> у обычной функции.</li>
        <li>Для конструкторов используйте <code>function</code> или <code>class</code>.</li>
      </ol>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const Arrow = () => ({ ok: true })
            try {
              // @ts-expect-error intentional
              new Arrow()
              log('err', 'unexpected success')
            } catch (e) {
              log('err', `new Arrow() → ${e instanceof Error ? e.message : String(e)}`)
            }
          }}
        >
          new Arrow()
        </button>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            function Ctor(this: { ok: boolean }) {
              this.ok = true
            }
            const Arrow = () => undefined
            const instance = new (Ctor as unknown as new () => { ok: boolean })()
            log(
              'ok',
              `function.prototype? ${Ctor.prototype != null}; arrow.prototype=${String((Arrow as { prototype?: unknown }).prototype)}; new Ctor().ok=${instance.ok}`,
            )
          }}
        >
          Сравнить с function
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const sandbox = (
    <div className={shell.panel}>
      <p className={shell.hint}>Проверьте typeof, prototype и construct.</p>
      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const a = () => 1
            function b() {
              return 1
            }
            log('info', `arrow typeof=${typeof a}, has prototype prop=${Object.hasOwn(a, 'prototype')}`)
            log('info', `fn typeof=${typeof b}, prototype=${typeof b.prototype}`)
          }}
        >
          typeof / prototype
        </button>
        <button type="button" className={shell.btn} onClick={clear}>
          Очистить
        </button>
      </div>
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <LabCodePanel
      snippets={[
        {
          label: 'Стрелка не конструктор',
          code: `const Arrow = () => {};
new Arrow(); // TypeError
Arrow.prototype; // undefined`,
        },
        {
          label: 'Обычная функция',
          code: `function Ctor() {}
new Ctor();
Ctor.prototype; // {}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Стрелку нельзя сделать через new"
      lead="У стрелочной функции нет prototype и [[Construct]]."
      problem={problem}
      sandbox={sandbox}
      code={code}
    />
  )
}
