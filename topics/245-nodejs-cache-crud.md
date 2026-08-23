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
- `node-cache`: `get` при miss → `undefined`; `set(key, val, ttl?)`; `del` возвращает число удалённых.
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

## node-cache: конструктор, методы, свойства

[`node-cache`](https://www.npmjs.com/package/node-cache) — in-process кеш в памяти одного процесса Node. Один экземпляр на приложение, ключи — строки (число при `set`/`get` приводится к строке).

### `new NodeCache(options?)`

Объект настроек необязателен; без него TTL у ключей по умолчанию бессрочный (`stdTTL: 0`).

| Опция | По умолчанию | Зачем |
|-------|--------------|-------|
| `stdTTL` | `0` | Стандартный TTL **в секундах** для всех ключей. `0` — не истекают сами |
| `checkperiod` | `600` | Как часто (сек) фоново проверять и удалять просроченные ключи. `0` — без периодической проверки |
| `useClones` | `true` | `true` — при `get`/`set` копии значений (безопаснее для объектов). `false` — ссылки (быстрее; в лабе стоит `false`) |
| `deleteOnExpire` | `true` | `true` — просроченный ключ удаляется сам. `false` — остаётся в памяти, можно обработать событие `expired` |
| `maxKeys` | `-1` | Лимит числа ключей; при переполнении `set` бросает ошибку. `-1` — без лимита |
| `forceString` | `false` | Принудительно сериализовать значения в строку при записи |
| `errorOnMissing` | `false` | `true` — `get` по отсутствующему ключу бросает ошибку вместо `undefined` |
| `enableLegacyCallbacks` | `false` | Вернуть колбэки `(err, data)` вторым аргументом (устаревает в v6) |

```js
const itemCache = new NodeCache({
  stdTTL: 60,        // ← ключ живёт минуту, если не задан свой ttl в set
  checkperiod: 120,  // ← раз в 2 мин чистка просроченного
  useClones: false,  // ← как в server/src/routes/cacheLab.ts
});
```

### Методы (cache-aside и вокруг)

| Метод | Сигнатура (суть) | Поведение |
|-------|------------------|-----------|
| **`set`** | `set(key, value, ttl?)` → `boolean` | Записать ключ. `ttl` — секунды для **этого** ключа; если не передан — берётся `stdTTL`. Успех → `true` |
| **`get`** | `get(key)` → `value \| undefined` | Прочитать значение. Нет ключа или истёк TTL → **`undefined`** (не `null`) — это и есть **miss** |
| **`del`** | `del(key \| key[])` → `number` | Удалить один или несколько ключей; возвращает **число** удалённых (инвалидация после UPDATE) |
| **`has`** | `has(key)` → `boolean` | Есть ли ключ в кеше (без изменения статистики hit/miss) |
| **`take`** | `take(key)` → `value \| undefined` | `get` + `del` за один вызов — «прочитал и забрал» (OTP, одноразовые токены) |
| **`mget`** | `mget(keys[])` → `{ [key]: value }` | Несколько ключей разом; отсутствующие в объект не попадают |
| **`mset`** | `mset([{ key, val, ttl? }, …])` → `boolean` | Пакетная запись |
| **`ttl`** | `ttl(key, ttl?)` → `boolean` | Продлить или сменить TTL ключа; `ttl < 0` или `0` без второго аргумента — по сути удаление |
| **`getTtl`** | `getTtl(key)` → `number \| undefined` | Когда ключ истечёт: timestamp в **мс**, `0` если TTL нет, `undefined` если ключа нет |
| **`keys`** | `keys()` → `string[]` | Список всех ключей (отладка, осторожно на prod) |
| **`flushAll`** | `flushAll()` | Очистить весь кеш и сбросить счётчики |
| **`flushStats`** | `flushStats()` | Обнулить только статистику hit/miss, данные не трогать |
| **`close`** | `close()` | Остановить интервал `checkperiod` (перед выходом процесса) |

Для типичного CRUD с cache-aside в handler хватает **`get` → при miss запрос в БД → `set` → после мутации `del`**.

```js
const key = `item:${id}`;
const hit = itemCache.get(key);
if (hit !== undefined) return hit; // ← именно undefined, не !hit

itemCache.set(key, row, 30);       // ← свой TTL 30 с, перебивает stdTTL
itemCache.del(key);                // ← после UPDATE / DELETE
```

### Свойства и статистика

| Свойство / вызов | Что даёт |
|------------------|----------|
| **`options`** | Итоговые настройки экземпляра (в т.ч. `stdTTL`, `useClones`) |
| **`data`** | Внутреннее хранилище `{ [key]: { v, t } }` — для отладки; в коде приложения лучше не мутировать |
| **`stats`** | Текущие счётчики: `hits`, `misses`, `keys`, `ksize`, `vsize` |
| **`getStats()`** | То же, что `stats`, удобно логировать на health-check |

`NodeCache` наследует `EventEmitter`: можно подписаться на **`set`**, **`del`**, **`expired`**, **`flush`** — например, логировать инвалидацию или реагировать, если `deleteOnExpire: false`.

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
