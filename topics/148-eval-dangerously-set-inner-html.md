# 1. Тема

**`eval` и `dangerouslySetInnerHTML`**

---

# 2. Главное в одну фразу

`eval` исполняет строку как код, а `dangerouslySetInnerHTML` вставляет HTML в DOM без экранирования React — оба пути легко превращают недоверенные данные в XSS.

---

# 3. Суть

> **`eval(code)`** берёт строку и выполняет её как JavaScript в текущем контексте. **`dangerouslySetInnerHTML={{ __html }}`** — API React, который пишет сырой HTML во внутренность элемента так же, как `element.innerHTML`. Имя «dangerously» — намеренное предупреждение: React здесь **не** экранирует разметку.
>
> Зачем знать оба: в продукте почти всегда хватает безопасных альтернатив (`JSON.parse`, шаблоны, `{text}` в JSX, `textContent`). Эти API оставляют осознанно — для легаси, динамических шаблонов или HTML из доверенного CMS. Если туда попадёт ввод пользователя или ответ стороннего API, браузер выполнит встроенный `<script>` или обработчик вроде `onerror=…` в контексте вашего origin.
>
> Как проявляется риск. `eval(userInput)` или `new Function(userInput)` даёт полный доступ к странице: cookies (не HttpOnly), localStorage, запросы от имени пользователя. `dangerouslySetInnerHTML` с несанитизированной строкой — классический DOM XSS: достаточно фрагмента вроде `<img src=x onerror=…>`. Соседние опасные паттерны: `innerHTML`, `document.write`, `javascript:` в `href`.
>
> Ловушка: «строка пришла с нашего бэка» ≠ безопасно — бэк мог сохранить XSS раньше (stored). «Мы только админы правят HTML» — пока админский аккаунт не скомпрометирован. Если HTML всё же нужен — санитизация (DOMPurify) плюс CSP; `eval` в приложении лучше не использовать вовсе.

---

# 4. Самое главное запомнить

- `eval` / `new Function` = выполнение строки как кода; для данных — `JSON.parse`, не `eval`.
- `dangerouslySetInnerHTML` = сырой HTML без экранирования React.
- JSX `{value}` для текста безопасен по умолчанию; HTML извне — только после sanitize.
- Риск: XSS в вашем origin (кража сессии, действия от имени пользователя).
- Альтернативы HTML: Markdown→безопасный рендер, компоненты, `textContent`.

---

# 5. Описание

## `eval` — что делает и чем заменить

```javascript
// Плохо: строка может быть чем угодно
const result = eval(userFormula);

// Лучше для данных
const data = JSON.parse(jsonString);

// Для «формул» — парсер/библиотека с whitelist операций, не eval
```

Рядом по опасности: `new Function('return ' + expr)()`, `setTimeout(string)` / `setInterval(string)`.

## `dangerouslySetInnerHTML` — типичный случай

```jsx
// Плохо: comment может содержать разметку злоумышленника
function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Безопаснее для обычного текста
function Comment({ text }) {
  return <div>{text}</div>;
}

// Если нужен именно HTML — сначала sanitize
import DOMPurify from 'dompurify';

function RichHtml({ html }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

## Связь с XSS

| Источник | Почему опасно |
|----------|----------------|
| `eval(input)` | Любой JS в контексте страницы |
| `dangerouslySetInnerHTML` без sanitize | Теги и обработчики событий в DOM |
| `innerHTML = input` | То же вне React |
| `href={input}` без проверки схемы | `javascript:…` |

Подробнее про типы XSS и защиту — тема **XSS** в этой группе; здесь фокус на двух API, которые чаще всего открывают дыру во фронтенде.

## Когда всё же используют

- Легаси-виджеты, которые отдают готовую HTML-строку.
- Рендер контента из редактора (CMS), если цепочка sanitize + CSP настроена.
- Не для «удобного» парсинга JSON и не для пользовательских комментариев «как есть».

---

# 6. Ссылки

- [MDN: eval()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)
- [React: dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
