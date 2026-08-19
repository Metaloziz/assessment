import { useEffect, useRef, useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '269-browser-web-components'
const ELEMENT_TAG = 'lab-app-button'
const CSS_TAG = 'lab-theme-box'

type CaseId = 'element' | 'css'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'element', label: 'Кастомная кнопка' },
  { id: 'css', label: 'CSS-контракт' },
]

const PAIN = (
  <>
    Браузерный виджет живёт вне React/Vue: свой тег, shadow root, слоты и контролируемая
    стилизация через переменные и <code>::part</code>.
  </>
)

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  element: (
    <>
      Регистрируем <code>{ELEMENT_TAG}</code>: в shadow — свой <code>&lt;button&gt;</code> со
      стилями, снаружи — только текст в слоте и атрибут <code>disabled</code>.
    </>
  ),
  css: (
    <>
      Внутри shadow — <code>:host</code> и <code>part</code>; снаружи тема задаёт{' '}
      <code>--accent</code> и <code>::part(title)</code> без пробития инкапсуляции.
    </>
  ),

}

function ensureAppButton() {
  if (customElements.get(ELEMENT_TAG)) return
  class AppButton extends HTMLElement {
    static observedAttributes = ['disabled']
    private btn: HTMLButtonElement | null = null

    constructor() {
      super()
      const tpl = document.createElement('template')
      tpl.innerHTML = `
        <style>
          :host {
            display: inline-block;
            --btn-bg: var(--app-btn-bg, #5b7cfa);
            --btn-color: var(--app-btn-color, #fff);
          }
          :host([disabled]) { opacity: 0.55; pointer-events: none; }
          button {
            all: unset;
            box-sizing: border-box;
            cursor: pointer;
            font: inherit;
            padding: 0.45rem 0.95rem;
            border-radius: 8px;
            background: var(--btn-bg);
            color: var(--btn-color);
            font-weight: 600;
          }
          button:focus-visible {
            outline: 2px solid var(--btn-bg);
            outline-offset: 2px;
          }
          button:active { transform: translateY(1px); }
        </style>
        <button part="control" type="button"><slot></slot></button>
      `
      const root = this.attachShadow({ mode: 'open' })
      root.append(tpl.content.cloneNode(true))
      this.btn = root.querySelector('button')
    }

    attributeChangedCallback(name: string, _o: string | null, value: string | null) {
      if (name === 'disabled' && this.btn) {
        this.btn.disabled = value !== null
      }
    }

    connectedCallback() {
      this.btn?.addEventListener('click', this.onClick)
    }

    disconnectedCallback() {
      this.btn?.removeEventListener('click', this.onClick)
    }

    private onClick = () => {
      console.log(`${ELEMENT_TAG}: click`)
    }
  }
  customElements.define(ELEMENT_TAG, AppButton)
}

function ensureThemeBox() {
  if (customElements.get(CSS_TAG)) return
  class ThemeBox extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' }).innerHTML = `
        <style>
          :host {
            display: block;
            color: var(--accent, #7ec699);
            border: 1px solid var(--accent-border, #444);
            border-radius: 8px;
            padding: 0.55rem 0.7rem;
          }
          [part="title"] { font-weight: 700; margin: 0 0 0.35rem; }
          ::slotted(p) { margin: 0; }
        </style>
        <section>
          <h2 part="title"><slot name="title"></slot></h2>
          <slot></slot>
        </section>
      `
    }
  }
  customElements.define(CSS_TAG, ThemeBox)
}

const CODE_INTRO: Record<CaseId, string> = {
  element:
    'Кастомная кнопка: `<template>` + shadow root, свои стили внутри и текст снаружи через `<slot>`.',
  css: 'CSS в shadow: `:host`, переменные, `part` и `::slotted` — публичный контракт стилизации.',
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  element: [
    {
      id: 'define-button',
      label: 'src/widgets/appButton.ts',
      note: 'В shadow — настоящий `<button>` со своими стилями; глобальный CSS страницы его не ломает.',
      executable: false,
      languageLabel: 'ts',
      code: `class AppButton extends HTMLElement {
  static observedAttributes = ['disabled'];

  constructor() {
    super();
    const tpl = document.querySelector('#btn-tpl') as HTMLTemplateElement;
    const root = this.attachShadow({ mode: 'open' });
    root.append(tpl.content.cloneNode(true)); // ← template → shadow
    this.btn = root.querySelector('button')!;
  }

  attributeChangedCallback(name: string, _o: string | null, value: string | null) {
    if (name === 'disabled') this.btn.disabled = value !== null;
  }

  connectedCallback() {
    this.btn.addEventListener('click', () => console.log('click'));
  }
}

customElements.define('app-button', AppButton); // ← имя с дефисом`,
    },
    {
      id: 'button-template',
      label: 'src/widgets/appButton.template.html',
      note: 'Стили живут в shadow; снаружи виден только host `<app-button>`.',
      executable: false,
      languageLabel: 'html',
      code: `<template id="btn-tpl">
  <style>
    :host {
      --btn-bg: var(--app-btn-bg, #5b7cfa); /* ← тема снаружи */
      --btn-color: var(--app-btn-color, #fff);
    }
    button {
      all: unset;
      cursor: pointer;
      padding: 0.45rem 0.95rem;
      border-radius: 8px;
      background: var(--btn-bg);
      color: var(--btn-color);
    }
  </style>
  <button part="control" type="button"><slot></slot></button>
</template>`,
    },
    {
      id: 'button-use',
      label: 'src/pages/Checkout.tsx',
      note: 'Текст кнопки — light DOM в default slot; атрибут `disabled` синхронизируется в shadow.',
      executable: false,
      languageLabel: 'html',
      code: `<app-button>Сохранить</app-button>
<app-button disabled>Недоступно</app-button>`,
    },
  ],
  css: [
    {
      id: 'host-part',
      label: 'src/widgets/themeBox.css (inside shadow)',
      note: ':host и part — точки входа для темы снаружи.',
      executable: false,
      languageLabel: 'css',
      code: `:host {
  color: var(--accent, #7ec699); /* ← переменная наследуется в shadow */
}
[part="title"] { font-weight: 700; }
::slotted(p) { margin: 0; } /* ← только прямой slotted child */`,
    },
    {
      id: 'consumer',
      label: 'src/theme/consumer.css',
      note: 'Снаружи ::part и переменные — без пробития селектором h2 внутри shadow.',
      executable: false,
      languageLabel: 'css',
      code: `theme-box {
  --accent: #c084fc;
}
theme-box::part(title) {
  text-transform: uppercase; /* ← явный контракт */
}`,
    },
  ],
}

