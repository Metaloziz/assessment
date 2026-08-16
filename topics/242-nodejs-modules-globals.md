# 1. Тема

**Встроенные модули (http, fs) и глобальные переменные (global, process)**

---

# 2. Главное в одну фразу

В Node встроенные модули вроде `http` и `fs` дают сеть и диск, а `process` и `global` — доступ к окружению процесса без импорта.

---

# 3. Суть

> В Node.js «из коробки» есть модули ядра: `http` поднимает TCP/HTTP-сервер, `fs` читает и пишет файлы. Их подключают через `require('node:http')` / `import` — это не npm-пакеты, а API рантайма.
>
> Зачем: без сторонних фреймворков уже можно отдать ответ по HTTP и прочитать конфиг или статику с диска. Глобальные `process` и `global` (в ESM — `globalThis`) всегда рядом: аргументы CLI, переменные окружения, PID, выход из процесса.
>
> Как это стыкуется: обработчик `http` часто зовёт `fs.readFile`, порт берёт из `process.env`, пути — от `process.cwd()`. Модуль экспортирует функции; `global` — общее пространство имён процесса, не замена `module.exports`.
>
> Ловушка: путать браузерный `window` с `global`, блокировать event loop через `fs.readFileSync` в горячем пути и писать секреты в код вместо `process.env`. `http` сам по себе — низкоуровневый сервер, не роутер и не Express.

---

# 4. Самое главное запомнить

- `http` / `fs` — **built-in** модули (`node:`), не зависимости из `package.json`.
- `http.createServer` + `listen(port)` — минимальный HTTP-сервер; ответ закрывают через `res.end`.
- `fs.readFile` / promises — асинхронный I/O; `*Sync` блокирует поток, пока диск не ответит.
- `process.env`, `process.argv`, `process.cwd()`, `process.exit` — типичный контракт CLI и сервера.
- `global` / `globalThis` — общие глобалы процесса; в модулях данные держат в экспортах, а не в `global.foo`.
- В браузере нет этих API «как в Node»; на фронте их эмулируют бандлеры или полифилы только там, где это задумано.

---

# 5. Описание

```text
клиент HTTP
    │
    ▼
http.createServer(handler)     ← встроенный модуль
    │
    ├─ process.env.PORT        ← глобал процесса (порт, конфиг)
    ├─ process.cwd()           ← откуда считать относительные пути
    └─ fs.readFile(path)       ← встроенный модуль диска
            │
            ▼
       res.writeHead / res.end
```

## Встроенные модули

Модули ядра идут с установкой Node. Префикс `node:` в импорте явно говорит «это ядро», а не пакет из `node_modules`:

```js
import http from 'node:http';
import fs from 'node:fs/promises';
```

В CommonJS то же через `require('node:http')`. Список большой (`path`, `url`, `crypto`, …); в этой теме — два самых частых для первого сервера: сеть и файлы.

## `http` — минимальный сервер

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('ok'); // ← без end клиент будет ждать
});

server.listen(Number(process.env.PORT) || 3000);
```

`createServer` регистрирует обработчик; `listen` открывает порт ОС. Пока `listen` не вызван, входящие соединения не принимаются. Тело и заголовки ответа — ответственность обработчика: забыл `end` — «зависший» запрос.

Роутинг по `req.url` / методу, раздача `index.html` и middleware — следующий уровень (соседи по группе: рутинг и статика). Здесь важно: `http` — сокеты и сообщения протокола, не «фреймворк приложения».

## `fs` — диск без блокировки event loop

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const file = path.join(process.cwd(), 'public', 'hello.txt');
const text = await fs.readFile(file, 'utf8'); // ← I/O ждёт вне JS-потока
```

Асинхронный `readFile` / `createReadStream` отдаёт управление, пока ОС читает файл. `fs.readFileSync` в обработчике HTTP на каждое попадание держит весь процесс: другие запросы не обслуживаются, пока sync не вернётся.

Для больших файлов чаще стримы (`createReadStream` → `pipe` в `res`), а не чтение всего буфера в память.

## `process` — паспорт процесса

| API | Зачем |
|---|---|
| `process.env` | конфиг и секреты из окружения (`PORT`, `NODE_ENV`, ключи) |
| `process.argv` | аргументы CLI: `node app.js --port 3000` |
| `process.cwd()` | текущая рабочая директория запуска |
| `process.exit(code)` | завершение процесса (CI, ошибки старта) |
| `process.pid` | идентификатор процесса ОС |

`process` не импортируют в CJS — он глобален. В ESM его тоже можно брать как глобал или через `import process from 'node:process'`.

## `global` и `globalThis`

В Node `global` — объект глобальной области видимости процесса (аналог идеи `window`, но без DOM). Современный переносимый доступ — `globalThis`.

```js
// плохо: общая «корзина» на весь процесс
global.cache = global.cache || new Map();

// лучше: модуль со своим состоянием
export const cache = new Map();
```

Писать в `global` имеет смысл только для редких совместимостей или тестов. Обычные данные приложения живут в модулях и явной передаче зависимостей.

## Типичная склейка

Сервер читает порт из окружения, файл — относительно `cwd`, отдаёт через `http`:

```js
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.PORT) || 3000;

http
  .createServer(async (req, res) => {
    try {
      const body = await fs.readFile(path.join(process.cwd(), 'hello.txt'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('error');
    }
  })
  .listen(port);
```

В лабе тот же каркас разобран по кейсам: только `http`, контраст async/sync у `fs`, и `process.env` против загрязнения `global`.

---

# 6. Ссылки

- [Node.js — HTTP](https://nodejs.org/api/http.html)
- [Node.js — File system](https://nodejs.org/api/fs.html)
- [Node.js — Process](https://nodejs.org/api/process.html)
- [Node.js — Global objects](https://nodejs.org/api/globals.html)
- [Node.js — Modules: Packages / node: protocol](https://nodejs.org/api/packages.html)
