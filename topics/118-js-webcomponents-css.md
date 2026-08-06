# 1. Тема

**CSS в Web Components:** изоляция Shadow DOM · `:host` · CSS variables · `::part` · `::slotted` · `adoptedStyleSheets`

---

# 2. Главное в одну фразу

Shadow DOM изолирует стили компонента; наружу открывают контролируемый API: CSS-переменные, `::part` и точечный `::slotted()`.

---

# 3. Суть

> Стили внутри shadow root не «вытекают» на страницу, а случайные селекторы страницы не перекрашивают внутренности виджета. Так компонент защищён от конфликтов глобального CSS.
>
> Полная герметичность неудобна: теме и продукту всё равно нужны цвет, отступы, акцент на title. Поэтому стилизация — часть публичного контракта, а не взлом границы селекторами.
>
> Снаружи задают `var(--token)` (наследуются через shadow), открывают узлы через `part` для `::part()`, а slotted light DOM подправляют `::slotted()` только на непосредственных детях. `mode: 'closed'` — не security.

---

# 4. Самое главное запомнить

- `:host` — сам custom element изнутри shadow root.
- CSS custom properties — основной theming API через границу.
- `part="name"` + снаружи `::part(name)` — явный доступ к куску UI.
- `::slotted(sel)` — только непосредственные slotted-узлы, не их потомки.
- `adoptedStyleSheets` — один CSSStyleSheet на много shadow roots.
- `closed` shadow не делает стили/данные безопасными.

---

# 5. Описание

## Изоляция и точки входа

```text
Страница CSS ──✗──► внутренности shadow (обычные селекторы)
Страница ──var(--x)──► наследуется внутрь
Страница ──::part(title)──► только объявленный part
Компонент ──::slotted(p)──► прямой child в slot (light DOM)
```

## Пример контракта

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

Потребитель:

```css
notice-box {
  --notice-color: #8a2be2;
}
notice-box::part(title) {
  text-transform: uppercase;
}
```

```html
<notice-box>
  <span slot="title">Внимание</span>
  <p>Текст в default slot</p>
</notice-box>
```

## Почему не «пробить» селектором

Без `part` внешний `notice-box h2 { … }` не стилизует `h2` внутри shadow. Это фича изоляции. Открывайте только то, что готовы поддерживать как API.

Light DOM в slot по-прежнему видит стили страницы (он снаружи тени). `::slotted(p span)` не дотянется до вложенного `span` — только до самого `p`, если он прямой child слота.

---

# 6. Ссылки

- [MDN: CSS scoping](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scoping)
- [MDN: ::part()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::part)
- [MDN: ::slotted()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::slotted)
- [MDN: Constructable Stylesheets](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet)
