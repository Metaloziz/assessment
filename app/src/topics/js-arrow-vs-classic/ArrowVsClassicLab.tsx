import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { LabButton } from '../../components/lab/LabButton'
import { LabCodePanel } from '../../components/lab/LabCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

export function ArrowVsClassicLab() {
  const { lines, log, clear } = useLabLog()

  const user = {
    name: 'Anna',
    greetClassic() {
      return this.name
    },
    greetArrow: () => (globalThis as { name?: string }).name,
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Стрелка и обычная <code>function</code> выглядят похоже, но по-разному работают с{' '}
        <code>this</code>. Нажмите кнопки — в логе сразу видно разницу.
      </p>
      <ol className={shell.steps}>
        <li>
          Метод объекта через <code>function</code> — <code>this</code> это сам объект.
        </li>
        <li>Та же логика со стрелкой — <code>this</code> берётся снаружи, имя пропадает.</li>
        <li>
          <code>new</code> со стрелкой бросает ошибку; у обычной функции конструктор работает.
        </li>
      </ol>
      <div className={shell.row}>
        <LabButton
          variant="primary"
          onClick={() => log('ok', `greetClassic() → ${user.greetClassic()}`)}
        >
          Метод: function
        </LabButton>
        <LabButton onClick={() => log('err', `greetArrow() → ${user.greetArrow()}`)}>
          Метод: стрелка
        </LabButton>
      </div>
      <div className={shell.row}>
        <LabButton
          onClick={() => {
            const service = {
              label: 'tick',
              runClassic() {
                const fn = function (this: { label?: string }) {
                  return this?.label
                }
                return fn.call({})
              },
              runArrow() {
                return (() => this.label)()
              },
            }
            log('err', `таймер function → ${service.runClassic()}`)
            log('ok', `таймер стрелка → ${service.runArrow()}`)
          }}
        >
          Колбэк в методе
        </LabButton>
        <LabButton
          onClick={() => {
            function Regular() {}
            const arrow = () => {}
            log('ok', `Regular.prototype → ${Regular.prototype ? '{}' : '—'}`)
            log('info', `arrow.prototype → ${String(arrow.prototype)}`)
            try {
              Reflect.construct(Regular, [])
              log('ok', 'new Regular() → ok')
            } catch (e) {
              log('err', `new Regular() → ${e instanceof Error ? e.message : String(e)}`)
            }
            try {
              Reflect.construct(arrow, [])
              log('ok', 'new arrow() → ok')
            } catch (e) {
              log('err', `new arrow() → ${e instanceof Error ? e.message : String(e)}`)
            }
          }}
        >
          new и prototype
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
          label: 'this в методе',
          code: `const user = {
  name: 'Anna',
  greetClassic() { return this.name; }, // 'Anna'
  greetArrow: () => this?.name,       // не user
};`,
        },
        {
          label: 'new',
          code: `function Regular() {}
const arrow = () => {};

new Regular(); // ok
new arrow();   // TypeError`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Стрелка ≠ function"
      lead="У function this задаёт вызов; у стрелки — внешний контекст. Три кнопки — три контраста."
      problem={problem}
      code={code}
    />
  )
}
