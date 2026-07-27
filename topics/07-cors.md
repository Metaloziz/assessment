# 1. Тема

**CORS (Cross-Origin Resource Sharing)**

---

# 2. Главное в одну фразу

CORS — механизм браузера, который разрешает или запрещает веб-странице делать запросы к другому origin; настраивается заголовками на сервере.

---

# 3. Ответ для собеседования

> «**Origin** = схема + домен + порт. Cross-origin запросы из JS по умолчанию ограничены Same-Origin Policy.
>
> Сервер разрешает через `Access-Control-Allow-Origin` (+ methods/headers/credentials).
> Simple request идёт сразу; «сложный» — через preflight `OPTIONS`.
>
> CORS защищает не сервер, а ограничивает браузерный JS. curl/Postman CORS не проверяют.
> `Allow-Origin: *` несовместим с `credentials: true`.»

---

# 4. Самое главное запомнить

- Origin = protocol + host + port.
- CORS контролирует **браузер**, не backend напрямую.
- Главный заголовок — `Access-Control-Allow-Origin`.
- Preflight = `OPTIONS` для сложных запросов.
- `*` + credentials — нельзя.

---

# 5. Описание

## Simple vs Preflight

- Simple: GET/HEAD/POST + ограниченные заголовки/Content-Type.
- Preflight: кастомные headers, PUT/DELETE, `application/json` и т.п.

## Частые ошибки

- Не обработан OPTIONS.
- CORS настроен не на том сервисе.
- Путают с auth.
- Dev-proxy ≠ решение для production.

---

# 6. Ссылки

- [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN — Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [Fetch Standard — CORS](https://fetch.spec.whatwg.org/#http-cors-protocol)
