# 1. Тема

**Дебаг серверного кода через браузер**

---

# 2. Главное в одну фразу

Флаг `node --inspect` поднимает отладчик Node на порту 9229 — Chrome DevTools подключается к серверному процессу и ставит breakpoints, как в клиентском Sources.

---

# 3. Суть

> Серверный JavaScript в Node можно отлаживать не только логами. Флаг **`--inspect`** (или **`--inspect-brk`**, если нужна пауза ещё до первой строки) открывает **Chrome DevTools Protocol** — обычно на порту `9229`. В Chrome открываете `chrome://inspect`, находите процесс Node и нажимаете **inspect**: тот же привычный интерфейс Sources, breakpoints, Scope, Call Stack и Console, но в контексте **backend-процесса**, а не вкладки сайта.
>
> Зачем это нужно: сложный баг в middleware, странное поведение async-кода или гонка без десятков `console.log` и перезапусков. Вы ставите точку в `routes/pay.js`, смотрите `req.body`, шагаете по `await` — тот же mental model, что при клиентской отладке, только цель другая. В Docker или на удалённой машине пробрасывают порт `9229` и иногда пишут `--inspect=0.0.0.0:9229`, но только в доверенной сети.
>
> Как запускают: `node --inspect dist/server.js`, `NODE_OPTIONS=--inspect` в dev-скрипте или attach из VS Code (`launch.json`, type `node`). Для TypeScript нужны **source maps**, иначе в DevTools будут только `.js` из `dist/`. На проде inspect наружу не выставляют: это полный доступ к памяти и коду процесса.
>
> Ловушка: путать «смотрю API во вкладке Network» с inspect сервера. Network показывает HTTP-трафик с точки зрения браузера, но не останавливает строку в Node. Другая ловушка — `--inspect` в публичном контейнере без firewall. Для не-Node стека свои адаптеры (JVM, delve), но идея та же: IDE или DevTools ↔ debug protocol.

---

# 4. Самое главное запомнить

- `node --inspect` / `--inspect-brk` → отладчик слушает порт 9229.
- Chrome: `chrome://inspect` → Remote Target → **inspect** (или Open dedicated DevTools).
- В dev включайте source maps для TypeScript — иначе breakpoints «не там».
- Inspect на проде в интернет не публикуют: через него можно читать память процесса.
- Клиентская вкладка Network показывает HTTP, но не ставит паузу в коде Node.
- VS Code attach к порту 9229 использует тот же протокол, что и Chrome.

---

# 5. Описание

```text
Terminal: node --inspect
        │
        ▼
   WS 127.0.0.1:9229
        │
        ▼
Chrome chrome://inspect → inspect
        │
        ▼
  Sources / breakpoints / Scope
```

## Быстрый старт

Сначала поднимаете сервер с флагом inspect. В терминале появится строка вроде «Debugger listening on ws://127.0.0.1:9229». Пока DevTools не подключены, приложение работает как обычно — флаг только **открывает дверь** для отладчика.

Если нужно остановиться до первой строки (удобно при отладке старта или импортов), берите **`--inspect-brk`**: процесс встанет на паузе, пока вы не нажмёте Resume в DevTools.

```bash
node --inspect dist/server.js
# или пауза до первого statement:
node --inspect-brk dist/server.js
```

## package.json

В dev-скрипте флаг можно зашить один раз, чтобы не помнить его при каждом запуске. **`--watch`** (Node 18+) перезапускает процесс при изменении файлов; после рестарта DevTools обычно переподключаются, если настроен attach с `restart: true`.

```json
{
  "scripts": {
    "dev": "node --watch --inspect dist/server.js",
    "dev:break": "node --inspect-brk dist/server.js"
  }
}
```

На проде в `start` inspect не добавляют.

## Локальный стенд (репозиторий)

В `server/inspect-demo.mjs` — минимальный HTTP-сервер без БД для практики attach:

```bash
cd server
npm run inspect:demo
# http://127.0.0.1:3333/ · chrome://inspect → inspect-demo.mjs → POST /pay
```

Пауза до первой строки: `npm run inspect:demo:break`.

## Docker (только локально / VPN)

В контейнере отладчик по умолчанию слушает только localhost внутри контейнера. Чтобы подключиться с хоста, пробрасывают порт `9229` и иногда явно указывают `0.0.0.0`. Без ограничения сети любой, кто достучится до порта, получит тот же доступ к процессу, что и вы — это риск, близкий к удалённому выполнению кода.

```text
docker run -p 3000:3000 -p 9229:9229 …
node --inspect=0.0.0.0:9229 …
```

## VS Code (attach)

Вместо Chrome можно attach из редактора: тот же протокол, другой UI. Удобно, если breakpoint ставите из IDE, а HTTP проверяете в браузере параллельно.

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach",
  "port": 9229,
  "restart": true
}
```

## Что отлаживать так

| Сценарий | Инструмент |
|----------|------------|
| Остановка в handler / middleware | `--inspect` + breakpoint |
| Тело запроса / заголовки на паузе | Scope в DevTools Node |
| Только HTTP-ответ «глазами» | Client Network (не замена inspect) |
| Продовый инцидент | Логи + APM; inspect — редко и осторожно |

Handler с `debugger;` сработает только если DevTools уже подключены к **процессу Node** — не путать с открытыми DevTools на вкладке сайта.

```javascript
router.post('/pay', async (req, res) => {
  debugger; // пауза в Node, если inspect + DevTools открыты
  const result = await charge(req.body);
  res.json(result);
});
```

---

# 6. Ссылки

- [Node.js — Debugging](https://nodejs.org/en/learn/getting-started/debugging)
- [Chrome — Node debugging](https://developer.chrome.com/docs/devtools/node)
- [VS Code — Node debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
