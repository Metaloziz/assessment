# 1. Тема

**Дебаг серверного кода через браузер**

---

# 2. Главное в одну фразу

Node (и часть других runtimes) открывает Inspector-протокол: Chrome DevTools подключается к серверному процессу по `chrome://inspect` и даёт breakpoints, как на клиенте.

---

# 3. Суть

> Серверный JS в Node отлаживают не только логами. Флаг **`--inspect`** (или `--inspect-brk` с паузой на старте) поднимает **Chrome DevTools Protocol** на порту (обычно `9229`). В Chrome: `chrome://inspect` → Remote Target → **inspect** — открывается привычный UI: Sources, breakpoints, Scope, Call Stack, Console в контексте процесса Node. Можно ставить точки в `routes/pay.js`, смотреть `req.body`, шагать по async-функциям.
>
> Зачем: сложный баг в middleware или гонка в async без перезапуска с десятками `console.log`. Тот же mental model, что клиентский Sources, но цель — **backend process**, не вкладка сайта. Для Docker/удалёнки — проброс порта `9229` и иногда `--inspect=0.0.0.0:9229` (только в доверенной сети).
>
> Как запускают: `node --inspect dist/server.js` или `NODE_OPTIONS=--inspect` в dev-скрипте; в VS Code — `launch.json` type `node` / attach. Source maps для TS (`tsc` / tsx / swc) чтобы в DevTools были `.ts`. Не оставлять inspect на проде наружу — это полный доступ к памяти и коду процесса.
>
> Ловушка: путать «дебаг API во вкладке Network» (это клиент смотрит HTTP) с inspect сервера. Network не останавливает строку Node. Другая — `--inspect` в публичном контейнере без firewall. Для не-Node стека — свои адаптеры (JVM debug, delve), идея та же: IDE/DevTools ↔ debug protocol.

---

# 4. Самое главное запомнить

- `node --inspect` / `--inspect-brk` → порт 9229.
- Chrome: `chrome://inspect` → Open dedicated DevTools.
- Dev: source maps для TypeScript.
- Не выставлять inspect в интернет на проде.
- Network вкладка ≠ server inspector.
- VS Code attach — тот же протокол.

---

# 5. Описание

## Быстрый старт

```bash
node --inspect dist/server.js
# или пауза до первого statement:
node --inspect-brk dist/server.js
```

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

## package.json

```json
{
  "scripts": {
    "dev": "node --watch --inspect dist/server.js",
    "dev:break": "node --inspect-brk dist/server.js"
  }
}
```

## Docker (только локально / VPN)

```text
docker run -p 3000:3000 -p 9229:9229 …
node --inspect=0.0.0.0:9229 …
```

Без ограничения сети — риск RCE через debugger.

## VS Code (attach)

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
| Тело запроса / заголовки | Scope на паузе |
| Только HTTP-ответ глазами | Client Network (не замена) |
| Продовый инцидент | Логи + APM; inspect — редко и осторожно |

---

# 6. Ссылки

- [Node.js — Debugging](https://nodejs.org/en/learn/getting-started/debugging)
- [Chrome — Node debugging](https://developer.chrome.com/docs/devtools/node)
- [VS Code — Node debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
