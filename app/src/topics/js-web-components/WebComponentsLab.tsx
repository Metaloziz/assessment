import { useEffect, useRef, useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '115-js-web-components'
const TAG = 'lab-user-card'

function ensureUserCard() {
  if (customElements.get(TAG)) return
  class UserCard extends HTMLElement {
    static observedAttributes = ['name']
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host { display: block; padding: 0.4rem 0.55rem; border: 1px dashed #555; border-radius: 6px; }
          #name { font-weight: 700; }
        </style>
        <article>
          <div id="name"></div>
          <slot></slot>
        </article>
      `
    }
    attributeChangedCallback(name: string, _o: string | null, value: string | null) {
      if (name === 'name') {
        const el = this.shadowRoot?.getElementById('name')
        if (el) el.textContent = value ?? ''
      }
    }
  }
  customElements.define(TAG, UserCard)
}

export function WebComponentsLab() {
  const { lines, log, clear } = useLabLog()
  const hostRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('Ада')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    ensureUserCard()
  }, [])

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Нужен виджет «карточка», который работает без React: свой тег, тень с разметкой, имя из
        атрибута и слот для доп. текста. Собираем минимальный Web Component.
      </p>
      <ol className={shell.steps}>
        <li>
          Имя с дефисом: <code>{TAG}</code>, класс на <code>HTMLElement</code>.
        </li>
        <li>
          Shadow DOM + <code>observedAttributes</code> обновляют <code>#name</code>.
        </li>
        <li>Слот показывает light DOM детей.</li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <LabButton variant="primary" onClick={() => {
            const host = hostRef.current
            if (!host) return
            host.innerHTML = ''
            const el = document.createElement(TAG)
            el.setAttribute('name', name)
            el.textContent = 'Контент в default slot'
            host.append(el)
            setMounted(true)
            log('ok', `смонтировали <${TAG} name="${name}">`)
          }}
        >
          Смонтировать
        </LabButton>
        <LabButton variant="secondary" disabled={!mounted}
          onClick={() => {
            const el = hostRef.current?.querySelector(TAG)
            el?.setAttribute('name', name)
            log('ok', `attribute name → "${name}"`)
          }}
        >
          Обновить атрибут
        </LabButton>
        <LabButton variant="secondary" disabled={!mounted}
          onClick={() => {
            hostRef.current && (hostRef.current.innerHTML = '')
            setMounted(false)
            log('info', 'удалили из DOM (был бы disconnectedCallback)')
          }}
        >
          Убрать из DOM
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
      intro="`Custom Elements` API в сниппетах. `define` с уже занятым именем бросит ошибку — в лабе тег уникален."
      snippets={[
        {
          id: 'define',
          label: 'define + shadow',
          code: `class DemoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<b part="title">ok</b><slot></slot>';
  }
}
const tag = 'demo-card-' + Math.random().toString(36).slice(2, 7);
customElements.define(tag, DemoCard);
const el = document.createElement(tag);
el.textContent = 'slot text';
console.log(tag, el.shadowRoot.querySelector('b').textContent);
console.log('slot content:', el.textContent);`,
        },
        {
          id: 'attrs',
          label: 'observedAttributes',
          code: `class Named extends HTMLElement {
  static observedAttributes = ['name'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<span id="n"></span>';
  }
  attributeChangedCallback(attr, _o, v) {
    if (attr === 'name') {
      this.shadowRoot.getElementById('n').textContent = v;
      console.log('name →', v);
    }
  }
}
const tag = 'named-el-' + Math.random().toString(36).slice(2, 7);
customElements.define(tag, Named);
const el = document.createElement(tag);
el.setAttribute('name', 'Ada');
el.setAttribute('name', 'Grace');`,
        },
        {
          id: 'lifecycle',
          label: 'connected / disconnected',
          code: `class Probe extends HTMLElement {
  connectedCallback() {
    console.log('connected');
  }
  disconnectedCallback() {
    console.log('disconnected');
  }
}
const tag = 'probe-el-' + Math.random().toString(36).slice(2, 7);
customElements.define(tag, Probe);
const el = document.createElement(tag);
const box = document.createElement('div');
box.append(el);
console.log('после append в div (ещё не в document) — connected может не вызваться');
document.body.append(box);
box.remove();`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Свой HTML-элемент без фреймворка"
      lead="Custom Element + Shadow DOM + slot: регистрируем тег с дефисом и обновляем UI из атрибутов."
      problem={problem}
      code={code}
    />
  )
}
