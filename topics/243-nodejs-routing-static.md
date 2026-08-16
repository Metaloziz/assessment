# 1. Тема

**Рутинг приложения и отдача статики**

---

# 2. Главное в одну фразу

На сервере Node каждый запрос разбирают по методу и пути: либо вызывают handler маршрута, либо отдают файл из корня статики — с жёсткой границей каталога.

---

# 3. Суть

> Рутинг приложения — это таблица «метод + путь → обработчик»: `GET /api/health` отвечает JSON, `POST /api/items` пишет в хранилище. Отдача статики — отдельный путь: для `GET /app.js` сервер читает файл из каталога вроде `public/` и ставит `Content-Type`.
>
> Зачем: один процесс обслуживает и API, и фронтовый бандл/ассеты. Без явного разбора URL всё уходит в один handler; без корня статики клиент не получит `index.html` и CSS.
>
> Как устроено: парсят `req.url` (pathname, без query), сопоставляют с маршрутами; если нет совпадения — пробуют файл относительно `public` через `path.join` / middleware вроде `express.static`. Порядок важен: сначала API, потом статика, в конце — 404 или fallback SPA на `index.html`.
>
> Ловушка: слепо склеивать путь клиента с диском (`public` + `../secret`) — path traversal. Нормализуют путь и проверяют, что итог остаётся внутри корня. Статика не заменяет роутер: это два слоя одного HTTP-сервера.

---

# 4. Самое главное запомнить

- Маршрут = **метод** (`GET`/`POST`/…) + **pathname** → один handler (или цепочка middleware).
- Статика = файл из **корня** (`public/`), не произвольный путь с клиента.
- `path.join(root, reqPath)` + проверка «результат внутри `root`» — защита от `..`.
- Порядок: API-маршруты → статика → 404 / SPA `index.html`.
- У файла нужен `Content-Type` (`.html`, `.css`, `.js`, …); иначе браузер плохо интерпретирует ответ.
- Фреймворк (`express.Router`, `express.static`) — удобная обёртка; в сыром `http` те же решения руками.

---

# 5. Описание

```text
клиент: GET /api/health  |  GET /style.css  |  GET /../secret
              │                    │                  │
              ▼                    ▼                  ▼
         ┌─────────────────────────────────────────────┐
         │  HTTP-сервер (Node)                         │
         │    1. таблица маршрутов  → handler / JSON   │
         │    2. корень public/     → fs + Content-Type│
         │    3. иначе              → 404 / index.html │
         └─────────────────────────────────────────────┘
              │                    │                  │
              ▼                    ▼                  ▼
           200 JSON            200 text/css        403/404
```

## Рутинг

В сыром `http` pathname берут из URL и сравнивают с таблицей:

```js
import http from 'node:http';
import { URL } from 'node:url';

const routes = {
  'GET /api/health': (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true })); // ← маршрут API
  },
};

http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const key = `${req.method} ${pathname}`;
  const handler = routes[key];
  if (handler) return handler(req, res);
  res.writeHead(404);
  res.end('not found');
}).listen(3000);
```

Во Express то же декларативнее: `app.get('/api/health', …)`, `app.use('/api', router)`. Смысл один — **явное** сопоставление запроса с кодом.

Параметры (`/users/:id`) и query (`?page=1`) — часть роутинга; query обычно не участвует в ключе маршрута, его читают отдельно (`URLSearchParams`). Детали query/REST — в группе «Сеть»; здесь важен слой «какой handler вызвать».

## Отдача статики

Каталог `public/` — корень файлов, которые можно отдать по HTTP:

```text
public/
  index.html
  style.css
  app.js
```

Минимальная идея без фреймворка:

```js
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public');

async function sendStatic(pathname, res) {
  const safe = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = path.resolve(root, '.' + safe); // ← /style.css → public/style.css
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403);
    return res.end('forbidden'); // ← path traversal
  }
  const body = await fs.readFile(file);
  res.writeHead(200, { 'Content-Type': typeFor(file) });
  res.end(body);
}
```

`express.static('public')` делает то же: ищет файл, ставит тип, кэш-заголовки, отдаёт 404 если нет файла. Для SPA часто добавляют fallback: неизвестный путь → `index.html`, чтобы клиентский роутер принял `/dashboard`.

## Порядок слоёв

Типичный порядок middleware:

1. Логирование / парсинг тела (если нужно).
2. **API-роуты** (`/api/…`).
3. **Статика** (`express.static`).
4. **Fallback** или 404.

Если статику поставить раньше API с пересекающимися путями, файл может «перехватить» запрос, который ждали в JSON-handler. Если fallback SPA стоит до API — все `/api/...` начнут отдавать HTML.

## Граница с соседними темами

- `http` / `fs` / `process` — как поднять сервер и читать диск (тема модулей).
- Здесь — **куда** направить запрос и **как** безопасно отдать файл.
- БД, кэш, конфиги сред — следующие темы группы NodeJS.
- HTTP-методы, статусы и REST как контракт API — группа «Сеть».

---

# 6. Ссылки

- [Node.js — HTTP](https://nodejs.org/api/http.html)
- [Node.js — Path](https://nodejs.org/api/path.html)
- [Express — Routing](https://expressjs.com/en/guide/routing.html)
- [Express — Serving static files](https://expressjs.com/en/starter/static-files.html)
- [MDN — MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types)
