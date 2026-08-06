# 1. Тема

**Web Components:** Custom Elements · Shadow DOM · `<template>` / slots · lifecycle · атрибуты vs свойства

---

# 2. Главное в одну фразу

Web Components — нативный способ сделать свой HTML-элемент с поведением и изолированной внутренней разметкой: Custom Elements, Shadow DOM и templates.

---

# 3. Суть

> Web Components позволяют зарегистрировать свой тег (с дефисом) и описать его класс на `HTMLElement`. Внутри часто поднимают Shadow DOM — «тень», куда кладут разметку и стили компонента.
>
> Так виджеты и куски дизайн-системы живут без привязки к React/Vue: достаточно браузера. Ценность не в «красивом теге», а в публичном контракте: атрибуты, свойства, события, слоты.
>
> Регистрируют через `customElements.define`. Структуру собирают в `constructor`, а работу с документом и подписки — в `connectedCallback` / снимают в `disconnectedCallback`. Атрибуты строковые; свойства могут быть объектами — синхронизацию проектируют явно.

---

# 4. Самое главное запомнить

- Имя custom element обязано содержать дефис: `user-card`.
- `connectedCallback` / `disconnectedCallback` — подключение и очистка.
- `observedAttributes` + `attributeChangedCallback` — реакция на атрибуты.
- Shadow DOM: `mode: 'open'` даёт `element.shadowRoot`; `closed` — не security.
- `<slot>` проецирует light DOM; снаружи не лезут во внутренности без контракта (`part`, CSS variables — см. тему про CSS).

---

# 5. Описание

## Три опоры

```text
Custom Elements  — класс + define('my-el', Class)
Shadow DOM       — изоляция дерева и (частично) стилей
template / slot  — заготовка разметки и проекция внешнего контента
```

## Минимальный элемент

```js
class UserCard extends HTMLElement {
  static observedAttributes = ['name'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <article>
        <strong id="name"></strong>
        <slot></slot>
      </article>
    `;
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'name') {
      this.shadowRoot.getElementById('name').textContent = value ?? '';
    }
  }

  connectedCallback() {
    // подписки, ResizeObserver, fetch — здесь, не в constructor
  }

  disconnectedCallback() {
    // снять слушатели / таймеры
  }
}

customElements.define('user-card', UserCard);
```

```html
<user-card name="Ада">доп. контент в default slot</user-card>
```

## Lifecycle (упрощённо)

```text
new UserCard()     → constructor (ещё может не быть в документе)
append в DOM       → connectedCallback
setAttribute       → attributeChangedCallback (если в observedAttributes)
remove из DOM      → disconnectedCallback
```

`constructor` — не для сети и не для обхода light DOM детей: элемент могут создать до вставки.

## Атрибут vs свойство

| | Атрибут | Свойство |
| --- | --- | --- |
| Тип | строка (в HTML) | любой JS-тип |
| Видимость | в разметке | в JS |
| Пример | `name="Ada"` | `el.user = { id: 1 }` |

Если нужен двусторонний API — сами решаете, пишет ли `set name` в атрибут и наоборот.

---

# 6. Ссылки

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
