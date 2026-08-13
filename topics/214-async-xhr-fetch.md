# 1. Тема

**XMLHttpRequest, fetch**

---

# 2. Главное в одну фразу

`XMLHttpRequest` и `fetch` — браузерные API для HTTP из JS: XHR на колбэках и событиях, `fetch` возвращает `Promise` и отделяет ответ от тела через `Response`.

---

# 3. Суть

> **XMLHttpRequest** и **`fetch`** дают странице ходить на сервер без перезагрузки. Оба асинхронны относительно call stack: запрос уходит в сеть, а ваш код продолжает работать; результат приходит колбэком (XHR) или промисом (`fetch`).
>
> `fetch` — современный и удобный для цепочек и `async`/`await`: сразу `Promise`, объект `Response` с `ok`, `status`, `headers`, а тело читают отдельно (`json()`, `text()`, `blob()`). XHR остаётся в легаси и там, где нужны прогресс загрузки, abort через старый API или очень старые окружения.
>
> Ловушка `fetch`: HTTP 404/500 **не** reject’ит промис — reject обычно при сетевом сбое или CORS. Проверяйте `response.ok` / `status`. У XHR статус смотрят в `onload` / `onreadystatechange`. Тело и заголовки — разные слои: «ответ пришёл» ≠ «JSON уже распарсен».

---

# 4. Самое главное запомнить

- Оба API не блокируют стек на время сети; продолжение — в колбэке / промисе.
- `fetch(url)` → `Promise<Response>`; тело — отдельный вызов `response.json()` и т.п.
- `fetch` reject при сети/CORS; 4xx/5xx — fulfilled с `ok === false`.
- XHR: `open` + `send`, события `load` / `error` / `progress`, состояние `readyState`.
- Отмена: `AbortController` + `signal` у `fetch`; у XHR — `abort()`.
- CORS и credentials (`credentials: 'include'`) влияют на оба API одинаково по модели браузера.

---

# 5. Описание

```text
JS: fetch / xhr.send
  → браузер (сеть, CORS)
  → Response / XHR events
  → разбор тела (json/text) → ваш код
```

## fetch

```js
const res = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 1 }),
  signal: AbortSignal.timeout(5000),
});

if (!res.ok) {
  throw new Error(`HTTP ${res.status}`);
}

const data = await res.json();
```

`Response.body` — поток; повторный `json()` после чтения обычно нельзя. Для бинарного — `arrayBuffer()` / `blob()`.

## XMLHttpRequest

```js
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/items');
xhr.responseType = 'json';
xhr.onload = () => {
  if (xhr.status >= 200 && xhr.status < 300) {
    console.log(xhr.response);
  }
};
xhr.onerror = () => console.error('network');
xhr.send();
```

Прогресс: `xhr.upload.onprogress` / `xhr.onprogress`. Для современных приложений чаще `fetch` + `ReadableStream` / сторонние обёртки.

## Когда что

| Задача | Чаще |
| --- | --- |
| Новый код, `async`/`await` | `fetch` |
| Прогресс upload «из коробки» | XHR (или Streams + fetch) |
| Отмена по таймауту | `AbortController` + `fetch` |
| Очень старый IE-контекст | XHR / полифилы |

## Ловушка

Не смешивать: «промис resolve» у `fetch` и «успешный бизнес-ответ». Всегда смотреть статус и контракт API.

---

# 6. Ссылки

- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
