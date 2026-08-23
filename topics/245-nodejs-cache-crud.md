# 1. Тема

**Кеширование. Подключение баз данных к серверу, CRUD**

---

# 2. Главное в одну фразу

CRUD ходит в БД через пул соединений, а частые чтения закрывают слоем кеша с явной инвалидацией при записи — иначе клиент видит устаревшие данные.

---

# 3. Суть

> CRUD в Node — четыре операции над ресурсом: Create / Read / Update / Delete. Данные живут в БД; процесс подключается через пул (`pg.Pool`, драйвер Mongo и т.п.) по строке из конфига, а не через одно «вечное» соединение на весь процесс без контроля.
>
> Кеш ставят перед дорогими чтениями: первый `GET` при промахе идёт в БД и кладёт результат в `node-cache` или Redis; следующий тот же ключ отдаётся из кеша без запроса к диску. Так снижают латентность и нагрузку на БД при горячих ключах.
>
> Типичный приём — **cache-aside**: handler сам смотрит кеш → при miss читает БД → пишет в кеш. После `UPDATE`/`DELETE` ключ удаляют или обновляют. TTL ограничивает срок жизни, но не заменяет инвалидацию при своей же записи.
>
> Ловушка: забыть сбросить кеш после мутации — клиент долго получает старый снимок. Второй риск — держать пароль БД в коде и открывать новое соединение на каждый запрос вместо пула.

---

# 4. Самое главное запомнить

- CRUD = Create / Read / Update / Delete над одним ресурсом (часто REST: `POST`/`GET`/`PUT`/`DELETE`).
- К БД ходят через **пул** и connection string из env/конфига, не через хардкод секретов.
- Кеш ускоряет **повторяемые чтения**; источник истины — БД.
- **Cache-aside:** miss → БД → `set`; hit → ответ без БД; после записи — `del` ключа.
- TTL и инвалидация решают разные задачи: TTL — «не старше N», инвалидация — «сразу после своей мутации».
- Ключ кеша должен совпадать с логикой чтения (`user:42`), иначе hit никогда не случится или попадут чужие данные.

---

# 5. Описание

```text
клиент  GET /items/42
   │
   ▼
handler ──► cache.get("item:42")
               │
        hit ───┴─── miss
         │            │
         ▼            ▼
      ответ        DB SELECT
                      │
                      ▼
                 cache.set → ответ

клиент  PUT /items/42
   │
   ▼
handler ──► DB UPDATE ──► cache.del("item:42") ──► ответ
```

## Подключение к БД

В приложении обычно один пул на процесс:

```js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // ← из env
  max: 10,
});

export async function query(text, params) {
  return pool.query(text, params); // ← берёт соединение из пула
}
```

Пул переиспользует TCP-сессии к Postgres (или аналог у другого драйвера). На каждый HTTP-запрос не создают `new Client()` с `connect`/`end` — это дорого и легко исчерпать лимит соединений. Закрытие пула — при остановке процесса (`pool.end()`).

Выбор SQL vs документной БД и разбор async/конфигов сред — соседняя тема группы; здесь важен рабочий канал «handler ↔ хранилище» для CRUD.

## CRUD в handler

Минимальный каркас ресурса `items`:

| Операция | HTTP (типично) | Действие |
|----------|----------------|----------|
| Create | `POST /items` | `INSERT`, ответ `201` + тело |
| Read | `GET /items/:id` | `SELECT`, `404` если нет |
| Update | `PUT` / `PATCH` | `UPDATE`, затем сброс кеша |
| Delete | `DELETE /items/:id` | `DELETE`, сброс кеша |

Параметры всегда передают плейсхолдерами (`$1`, `$2`), не склейкой строк — защита от SQL-injection (см. группу Security). Транзакции нужны, когда несколько записей должны примениться атомарно; простой CRUD одной строки часто обходится одним запросом.

## Кеш: hit, miss, инвалидация

Слой может быть `node-cache` в процессе, Redis или обёртка над ними. Контракт один:

```js
import NodeCache from 'node-cache';

const itemCache = new NodeCache({ stdTTL: 60 }); // ← TTL в секундах

async function getItem(id) {
  const key = `item:${id}`;
  const cached = itemCache.get(key);
  if (cached !== undefined) return cached; // ← hit

  const { rows } = await pool.query(
    'SELECT id, title FROM items WHERE id = $1',
    [id],
  );
  const row = rows[0] ?? null;
  if (row) itemCache.set(key, row); // ← miss → fill
  return row;
}

async function updateItem(id, title) {
  await pool.query('UPDATE items SET title = $1 WHERE id = $2', [title, id]);
  itemCache.del(`item:${id}`); // ← после записи
}
```

**Hit** — ключ есть, БД не трогают. **Miss** — читают БД и заполняют кеш. **Инвалидация** — после мутации ключ убирают, чтобы следующий Read снова прошёл через БД и не отдал старый `title`.

Ограничения in-process `node-cache`: не шарится между инстансами Node и пропадает при рестарте. Redis/Memcached — общий слой для нескольких процессов. Кеш не заменяет БД: при холодном старте или после `del` истина снова в хранилище.

## Ловушки

- Запись в БД без `cache.del` → долгоживущий stale.
- Слишком широкий ключ (`items:all`) при частых точечных UPDATE — постоянные промахи или дорогая инвалидация всего списка.
- Кешировать персональные данные без учёта прав — риск утечки между пользователями.
- Путать HTTP-кеш браузера/`Cache-Control` с серверным cache-aside: это разные слои.

---

# 6. Ссылки

- [node-cache](https://www.npmjs.com/package/node-cache)
- [node-postgres — pools](https://node-postgres.com/features/pooling)
- [Redis — Caching](https://redis.io/docs/latest/develop/use/caching/)
- [MDN — HTTP methods (CRUD mapping)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)
- [PostgreSQL — SELECT / INSERT / UPDATE / DELETE](https://www.postgresql.org/docs/current/sql-select.html)
