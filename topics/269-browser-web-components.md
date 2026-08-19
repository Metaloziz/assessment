# 1. Тема

**WebComponents · ShadowDom · Custom elements · HTML templates · Особенности работы с CSS**

---

# 2. Главное в одну фразу

Web Components — браузерный набор API для своих HTML-элементов с изолированной разметкой и контролируемым CSS-контрактом: Custom Elements, Shadow DOM, `<template>` и slots.

---

# 3. Суть

> Браузер умеет не только рисовать готовые теги `<button>` и `<input>`, но и регистрировать **свои** — через `customElements.define`. Имя обязано содержать дефис (`user-card`), чтобы не пересечься со стандартными тегами. Класс наследуют от `HTMLElement` и описывают поведение элемента как обычный JS-класс.
>
> Внутри часто поднимают **Shadow DOM** — отдельное «теневое» дерево разметки и стилей. Снаружи виден только host-элемент; внутренности не торчат в light DOM страницы. Это изоляция на уровне браузера, а не CSS-хака вроде BEM. Разметку заготовки берут из `<template>` (клон `content`) или собирают строкой в `attachShadow`.
>
> **Slots** проецируют light DOM детей внутрь shadow: `<slot name="title">` принимает `<span slot="title">` снаружи. Так компонент остаётся «коробкой» с публичным входом для контента, но скрывает реализацию.
>
> **CSS в shadow** не «пробивается» обычными селекторами страницы — это фича. Тему и акценты наружу отдают через CSS-переменные (`var(--token)`), `part="name"` + `::part(name)` и точечный `::slotted()`. `mode: 'closed'` не делает компонент безопасным — только скрывает `shadowRoot` от JS.

---

# 4. Самое главное запомнить

- Custom element: имя с дефисом, `customElements.define`, lifecycle (`connectedCallback`, `disconnectedCallback`).
- Shadow DOM: `attachShadow({ mode: 'open' })`, изоляция дерева и стилей.
- `<template>` — заготовка разметки; клонируют через `template.content.cloneNode(true)`.
- `<slot>` — проекция light DOM; default slot без `name`.
- CSS: `:host`, переменные, `::part`, `::slotted` — публичный контракт стилизации.
- Атрибуты строковые; свойства — любой JS-тип; синхронизацию проектируют явно.

| API | Зачем |
| --- | --- |
| `customElements.define` | регистрация тега |
| `attachShadow` | изолированное дерево |
| `<template>` | переиспользуемая разметка |
| `<slot>` | контент снаружи внутрь |
| `::part` / CSS variables | тема без взлома инкапсуляции |

---

# 5. Описание

## Три слоя браузерного API

```text
Custom Elements  — define('my-widget', Class) + lifecycle
Shadow DOM       — attachShadow, изоляция DOM/CSS
template + slot  — заготовка разметки + проекция light DOM
```

## Минимальный виджет с template

```html
<template id="card-tpl">
  <style>
    :host { display: block; border: 1px solid #ccc; border-radius: 8px; padding: 0.5rem; }
    [part="title"] { font-weight: 700; }
  </style>
  <article>
    <h2 part="title"><slot name="title"></slot></h2>
    <slot></slot>
  </article>
</template>
```

```js
class InfoCard extends HTMLElement {
  constructor() {
    super();
    const tpl = document.getElementById('card-tpl');
    const root = this.attachShadow({ mode: 'open' });
    root.append(tpl.content.cloneNode(true));
  }

  connectedCallback() {
    // подписки, fetch, ResizeObserver — когда элемент в документе
  }

  disconnectedCallback() {
    // снять слушатели
  }
}

customElements.define('info-card', InfoCard);
```

```html
<info-card>
  <span slot="title">Заголовок</span>
  <p>Текст в default slot</p>
</info-card>
```

## Shadow DOM и CSS-контракт

```text
Страница CSS ──✗──► внутренности shadow (обычные селекторы)
Страница ──var(--accent)──► наследуется внутрь shadow
Страница ──::part(title)──► только объявленный part
Компонент ──::slotted(p)──► прямой child в slot
```

Потребитель темы:

```css
info-card {
  --accent: #6b4eff;
}
info-card::part(title) {
  color: var(--accent);
  text-transform: uppercase;
}
```

Без `part` селектор `info-card h2 { … }` **не** попадёт во внутренний `h2` — это изоляция, а не баг.

## Атрибут vs свойство

| | Атрибут | Свойство |
| --- | --- | --- |
| Тип | строка в HTML | любой JS-тип |
| Видимость | в разметке | в JS |
| Реакция | `observedAttributes` + `attributeChangedCallback` | обычный setter/getter |

## Lifecycle

```text
constructor           → shadow + template (элемент может быть вне document)
append в DOM          → connectedCallback
setAttribute          → attributeChangedCallback (если в observedAttributes)
remove из DOM         → disconnectedCallback
```

`constructor` — не место для сетевых запросов и обхода light DOM детей.

## Где это в DevTools

Elements → выбранный custom element → `#shadow-root (open)` — дерево shadow, стили, slots. Application не нужен; это чисто DOM/CSS API браузера.

---

# 6. Ссылки

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN: Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)
- [MDN: CSS scoping](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scoping)
