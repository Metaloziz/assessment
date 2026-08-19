# 1. Тема

**Отладка WebSocket в браузере**

---

# 2. Главное в одну фразу

В браузере WebSocket отлаживают через `DevTools`: смотрят handshake в `Network`, читают `Frames/Messages`, проверяют payload, close code и момент обрыва без догадок по одним `console.log`.

---

# 3. Суть

> У WebSocket баг часто не в самом `new WebSocket(...)`, а в том, *что реально прошло по каналу*: сервер не сделал upgrade, клиент не отправил `auth`, пришёл неожиданный `type`, соединение закрылось кодом `1006`, прокси оборвал idle-сессию. Поэтому главный инструмент в браузере - вкладка **Network** с выбранным WS-соединением.
>
> Сначала смотрят **handshake**: URL `ws://` / `wss://`, статус `101 Switching Protocols`, заголовки `Upgrade: websocket`, `Connection: Upgrade`, `Sec-WebSocket-*`. Если `101` нет, проблема ещё на HTTP-слое: неверный origin, auth, reverse proxy или обычный `404/401/500`.
>
> После upgrade важны **Frames / Messages**: какие сообщения ушли, какие пришли, в каком порядке, есть ли heartbeat, не сломался ли JSON. Это помогает быстро поймать рассинхрон протокола: клиент ждёт `type: "ready"`, а сервер шлёт `event: "ready"`.
>
> Дальше смотрят **закрытие канала**: событие `close`, код, причина, момент последнего кадра перед обрывом. Полезные привычки - `Preserve log`, фильтр по `WS`, проверка payload в `message`, а для клиентской логики рядом использовать breakpoint в обработчике `onmessage` или `addEventListener('message', ...)`.
>
> Ловушка: видеть в коде `socket.send()` и считать, что сообщение ушло. Истина - в DevTools-фреймах. Другая ловушка - искать WebSocket в Console, когда сервер вообще не ответил `101`: тогда сначала надо чинить handshake и сеть.

---

# 4. Самое главное запомнить

- Сначала handshake: `101 Switching Protocols` и `Upgrade: websocket`.
- Потом `Frames/Messages`: порядок, payload, heartbeat, ошибки формата.
- Если нет `101`, это ещё HTTP-проблема, а не «сломанный WebSocket API».
- При обрыве смотрят `close` code, причину и последний успешный кадр.
- `Preserve log` и фильтр `WS` экономят время при редиректах и reconnect.
- `console.log` помогает, но подтверждение всегда в DevTools.

---

# 5. Описание

## Базовый порядок

```text
1. Открыть DevTools → Network
2. Включить Preserve log
3. Отфильтровать WS
4. Обновить страницу или заново воспроизвести подключение
5. Открыть соединение и проверить Headers
6. Перейти в Frames / Messages
7. Сверить close code и payload с кодом клиента
```

## Что смотреть в handshake

| Что | Зачем |
|---|---|
| `wss://...` или `ws://...` | адрес канала |
| `101 Switching Protocols` | upgrade реально состоялся |
| `Upgrade: websocket` | сервер согласился на WebSocket |
| `Sec-WebSocket-Protocol` | выбран subprotocol, если он есть |
| `Origin`, cookie, auth | частый источник `401/403` |

## Что смотреть во фреймах

- какое первое сообщение уходит после `open`;
- что сервер присылает первым: `ready`, `auth_ok`, snapshot;
- совпадает ли JSON-форма с ожиданием клиента;
- не закрывается ли канал сразу после `auth`;
- есть ли heartbeat или пустой простой.

```typescript
const socket = new WebSocket('wss://api.example.com/live');

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'auth', token }));
});

socket.addEventListener('message', (event) => {
  const packet = JSON.parse(event.data);
  if (packet.type === 'presence:update') {
    renderPresence(packet.users);
  }
});

socket.addEventListener('close', (event) => {
  console.log(event.code, event.reason);
});
```

## Типичные сценарии

- **Нет `101`**: неверный URL, auth, origin, proxy или backend-роут.
- **Есть `101`, но пусто**: клиент не отправил стартовый кадр или сервер ждёт auth.
- **Сообщения есть, UI молчит**: payload не того формата или баг в `message`-handler.
- **Канал рвётся через минуту**: timeout прокси, нет heartbeat, reconnect работает неправильно.

## Полезная связка

`Network → WS` отвечает на вопрос "что реально прошло по каналу", а breakpoint в `onmessage` отвечает на вопрос "что приложение сделало с этим кадром".

---

# 6. Ссылки

- [Chrome DevTools - Network panel](https://developer.chrome.com/docs/devtools/network/)
- [MDN - WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
