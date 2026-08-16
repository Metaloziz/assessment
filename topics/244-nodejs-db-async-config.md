# 1. Тема

**SQL и NoSQL, асинхронность, конфиги сред**

---

# 2. Главное в одну фразу

В Node данные берут из SQL или NoSQL асинхронно через пул, а строку подключения и секреты читают из конфига среды — не из захардкоженного кода.

---

# 3. Суть

> SQL-хранилище держит данные в таблицах со схемой: строки, внешние ключи, `JOIN`, транзакции. NoSQL (документ, ключ-значение, колонки) даёт более гибкую форму записи — документ JSON, пара `key → value` — и другие компромиссы по запросам и согласованности. В Node оба варианта — внешний I/O: драйвер шлёт запрос по сети и ждёт ответ.
>
> Зачем: API не хранит всё в памяти процесса. Выбор модели зависит от формы данных и запросов: жёсткие связи и отчёты чаще тянут к SQL; документы и кэш-ключи — к NoSQL. Ошибка выбора — не «SQL плох», а несовпадение модели с задачей.
>
> Как устроено: handler не блокирует event loop синхронным ожиданием БД. Берут пул (`pg.Pool`, `mongodb` client), делают `await pool.query(…)` / `await collection.find(…)`, отпускают соединение. Параметры подключения (`DATABASE_URL`, хост, пароль) приходят из **конфига среды** (`process.env`, `.env` локально, секреты в CI/оркестраторе) — отдельно для dev / stage / prod.
>
> Ловушка: синхронный драйвер или долгий CPU в том же тике — остальные запросы встают. Вторая — зашить prod-пароль в репозиторий или один URL на все среды. CRUD и слой кеша — следующая тема; здесь важны модель данных, async I/O и откуда берётся конфиг.

---

# 4. Самое главное запомнить

- SQL = схема + таблицы + связи; NoSQL = другая модель (документ / KV / …), не «вместо SQL всегда».
- В Node доступ к БД — **async** (`await` + пул), не синхронная блокировка цикла.
- Пул ограничивает число соединений; каждый запрос занимает слот и возвращает его.
- `DATABASE_URL` / секреты — из `process.env` (или секретов платформы), не из кода в git.
- Dev / prod — разные значения одних и тех же ключей; `NODE_ENV` не заменяет явный URL БД.
- Параметризованные запросы (`$1`, плейсхолдеры) — отдельно от SQL-injection как темы безопасности, но в Node это норма по умолчанию.

---

# 5. Описание

```text
  request ──► handler ──await──► pool / client ──► SQL | NoSQL
                 │                      ▲
                 │                      │
                 └── читает config ◄────┘
                       process.env / .env
                       (dev ≠ prod URL)
```

## SQL и NoSQL

| | SQL | NoSQL (типично) |
| --- | --- | --- |
| Форма | таблицы, строки, схема | документ, KV, колонки… |
| Связи | `JOIN`, FK | вложение / отдельные коллекции |
| Запросы | декларативный SQL | API драйвера / свой язык |
| Когда | отчёты, транзакции, жёсткая целостность | гибкая форма, горизонтальный рост под свой паттерн |

В Node SQL часто через `pg` / `mysql2`; документы — через официальный драйвер MongoDB. Оба возвращают Promise / поддерживают `async/await`.

```js
// SQL: схема известна заранее
const { rows } = await pool.query(
  'SELECT id, email FROM users WHERE id = $1', // ← плейсхолдер
  [userId],
);
```

```js
// документ: форма ближе к объекту приложения
const user = await db.collection('users').findOne({ _id: userId }); // ← документ
```

Выбор модели — про **форму данных и запросы**, не про моду. Один сервис может использовать и Postgres, и Redis: разная роль (система записи vs кэш) — это уже граница со следующей темой.

## Асинхронность доступа

Event loop Node обслуживает много соединений на одном потоке. Пока handler ждёт сеть БД, цикл должен быть свободен принимать другие запросы.

```js
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); // ← пул

export async function getUser(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]); // ← await
  return rows[0] ?? null;
}
```

Плохо: синхронный вызов, который держит поток, или «ручной» busy-wait. Хорошо: `await` на I/O, ошибки через `try/catch` / отказ Promise, таймауты на стороне пула/клиента. Тяжёлый CPU (хеш, парсинг гигантского JSON) — не задача драйвера БД; для этого — worker threads (отдельная тема группы).

## Конфиги сред

Один и тот же код поднимается в разных средах с **разными** значениями:

```text
.env.development   DATABASE_URL=postgres://localhost:5432/app_dev
(секреты CI/prod)  DATABASE_URL=postgres://…/app_prod
```

```js
// config.js
export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL, // ← обязательно из среды
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required'); // ← fail fast
}
```

Локально удобен `.env` (через `dotenv` или встроенную загрузку), в проде — переменные оркестратора / секрет-хранилища. Файл с паролями **не** коммитят. `NODE_ENV=production` включает режим приложения; URL БД и ключи всё равно задают явно.

## Граница с соседними темами

- Рутинг и статика — как принять HTTP; здесь — откуда handler берёт данные и настройки.
- Кеш и CRUD — следующая тема: операции create/read/update/delete и слой кеша над БД.
- Worker threads — CPU offload, не замена async I/O к БД.

---

# 6. Ссылки

- [Node.js — Environment variables](https://nodejs.org/api/process.html#processenv)
- [node-postgres (pg) — Pool](https://node-postgres.com/features/pooling)
- [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [dotenv](https://github.com/motdotla/dotenv)
- [Twelve-Factor App — Config](https://12factor.net/config)
