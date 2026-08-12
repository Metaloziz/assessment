# 1. Тема

**XSS (Cross-Site Scripting)**

---

# 2. Главное в одну фразу

XSS — внедрение чужого JavaScript в страницу вашего origin: браузер жертвы выполняет его с вашими cookies, storage и правами пользователя.

---

# 3. Суть

> **Cross-Site Scripting (XSS)** — атака, при которой недоверенные данные попадают в HTML/DOM так, что браузер воспринимает их как **код** вашего сайта. Скрипт работает в контексте origin жертвы: может читать не-HttpOnly cookies, `localStorage`, слать запросы от имени пользователя, подменять UI.
>
> Три классических пути. **Stored** — payload лежит в БД/хранилище (комментарий, профиль) и отдаётся всем. **Reflected** — вредоносный фрагмент приходит в запросе (query, заголовок) и сразу отражается в ответе без экранирования. **DOM-based** — сервер может отдать «чистый» HTML, а клиентский JS сам пишет `location` / ввод в `innerHTML` или опасный API. Симптом один: исполнение в вашем origin.
>
> Защита слоями. Вывод текста — экранирование / безопасные API (`textContent`, JSX `{value}`). HTML извне — санитизация (DOMPurify) перед вставкой. Сессия — `HttpOnly` cookies, короткий access вне `localStorage`. Политика — CSP без `'unsafe-inline'`. Ввод на сервере валидируют, но **главное — безопасный вывод в нужном контексте** (HTML, атрибут, URL, JS).
>
> Ловушка: «у нас React — XSS не будет». По умолчанию JSX экранирует текст, но `dangerouslySetInnerHTML`, сырой `innerHTML`, `eval`, `javascript:` в `href` и небезопасная сборка URL снова открывают дыру. CSP и HttpOnly уменьшают ущерб, но не отменяют экранирование.

---

# 4. Самое главное запомнить

- XSS = чужой JS в **вашем** origin, не «просто вредоносный сайт».
- Stored / Reflected / DOM-based — где живёт и как доставляется payload.
- Escape по контексту + sanitize HTML + CSP + HttpOnly.
- Не писать недоверенное в `innerHTML` / `dangerouslySetInnerHTML` без DOMPurify.
- React экранирует `{text}`; опасные API — отдельная тема (`eval`, `dangerouslySetInnerHTML`).

| Тип | Где payload | Типичный вход |
|-----|-------------|----------------|
| Stored | БД → всем | комментарий, bio |
| Reflected | запрос → этот ответ | `?q=`, ошибка поиска |
| DOM-based | только в браузере | `location.hash` → `innerHTML` |

---

# 5. Описание

## Что ломается после XSS

```text
victim открыл yourapp.com
  → выполняется скрипт атакующего
      → document.cookie / localStorage (если доступны)
      → fetch('/api/…') с cookie сессии
      → подмена формы / кейлоггер / криптомайнер
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
// если нужен HTML (markdown/CMS)
import DOMPurify from 'dompurify';
el.innerHTML = DOMPurify.sanitize(htmlFromServer);
```

## Связь с соседними темами

- **CSP** — второй рубеж: даже при инжекте скрипт может не выполниться.
- **Cookies / JWT** — HttpOnly и отказ от access в `localStorage` снижают кражу сессии.
- **`eval` / `dangerouslySetInnerHTML`** — конкретные API, через которые XSS чаще всего появляется во фронте.

## Частые ошибки

- Экранировать при сохранении в БД, а выводить в другом контексте (атрибут/JS) «как есть».
- Доверять «данным с нашего API» — stored XSS уже в ответе.
- Санитизировать только `<script>`, оставляя `onerror` / SVG.
- Считать iframe/песочницу админки достаточной защитой для пользовательского HTML.

## Связь с лабой

Сценарии: reflected, stored, DOM-based, защита escape/sanitize. В «Код» — серверный шаблон, клиентский `innerHTML`, React + DOMPurify.

---

# 6. Ссылки

- [OWASP — Cross Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger — Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting)
- [DOMPurify](https://github.com/cure53/DOMPurify)
