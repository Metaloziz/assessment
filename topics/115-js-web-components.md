# 1. Тема

**Web Components**

---

# 2. Главное в одну фразу

Web Components объединяют Custom Elements, Shadow DOM и templates для создания нативных переиспользуемых браузерных компонентов.

---

# 3. Суть

> Web Components — браузерный способ создать свой HTML-элемент с поведением и изолированной внутренней разметкой. В него входят Custom Elements, Shadow DOM и `<template>`.
>
> Они нужны для переиспользуемых виджетов, которые должны работать без конкретного фреймворка: карточки пользователя, поля ввода или дизайн-системы. Главная ценность не в новом теге, а в ясном публичном контракте компонента.
>
> Класс элемента регистрируют через `customElements.define()`. В конструкторе создают внутреннюю структуру, а в `connectedCallback` подключают работу, зависящую от документа; в `disconnectedCallback` очищают подписки. Атрибуты строковые и видны в HTML, свойства могут хранить объекты, поэтому их синхронизацию и события компонента проектируют явно.

---

# 4. Самое главное запомнить

- В имени custom element обязателен дефис: `user-card`.
- `connectedCallback` вызывается при подключении, `disconnectedCallback` — при удалении.
- `observedAttributes` включает атрибуты для `attributeChangedCallback`.
- `mode: 'open'` даёт `element.shadowRoot`; `closed` не является защитой данных.
- `<slot>` проецирует внешний light DOM в шаблон компонента.

---

# 5. Описание

```js
class UserCard extends HTMLElement {
  static observedAttributes = ['name'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <article><strong id="name"></strong><slot></slot></article>
    `;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'name' && oldValue !== newValue) {
      this.shadowRoot.querySelector('#name').textContent = newValue;
    }
  }
}

customElements.define('user-card', UserCard);
```

`constructor` подходит для создания внутренней структуры, но не для работы с внешними детьми и сетью; элемент может создаваться до подключения к документу. Подписки и очистку обычно размещают в `connectedCallback` и `disconnectedCallback`. Свойства и атрибуты имеют разную природу: атрибут строковый и виден в HTML, свойство может хранить объект; если нужен двусторонний API, синхронизацию проектируют явно.

---

# 6. Ссылки

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
