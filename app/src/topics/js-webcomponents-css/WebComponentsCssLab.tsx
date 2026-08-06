import { useEffect, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '118-js-webcomponents-css'
const TAG = 'lab-notice-box'

function ensureNoticeBox() {
  if (customElements.get(TAG)) return
  class NoticeBox extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host {
            display: block;
            color: var(--notice-color, #7ec699);
            border: 1px solid var(--notice-border, #444);
            border-radius: 8px;
            padding: 0.55rem 0.7rem;
          }
          [part="title"] { font-weight: 700; margin: 0 0 0.35rem; }
          ::slotted(p) { margin: 0; opacity: 0.9; }
        </style>
        <section>
          <h2 part="title"><slot name="title"></slot></h2>
          <slot></slot>
        </section>
      `
    }
  }
  customElements.define(TAG, NoticeBox)
}

export function WebComponentsCssLab() {
  const { lines, log, clear } = useLabLog()
  const hostRef = useRef<HTMLDivElement>(null)
  const [color, setColor] = useState('#c084fc')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    ensureNoticeBox()
  }, [])

  const mount = () => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    const style = document.createElement('style')
    style.textContent = `
      ${TAG} { --notice-color: ${color}; }
      ${TAG}::part(title) { text-transform: uppercase; letter-spacing: 0.04em; }
    `
    const el = document.createElement(TAG)
    const title = document.createElement('span')
    title.slot = 'title'
    title.textContent = 'Внимание'
    const p = document.createElement('p')
    p.textContent = 'Текст в default slot (light DOM).'
    el.append(title, p)
    host.append(style, el)
    setMounted(true)
    log('ok', `смонтировали ${TAG}; --notice-color=${color}; ::part(title)`)
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Виджет в Shadow DOM не должен ломаться от чужого CSS, но теме нужен цвет и акцент на
        заголовке. Откроем контракт: переменная и <code>part</code>.
      </p>
      <ol className={shell.steps}>
        <li>
          Внутри: <code>:host</code> + <code>var(--notice-color)</code> + <code>part=&quot;title&quot;</code>.
        </li>
        <li>
          Снаружи: <code>--notice-color</code> и <code>::part(title)</code>.
        </li>
        <li>
          <code>::slotted(p)</code> трогает только прямой slotted <code>p</code>.
        </li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>--notice-color</span>
          <input value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <LabButton variant="primary" onClick={mount}>
          Смонтировать notice
        </LabButton>
        <LabButton variant="secondary" disabled={!mounted}
          onClick={() => {
            mount()
            log('ok', `обновили тему → ${color}`)
          }}
        >
          Применить цвет
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <div ref={hostRef} className={shell.stage} />
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Стили через shadow: `:host`, CSS variables, `part`. Селекторы страницы внутрь тени не проходят."
      snippets={[
        {
          id: 'host-vars',
          label: ':host + variables',
          code: `const tag = 'css-box-' + Math.random().toString(36).slice(2, 7);
class CssBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = \`
      <style>
        :host { color: var(--box-color, tomato); }
        [part="label"] { font-weight: 700; }
      </style>
      <span part="label">label</span>
    \`;
  }
}
customElements.define(tag, CssBox);
const el = document.createElement(tag);
el.style.setProperty('--box-color', 'deepskyblue');
document.body.append(el);
console.log('part label:', el.shadowRoot.querySelector('[part=label]').textContent);
el.remove();`,
        },
        {
          id: 'slotted',
          label: '::slotted',
          code: `console.log('::slotted(p) стилизует только прямой child <p> в slot');
console.log('::slotted(p span) обычно НЕ дотянется до вложенного span');
console.log('light DOM в slot всё ещё видит CSS страницы');`,
        },
        {
          id: 'part-contract',
          label: 'Контракт ::part',
          code: `console.log('без part внешний селектор не попадёт во внутренний h2');
console.log('part=\"title\" → снаружи component::part(title) { ... }');
console.log('открывайте только то, что готовы поддерживать как API');`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Стилизовать через контракт, не сквозь тень"
      lead="Shadow изолирует CSS; наружу — переменные и ::part. ::slotted только для прямых детей слота."
      problem={problem}
      code={code}
    />
  )
}
