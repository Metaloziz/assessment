# 1. Тема

**WebSocket**

---

# 2. Главное в одну фразу

WebSocket — постоянное двустороннее (full-duplex) соединение поверх TCP: после handshake клиент и сервер шлют фреймы без нового HTTP-запроса на каждое сообщение.

---

# 3. Суть

> В отличие от классического HTTP request/response, **WebSocket** держит канал открытым: сервер может пушить данные сам (котировки, уведомления, чат). URL обычно `wss://` (TLS) или `ws://`.
>
> Клиентский API: `new WebSocket(url)`, события `open` / `message` / `error` / `close`, отправка `send()`. Состояние — `readyState` (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`).
>
> Нужны стратегия **reconnect**, heartbeat (ping/pong или прикладной ping), явный протокол сообщений (часто JSON с `type`). В DevTools канал виден во вкладке **Network → WS**.

---

# 4. Самое главное запомнить

- Full-duplex, одно долгоживущее соединение после upgrade.
- Предпочтительен `wss://`.
- Обязательны обработка `close`/`error` и переподключение.
- Не замена REST для всех CRUD — для стриминга и push.
- Отладка: Network → WS → Messages/Frames.

| | HTTP | WebSocket |
|---|---|---|
| Модель | Запрос → ответ | Постоянный канал |
| Push с сервера | Нет (кроме SSE/long-poll) | Да |
| Overhead на сообщение | Высокий (заголовки) | Низкий (фреймы) |

---

# 5. Описание

### Базовый клиент

```typescript
const socket = new WebSocket('wss://api.example.com/ws')

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'auth', token: '…' }))
})

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  // switch (data.type) { … }
})

socket.addEventListener('close', (event) => {
  if (event.code !== 1000) {
    // переподключение с backoff
  }
})
```

### Практические детали

- бинарные данные: `Blob` / `ArrayBuffer`;
- лимиты размера сообщения и backpressure на сервере;
- sticky sessions / pub-sub на бэкенде при горизонтальном масштабе;
- авторизация: токен в первом сообщении или cookie на handshake (с оглядкой на SameSite).

### Когда не нужен

Редкие запросы «спросил — получил» проще через HTTP/fetch; для одностороннего серверного потока иногда хватает **SSE**.

---

# 6. Ссылки

- [MDN — WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [Chrome DevTools — WebSocket](https://developer.chrome.com/docs/devtools/network/overrides#websocket)