export function BrowserWebComponentsLab() {
  const { lines, log, clear } = useLabLog()
  const hostRef = useRef<HTMLDivElement>(null)
  const [caseId, setCaseId] = useState<CaseId>('element')
  const [label, setLabel] = useState('Сохранить')
  const [disabled, setDisabled] = useState(false)
  const [accent, setAccent] = useState('#c084fc')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    ensureAppButton()
    ensureThemeBox()
  }, [])

  const selectCase = (next: CaseId) => {
    setCaseId(next)
    hostRef.current && (hostRef.current.innerHTML = '')
    setMounted(false)
    clear()
  }

  const mountElement = () => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    const el = document.createElement(ELEMENT_TAG)
    el.textContent = label
    if (disabled) el.setAttribute('disabled', '')
    host.append(el)
    setMounted(true)
    log('ok', `смонтировали <${ELEMENT_TAG}${disabled ? ' disabled' : ''}>${label}</${ELEMENT_TAG}>`)
  }

  const mountCss = () => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    const style = document.createElement('style')
    style.textContent = `
      ${CSS_TAG} { --accent: ${accent}; --accent-border: ${accent}; }
      ${CSS_TAG}::part(title) { text-transform: uppercase; letter-spacing: 0.04em; }
    `
    const el = document.createElement(CSS_TAG)
    const title = document.createElement('span')
    title.slot = 'title'
    title.textContent = 'Theme box'
    const p = document.createElement('p')
    p.textContent = 'Снаружи заданы --accent и ::part(title).'
    el.append(title, p)
    host.append(style, el)
    setMounted(true)
    log('ok', `смонтировали ${CSS_TAG}; --accent=${accent}`)
  }

  const run = () => {
    clear()
    if (caseId === 'element') mountElement()
    else mountCss()
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((item) => (
          <LabButton
            key={item.id}
            variant="ghost"
            size="sm"
            active={caseId === item.id}
            onClick={() => selectCase(item.id)}
          >
            {item.label}
          </LabButton>
        ))}
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <div className={shell.row}>
        {caseId === 'element' ? (
          <>
            <label className={shell.field}>
              <span>текст</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className={shell.field}>
              <span>disabled</span>
              <input
                type="checkbox"
                checked={disabled}
                onChange={(e) => setDisabled(e.target.checked)}
              />
            </label>
          </>
        ) : (
          <label className={shell.field}>
            <span>--accent</span>
            <input value={accent} onChange={(e) => setAccent(e.target.value)} />
          </label>
        )}
        <LabButton variant="primary" onClick={run}>
          Смонтировать
        </LabButton>
        {caseId === 'element' ? (
          <LabButton
            variant="secondary"
            disabled={!mounted}
            onClick={() => {
              const el = hostRef.current?.querySelector(ELEMENT_TAG)
              if (!el) return
              if (disabled) el.setAttribute('disabled', '')
              else el.removeAttribute('disabled')
              el.textContent = label
              log('ok', `обновили: text="${label}", disabled=${disabled}`)
            }}
          >
            Обновить кнопку
          </LabButton>
        ) : (
          <LabButton
            variant="secondary"
            disabled={!mounted}
            onClick={() => {
              run()
              log('ok', `обновили тему → ${accent}`)
            }}
          >
            Обновить тему
          </LabButton>
        )}
        <LabButton
          variant="secondary"
          disabled={!mounted}
          onClick={() => {
            hostRef.current && (hostRef.current.innerHTML = '')
            setMounted(false)
            log('info', 'убрали из DOM (disconnectedCallback в консоли)')
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
      intro={CODE_INTRO[caseId]}
      snippets={CODE_SNIPPETS[caseId]}
    />
  )

  return (
    <JsLabShell
      title="Web Components в браузере"
      lead="Кастомная кнопка в shadow, CSS-контракт и template/slots — живой стенд двух кейсов."
      problem={problem}
      code={code}
    />
  )
}
