# 1. Тема

**XSS (Cross-Site Scripting)**

---

# 2. Главное в одну фразу

XSS — когда чужой JavaScript попадает на вашу страницу и браузер выполняет его как код вашего сайта: с вашими cookies, storage и правами пользователя.

---

# 3. Суть

> **XSS** — дыра в выводе: недоверенные данные (комментарий, поиск, кусок URL) попадают в HTML или DOM так, что браузер воспринимает их как **код**, а не как текст. Скрипт работает в **вашем** origin: может читать доступные cookies и `localStorage`, слать запросы от имени пользователя, подменять интерфейс.
>
> Три типичных пути доставки. **Stored** — payload сохранили в БД (комментарий, профиль) и отдают всем. **Reflected** — вредоносный фрагмент пришёл в запросе (`?q=…`) и сразу отразился в ответе без экранирования. **DOM-based** — сервер отдал «чистый» HTML, а клиентский JS сам вставил `location` или ввод в `innerHTML`. Симптом один: исполнение в контексте вашей страницы.
>
> Защита — слоями на **выводе**. Текст — экранирование или безопасный API (`textContent`, JSX `{value}`). Сырой HTML извне — санитизация (например DOMPurify) перед вставкой. Сессия — `HttpOnly` cookies; политика — CSP без `'unsafe-inline'`. Ввод на сервере проверяют, но главное — безопасный вывод в нужном контексте (HTML, атрибут, URL, JS).
>
> Ловушка: «у нас React — XSS не будет». JSX по умолчанию экранирует текст, но `dangerouslySetInnerHTML`, сырой `innerHTML`, `eval` и `javascript:` в `href` снова открывают дыру. CSP и HttpOnly уменьшают ущерб, но не заменяют экранирование.

---

# 4. Самое главное запомнить

- XSS — чужой JS в **вашем** origin, не «просто вредоносный сайт рядом».
- Stored / reflected / DOM-based — где живёт payload; итог один: исполнение на странице.
- Текст выводить через escape / `textContent` / JSX `{…}`; HTML — только после sanitize.
- Не писать недоверенное в `innerHTML` / `dangerouslySetInnerHTML` без очистки.
- React экранирует обычный текст; опасны отдельные API (`eval`, сырой HTML).
- CSP и HttpOnly — второй рубеж: снижают ущерб, не отменяют безопасный вывод.

| Тип | Где payload | Типичный вход |
|-----|-------------|----------------|
| Stored | БД → всем | комментарий, bio |
| Reflected | запрос → этот ответ | `?q=`, ошибка поиска |
| DOM-based | только в браузере | `location.hash` → `innerHTML` |

---

# 5. Описание

```text
жертва открыла yourapp.com
        │
        ▼
  выполняется скрипт атакующего
        │
        ├── cookies / localStorage (если доступны)
        ├── fetch('/api/…') с сессией пользователя
        └── подмена UI / кража данных
```

## Опасные vs безопасные вставки

| Опасно | Безопаснее |
|--------|------------|
| `el.innerHTML = user` | `el.textContent = user` |
| `dangerouslySetInnerHTML={{ __html: user }}` | `{user}` или DOMPurify → затем HTML |
| `eval` / `new Function` | `JSON.parse`, обычный код |
| `href={userInput}` | whitelist `https:` / относительные пути |
| `document.write(user)` | не использовать |

```javascript
// DOM-based XSS
const name = new URLSearchParams(location.search).get('name');
document.getElementById('out').innerHTML = 'Привет, ' + name;
// ?name=<img src=x onerror=…>
```

```javascript
// безопаснее для текста
out.textContent = 'Привет, ' + name;
```

```javascript
// если нужен HTML (markdown / CMS)
import DOMPurify from 'dompurify';
el.innerHTML = DOMPurify.sanitize(htmlFromServer);
```

## Связь с соседними темами

- **CSP** — второй рубеж: даже при инжекте скрипт может не выполниться.
- **Cookies / JWT** — HttpOnly и отказ от access в `localStorage` снижают кражу сессии.
- **`eval` / `dangerouslySetInnerHTML`** — конкретные API, через которые XSS чаще появляется во фронте.

## Частые ошибки

- Экранировать при сохранении в БД, а выводить в другом контексте (атрибут / JS) «как есть».
- Доверять «данным с нашего API» — stored XSS уже лежит в ответе.
- Санитизировать только `<script>`, оставляя `onerror` / SVG.
- Считать iframe админки достаточной защитой для пользовательского HTML.

## Связь с лабой

Живой стенд: один payload вставляется через `innerHTML`, `textContent` или DOMPurify — глаз видит, сработал ли XSS. В «Код» — те же три приёма вывода.

---

# 6. Ссылки

- [OWASP — Cross Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger — Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [MDN — Cross-site scripting](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting)
