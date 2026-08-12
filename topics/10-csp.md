# 1. Тема

**CSP (Content Security Policy)**

---

# 2. Главное в одну фразу

CSP — политика браузера (обычно HTTP-заголовок), которая разрешает только указанные источники скриптов, стилей и других ресурсов и тем самым сильно снижает ущерб от XSS.

---

# 3. Суть

> **Content Security Policy (CSP)** — список правил: откуда страница может грузить скрипты, стили, картинки, куда ходить по `fetch`/`XHR`, кто может встраивать её в iframe. Браузер **сам** блокирует нарушение (или только репортит в режиме Report-Only). Это не санитизация HTML на сервере, а второй рубеж на стороне клиента.
>
> Зачем: даже если в разметку пролез `<script>` или инлайн-обработчик, строгий `script-src` без `'unsafe-inline'` не даст ему выполниться. То же для чужих CDN, `eval` и неожиданных WebSocket/API. Политику выставляет сервер, CDN или reverse proxy на ответе документа.
>
> Как внедряют. База — `default-src`, поверх уточняют `script-src`, `style-src`, `img-src`, `connect-src`, `object-src`, `frame-ancestors`. Inline-скрипты — через **nonce** (случайный токен на ответ) или **hash** содержимого, а не через `'unsafe-inline'`. Сначала часто ставят `Content-Security-Policy-Report-Only` + `report-uri`/`report-to`, смотрят нарушения в логах, потом включают enforce.
>
> Ловушка: слабая политика с `'unsafe-inline'` и `'unsafe-eval'` почти не защищает от классического XSS. CSP не заменяет экранирование/санитизацию и не лечит все векторы (например, часть атак через плагины или ошибочный whitelist CDN). `frame-ancestors` в `<meta>` не работает — только HTTP-заголовок.

---

# 4. Самое главное запомнить

- Цель №1 — ограничить XSS и неожиданную подгрузку кода.
- Whitelist директивами; `default-src` — запасной вариант для неуказанных.
- В prod избегать `'unsafe-inline'` / `'unsafe-eval'` в `script-src`.
- Inline — **nonce** или **hash**; nonce должен быть уникальным на ответ.
- `Report-Only` → анализ → enforce; CSP — дополнение к безопасной разметке, не замена.

| Директива | Зачем |
|-----------|--------|
| `default-src` | fallback для прочих `*-src` |
| `script-src` | откуда JS (XSS) |
| `style-src` | CSS / inline-стили |
| `connect-src` | `fetch`, XHR, WebSocket |
| `object-src 'none'` | старые плагины |
| `frame-ancestors` | кто может встроить страницу (clickjacking) |

---

# 5. Описание

## Заголовок

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-rAnd0mValue';
  style-src 'self';
  img-src 'self' data:;
  connect-src 'self' https://api.example;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
```

Тот же смысл можно отдать через `<meta http-equiv="Content-Security-Policy" content="…">`, но **не все** директивы там поддерживаются: `frame-ancestors`, `report-uri` / `report-to` в meta не действуют — для них нужен HTTP-заголовок.

## Nonce

```html
<!-- сервер подставил тот же nonce, что в CSP -->
<script nonce="rAnd0mValue">window.__BOOT__ = {…}</script>
<script src="/app.js" nonce="rAnd0mValue"></script>
```

```http
Content-Security-Policy: script-src 'nonce-rAnd0mValue' 'self'
```

Nonce генерируют на **каждый** ответ (криптостойкий). Предсказуемый или общий на всех пользователей nonce бесполезен.

## Report-Only

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self';
  report-to csp-endpoint
```

Браузер не блокирует, но шлёт отчёты о нарушениях. Так ловят легитимные скрипты аналитики/виджетов до жёсткого enforce.

## Типичная схема внедрения

```text
1. Инвентаризация: свои origin, CDN, API, inline
2. Report-Only + сбор нарушений
3. Nonce/hash вместо unsafe-inline
4. Enforce; сужение whitelist
5. Мониторинг report-to
```

## Частые ошибки

- `'unsafe-inline'` «чтобы всё заработало» — снова открыт XSS.
- Один nonce на весь день / в репозитории.
- Разрешить весь CDN (`https:`) — слишком широко.
- Считать CSP полной защитой без санитизации ввода.
- Путать `frame-src` (что **вы** встраиваете) и `frame-ancestors` (кто встраивает **вас**).

## Связь с лабой и соседними темами

В лабе: блокировка XSS, цена `'unsafe-inline'`, nonce, Report-Only vs enforce. Рядом: **XSS**, **X-Frame-Options** / `frame-ancestors`, cookies и кража сессии после XSS.

---

# 6. Ссылки

- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN — CSP directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#directives)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP — Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
