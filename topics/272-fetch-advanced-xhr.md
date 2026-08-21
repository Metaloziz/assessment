# 1. Тема

**Fetch advanced. Есть ли разница с XMLHttpRequest**

---

# 2. Главное в одну фразу

`fetch` и `XMLHttpRequest` делают один HTTP-запрос, но по-разному отдают результат, ошибки, тело и прогресс — это разные модели API, а не «одно и то же под другим именем».

---

# 3. Суть

> Базовый `GET` через `fetch` или `XMLHttpRequest` выглядит похоже: браузер ушёл в сеть и позже вернул ответ. Разница проявляется в **модели результата**. У `fetch` сразу промис и объект `Response`: статус, заголовки и тело — отдельные слои. У XHR — события и поля на одном объекте (`status`, `response`, `readyState`).
>
> Зачем это важно на практике. От «успешного» промиса `fetch` нельзя делать вывод, что API ответил бизнес-успехом: HTTP 404/500 обычно **fulfill** с `ok === false`. Reject чаще при обрыве сети, CORS или abort. У XHR статус смотрят в `onload` / `onreadystatechange`, а сетевую ошибку — в `onerror`. Плюс у XHR «из коробки» удобный прогресс upload; у `fetch` тело — поток, который читают один раз, а прогресс upload исторически слабее.
>
> Как выбирать. Новый код почти всегда пишут на `fetch` + `AbortController` + `async`/`await`. XHR остаётся там, где нужен простой upload-progress без Streams, или в легаси. CORS и cookies подчиняются одной браузерной модели — «разные API» не обходят политику origin.
>
> Ловушка: считать `fetch` и XHR взаимозаменяемыми один в один. Переписать `xhr.send` на `fetch` без проверки `response.ok`, abort и чтения тела — частый источник «тихих» 4xx/5xx.

---

# 4. Самое главное запомнить

- Оба шлют HTTP из JS; отличаются контрактом: промис + `Response` против событий XHR.
- У `fetch` 4xx/5xx обычно не reject — смотрите `response.ok` / `status`.
- Тело у `fetch` читают отдельно (`json()` / `text()` / stream) и обычно один раз.
- Отмена: `AbortController` + `signal` у `fetch`; у XHR — `abort()`.
- Upload progress проще на XHR (`upload.onprogress`); у `fetch` — через Streams / обходные пути.
- CORS, credentials и cookies — правила браузера общие для обоих API.

---

# 5. Описание

```text
один HTTP-запрос
        │
        ├─ fetch  → Promise<Response> → status/ok → body (stream, один раз)
        │            reject: сеть / CORS / abort
        │
        └─ XHR    → events (load/error/progress) → status + response на объекте
                     abort() / timeout «на месте»
```

## Где реально расходятся

Оба API ходят в сеть через браузер. Меняется то, **как** ваш код узнаёт об ответе и ошибке.

| Вопрос | `fetch` | `XMLHttpRequest` |
| --- | --- | --- |
| Успех промиса / load | ответ пришёл (часто даже при 404) | событие `load` при завершении |
| HTTP-ошибка | обычно fulfill, `ok === false` | смотрите `status` в обработчике |
| Сеть / CORS | reject | `onerror` / статус 0 |
| Тело | `Response` + методы / stream | `response` / `responseText` |
| Прогресс upload | сложно «из коробки» | `xhr.upload.onprogress` |
| Отмена | `AbortController` | `xhr.abort()` |

## Продвинутый `fetch`: не только `await res.json()`

`Request` и `Response` — обычные объекты: их можно собрать заранее, передать в `fetch(request)`, клонировать (`clone()`), если тело ещё не прочитано. Опции вроде `credentials`, `cache`, `redirect`, `keepalive` задают поведение браузера на уровне запроса, а не «магию промиса».

```js
const ctrl = new AbortController();
const res = await fetch('/api/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ok: true }),
  credentials: 'include',
  signal: ctrl.signal,
});

if (!res.ok) throw new Error(`HTTP ${res.status}`);

// тело — поток; после json() повторно не прочитать
const data = await res.json();
```

Таймаут сегодня часто делают через `AbortSignal.timeout(ms)` или свой `AbortController` + `setTimeout`. У XHR был отдельный `xhr.timeout`.

## Когда XHR всё ещё уместен

Нужен понятный **прогресс отправки файла** без возни со Streams — XHR по-прежнему прямолинеен. Старый код и обёртки вокруг него тоже не «ломаются» от существования `fetch`. Для нового приложения без особых требований к upload UI разумный дефолт — `fetch`.

## Ловушка

`await fetch(url)` без проверки `ok` и без `.catch` / `try/catch` на abort даёт ложное чувство «запрос всегда успешен, пока нет исключения». Исключение и HTTP-ошибка — разные ветки.

---

# 6. Ссылки

- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
