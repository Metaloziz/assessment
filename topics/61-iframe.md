# 1. Тема

**iframe**

---

# 2. Главное в одну фразу

`iframe` встраивает другой документ в страницу; безопасность строится на same-origin, `sandbox` и политике встраивания (CSP / `X-Frame-Options`).

---

# 3. Суть

> **iframe** — вложенный browsing context со своим документом, origin и (часто) отдельным JS-миром. Используют для виджетов, карт, платёжных форм, preview.
>
> Если origin разный, прямой доступ к DOM/JS соседа закрыт same-origin policy; обмен — через `postMessage` с проверкой `origin`. Атрибут **`sandbox`** режет возможности встроенной страницы (скрипты, формы, top-navigation) и точечно возвращает нужные `allow-*`.
>
> Обратная сторона: сайт могут встроить злоумышленники (clickjacking) — защита `Content-Security-Policy: frame-ancestors` / `X-Frame-Options`. Для a11y обязателен осмысленный **`title`**.

---

# 4. Самое главное запомнить

- Чужой origin в iframe ≠ доступ к его DOM.
- Связь: `postMessage` + проверка origin.
- `sandbox` по умолчанию жёстко ограничивает; `allow-scripts` / `allow-same-origin` вместе опасны (можно снять sandbox).
- Защита от встраивания своего UI: CSP `frame-ancestors` / XFO.
- `title` — для доступности.

| Механизм | Роль |
|---|---|
| Same-origin | Изоляция документов |
| sandbox | Ограничение возможностей child |
| postMessage | Явный обмен сообщениями |
| frame-ancestors / XFO | Не дать встроить себя |

---

# 5. Описание

### Базовый синтаксис

```html
<iframe
  src="https://example.com/widget"
  title="Платёжный виджет"
  width="600"
  height="400"
></iframe>
```

### Sandbox

```html
<iframe
  src="https://pay.example.com"
  title="Оплата"
  sandbox="allow-scripts allow-forms"
></iframe>
```

Пустой `sandbox=""` — максимум ограничений. Комбинация `allow-scripts` + `allow-same-origin` на документе с тем же origin позволяет странице снять sandbox — использовать осознанно.

### postMessage

```javascript
// parent → iframe
frame.contentWindow.postMessage({ type: 'init' }, 'https://pay.example.com')

// iframe
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.example.com') return
  // обработка
})
```

### Типичные кейсы

- встраивание карт/видео/платежей;
- изолированный preview пользовательского HTML;
- micro-frontend через frame (редко; обычно Module Federation / другое).

---

# 6. Ссылки

- [MDN — iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN — Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN — Content-Security-Policy: frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
