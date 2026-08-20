# 1. Тема

**CORS (Cross-Origin Resource Sharing)**

---

# 2. Главное в одну фразу

CORS — правила браузера: страница читает ответ с другого origin только если сервер явно разрешил это заголовками.

---

# 3. Суть

> **CORS** — договорённость между браузером и сервером о запросах из JavaScript на **другой origin**. Origin — схема + хост + порт: `https://app.example.com` и `https://api.example.com` для браузера уже разные миры.
>
> Зачем это нужно. По умолчанию Same-Origin Policy не даёт странице читать чужой ответ. Фронт и API часто живут на разных доменах — без CORS `fetch` в браузере падает, хотя тот же URL в curl или Postman отвечает нормально.
>
> Как это устроено. Браузер шлёт заголовок `Origin`, сервер отвечает `Access-Control-Allow-Origin` (и при необходимости methods, headers, credentials). Простой GET часто идёт сразу; для «сложного» запроса — например POST с `application/json` — браузер сначала спрашивает разрешение через preflight `OPTIONS`.
>
> Ловушка: CORS ограничивает **браузерный JS**, а не «закрывает» API от любого клиента. `Allow-Origin: *` несовместим с `credentials: 'include'`.

---

# 4. Самое главное запомнить

- Origin = протокол + хост + порт; смена любого из трёх — уже другой origin.
- Решение «можно ли JS читать ответ» принимает **браузер**, сверяя заголовки сервера.
- Главный сигнал разрешения — `Access-Control-Allow-Origin` (должен совпасть с Origin страницы или быть допустимым значением).
- Preflight — это `OPTIONS` «можно ли такой запрос?» перед самим методом; типичный триггер — JSON POST и кастомные заголовки.
- `Access-Control-Allow-Origin: *` нельзя сочетать с отправкой cookies / `credentials: 'include'`.
- Ответ 200 без нужных CORS-заголовков для JS всё равно «невидим»: сеть могла пройти, чтение тела — нет.
- Dev-proxy «прячет» cross-origin локально — это не замена CORS на проде.

---

# 5. Описание

```text
страница (Origin A)
        │  fetch → API (Origin B)
        │  + заголовок Origin: A
        ▼
      сервер
        │  Access-Control-Allow-Origin: A  (или отказ / *)
        ▼
браузер: совпало? → JS читает тело
         иначе   → CORS error (тело JS недоступно)
```

## Simple vs preflight

**Простой** запрос (часто GET/HEAD и узкий набор заголовков) браузер может отправить сразу и потом проверить CORS на ответе.

**Сложный** — например `POST` с `Content-Type: application/json` или свои заголовки — сначала уходит **preflight**: `OPTIONS` с вопросом «какие методы и заголовки можно». Если preflight не разрешён, основной запрос даже не стартует.

## Что смотреть на сервере

Сервер выставляет, среди прочего:

- `Access-Control-Allow-Origin` — кому можно читать ответ;
- при cookies / `credentials` — конкретный Origin (не `*`) и обычно `Access-Control-Allow-Credentials: true`;
- для preflight — `Access-Control-Allow-Methods` и `Access-Control-Allow-Headers`.

Важно обработать `OPTIONS` на том же пути/сервисе, куда потом идёт «боевой» метод. CORS, настроенный только на фронт-хосте или только на CDN, а не на API, демо не спасёт.

## Частые ловушки

- Путают CORS с авторизацией: «прошёл CORS» ≠ «пользователь вошёл».
- Смотрят только статус HTTP: 200 без `Access-Control-Allow-Origin` для страницы всё равно ошибка в Console.
- В dev всё зелёное из‑за proxy на тот же origin — на проде фронт и API снова разные.
- Ставят `*` «для простоты» и одновременно `credentials: 'include'` — браузер такой ответ отвергнет.

---

# 6. Ссылки

- [MDN — CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN — Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [Fetch Standard — CORS](https://fetch.spec.whatwg.org/#http-cors-protocol)
