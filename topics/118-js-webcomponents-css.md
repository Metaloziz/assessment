# 1. Тема

**CSS в Web Components**

---

# 2. Главное в одну фразу

Shadow DOM изолирует CSS компонента, а CSS custom properties, `::part` и `::slotted()` задают контролируемые точки стилизации.

---

# 3. Суть

> Shadow DOM ограничивает область действия CSS: внешние селекторы не попадают во внутреннюю разметку компонента, а внутренние стили не выходят наружу. Это защищает виджет от случайных конфликтов со стилями страницы.
>
> Полная изоляция здесь была бы неудобна: продукту всё равно нужна тема и возможность оформить отдельные части компонента. Поэтому стилизация должна быть частью публичного контракта, а не попыткой пробить границу селекторами.
>
> Компонент принимает CSS-переменные, которые наследуются через границу, и может открыть конкретный внутренний узел атрибутом `part` для `::part()`. Контент в `<slot>` остаётся light DOM, а `::slotted()` выбирает только непосредственно вставленный элемент. `mode: 'closed'` не делает стили или данные безопасными, он лишь скрывает удобный доступ к `shadowRoot`.

---

# 4. Самое главное запомнить

- `:host` выбирает сам custom element изнутри shadow root.
- CSS-переменные — основной публичный API для темы компонента.
- `part="name"` открывает внутренний элемент для внешнего `::part(name)`.
- `::slotted(selector)` стилизует только непосредственные slotted-элементы, не их потомков.
- `adoptedStyleSheets` позволяет переиспользовать один stylesheet в нескольких shadow roots.

---

# 5. Описание

```js
class NoticeBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; color: var(--notice-color, #0a4); }
        [part="title"] { font-weight: 700; }
        ::slotted(p) { margin: 0; }
      </style>
      <section>
        <h2 part="title"><slot name="title"></slot></h2>
        <slot></slot>
      </section>
    `;
  }
}
customElements.define('notice-box', NoticeBox);
```

Потребитель компонента меняет только открытый контракт:

```css
notice-box {
  --notice-color: #8a2be2;
}

notice-box::part(title) {
  text-transform: uppercase;
}
```

`::part` не даёт внешнему CSS доступ к любому внутреннему селектору: его нужно явно объявить. Содержимое slot остаётся light DOM и наследует стили страницы; `::slotted()` не выбирает вложенные элементы. Не применяйте `mode: 'closed'` как механизм безопасности — это лишь скрывает удобную ссылку `shadowRoot`.

---

# 6. Ссылки

- [MDN: CSS scoping](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scoping)
- [MDN: ::part()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part)
- [MDN: ::slotted()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::slotted)
