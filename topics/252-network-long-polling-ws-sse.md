# 1. Тема

**Long-Polling, WebSockets и Server-Sent Events**

---

# 2. Главное в одну фразу

Три способа доставить событие с сервера клиенту без короткого polling: long-poll держит HTTP-запрос, SSE — односторонний поток по HTTP, WebSocket — двусторонний канал после upgrade.

---

# 3. Суть

> Когда UI должен узнавать об изменениях сам (чат, статус заказа, котировки), короткий `setInterval` + `GET` тратит запросы впустую. Три рабочие модели: **long-polling** — клиент открывает HTTP-запрос, сервер отвечает, когда есть событие или истёк таймаут, клиент сразу открывает следующий; **Server-Sent Events (SSE)** — один долгоживущий HTTP-ответ (`text/event-stream`), сервер пишет события в поток, клиент читает через `EventSource`; **WebSocket** — после HTTP upgrade остаётся постоянный full-duplex канал, оба конца шлют фреймы без нового HTTP на каждое сообщение.
>
> Выбор зависит от направления и инфраструктуры. Нужен только push с сервера (лента, прогресс) — часто хватает SSE: привычный HTTP, авто-reconnect в браузере, проще прокси. Нужен двусторонний диалог с низкой задержкой (игра, совместное редактирование, чат с частыми исходящими) — WebSocket. Long-poll — запасной путь, когда нельзя держать поток или WS: работает почти везде, но дороже по накладным расходам на каждый цикл «закрыл ответ → новый запрос».
>
> Как это стыкуется с HTTP. Long-poll и SSE остаются семантикой request/response (или одного длинного ответа). WebSocket начинается с handshake (`Upgrade: websocket`), дальше — уже не «обычный» REST-запрос, а кадры протокола. Во всех трёх случаях нужны явный формат сообщений, обработка обрыва и лимиты прокси/таймаутов.
>
> Ловушка: путать «сервер что-то прислал» с «это WebSocket». SSE и long-poll тоже дают push без WS. Другая крайность — тащить WebSocket на любой live-экран, когда достаточно одностороннего SSE или редкого long-poll. Тема REST и методы HTTP — соседние; здесь важен *транспорт доставки событий*, не CRUD ресурсов.

---

# 4. Самое главное запомнить

- Long-poll: HTTP-запрос ждёт событие/таймаут → ответ → клиент сразу запрашивает снова.
- SSE: односторонний поток server → client по HTTP; в браузере — `EventSource`, `Content-Type: text/event-stream`.
- WebSocket: после upgrade — full-duplex; URL `ws://` / `wss://`, API `WebSocket`.
- SSE проще для «только уведомления»; WS — когда клиент тоже часто шлёт по тому же каналу.
- Long-poll совместим с «тупыми» прокси, но дороже по handshake/заголовкам на цикл.
- Обрыв сети: reconnect, идемпотентность доставки, таймауты reverse-proxy — часть дизайна, не «потом».

| Модель | Направление | Транспорт | Типичный клиент |
|--------|-------------|-----------|-----------------|
| Long-poll | server → client (цикл HTTP) | обычный HTTP | `fetch` / XHR |
| SSE | server → client (поток) | HTTP stream | `EventSource` |
| WebSocket | оба направления | WS после upgrade | `WebSocket` |

---

# 5. Описание

```text
Short poll (плохо для «живых» данных)
  GET → 200 (пусто) → … → GET → 200 (пусто) → …

Long-poll
  GET ──────────────────────────► (ждёт)
       ◄── 200 {event} ──────────
  GET ──────────────────────────► (сразу снова)

SSE
  GET /events ──► 200 text/event-stream
       ◄── data: …\n\n  (много раз по одному ответу)

WebSocket
  HTTP Upgrade ──► 101 Switching Protocols
       ◄──► WS frames (оба конца)
```

## Long-polling

Клиент: `GET /updates?since=…` (или курсор). Сервер не отвечает сразу, если нечего отдать: держит соединение до события или до своего deadline (часто десятки секунд), затем `200` с телом или пустым «heartbeat»-ответом. Клиент после `finally` / `load` открывает следующий запрос.

Плюсы: работает поверх обычного HTTP, привычные статусы и auth-заголовки. Минусы: на каждое событие (или таймаут) — полный HTTP round-trip; нагрузка на сервер от висящих запросов; нужно аккуратно стыковать с таймаутами балансировщика.

```javascript
async function longPoll(url, onEvent) {
  for (;;) {
    const res = await fetch(url, { signal: AbortSignal.timeout(35_000) });
    if (res.ok) {
      const data = await res.json();
      if (data.events?.length) onEvent(data.events);
    }
    // ← следующий запрос сразу после ответа / таймаута
  }
}
```

## Server-Sent Events (SSE)

Сервер отвечает `Content-Type: text/event-stream` и пишет кадры в формате SSE (`data:`, опционально `id:`, `event:`, пустая строка как разделитель). Соединение одно на поток; браузерный `EventSource` сам переподключается и шлёт `Last-Event-ID`.

Ограничения модели: канал **только server → client**. Исходящие команды клиента — отдельные `POST`/`PUT`, не тот же поток. В классическом `EventSource` нет кастомного `Authorization`-заголовка (часто cookie или token в query — с оглядкой на логи). Для POST-handshake или своих заголовков используют `fetch` + `ReadableStream` вместо `EventSource`.

```javascript
const es = new EventSource('/api/stream');
es.onmessage = (e) => {
  const msg = JSON.parse(e.data); // ← одно событие из потока
  render(msg);
};
es.onerror = () => {
  /* EventSource сам пытается reconnect */
};
```

Фрагмент ответа сервера:

```text
id: 42
event: order
data: {"status":"shipped"}

data: {"ping":true}
```

## WebSocket

Клиент делает HTTP-запрос с `Upgrade: websocket`. При успехе — `101`, дальше обмен бинарными/текстовыми фреймами. В браузере: `new WebSocket('wss://…')`, события `open` / `message` / `error` / `close`, отправка `send()`.

Когда уместен: частые сообщения в обе стороны, низкая задержка, свой прикладной протокол (`type` в JSON). Когда избыточен: редкие односторонние статусы — SSE или даже long-poll проще в деплое (меньше сюрпризов с sticky sessions и WS-прокси).

```javascript
const ws = new WebSocket('wss://api.example.com/live');
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'orders' })); // ← клиент → сервер
});
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data); // ← сервер → клиент
  render(msg);
});
```

## Как выбирать

```text
Нужен push с сервера?
  ├─ только server → client, HTTP ок  → SSE (или long-poll, если поток режут)
  ├─ оба направления, низкая задержка → WebSocket
  └─ редкие проверки / нет live       → обычный GET / polling по необходимости
```

На практике часто комбинируют: REST для CRUD, SSE/WS для live-слоя. Безопасность канала (`wss`, origin, auth на handshake) — соседняя тема про WebSocket; здесь фокус на модели доставки.

## Что смотреть в DevTools

- Long-poll: Network — длинный pending `GET`, потом статус и тело; следующий запрос сразу.
- SSE: тип `eventsource` / долгий документ, в Response — поток `data:`.
- WebSocket: вкладка **WS** → Frames / Messages.

---

# 6. Ссылки

- [MDN — Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MDN — EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [HTML Living Standard — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
