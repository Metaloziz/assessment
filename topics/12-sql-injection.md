# 1. Тема

**SQL Injection (SQL-инъекции)**

---

# 2. Главное в одну фразу

SQL Injection — когда пользовательский ввод склеивается с SQL и исполняется как часть запроса, меняя логику выборки, логина или даже структуру данных.

---

# 3. Суть

> **SQL Injection (SQLi)** — атака на слой доступа к БД: недоверенная строка попадает в текст SQL (через конкатенацию или небезопасный шаблон) и становится операторами, условиями или комментариями. Классика: `' OR '1'='1' --` в поле пароля превращает проверку логина в «всегда истина». Браузер тут ни при чём — уязвимость на сервере в том, как собирают запрос.
>
> Зачем это критично: через один endpoint можно обойти auth, вытащить чужие строки (`UNION SELECT`), изменить или удалить данные, иногда дойти до файлов ОС или RCE — зависит от СУБД и прав учётки приложения. Ошибки SQL в ответе клиенту ещё и подсказывают структуру схемы.
>
> Главная защита — **не смешивать код SQL и данные**: prepared statements / parameterized queries (`$1`, `?`, плейсхолдеры ORM). Структура запроса фиксирована, значение уходит отдельно и не парсится как SQL. Дополнительно: least privilege для DB-user, whitelist для имён колонок/сортировки (их часто нельзя параметризовать), не отдавать сырые SQL-ошибки наружу, валидация типов.
>
> Ловушка: «у нас ORM / QueryBuilder» ≠ безопасно. `.raw()`, интерполяция в `whereRaw`, динамический `ORDER BY ${userSort}` снова открывают SQLi. Отдельно — **NoSQL injection** (например, операторы вроде `$gt` в MongoDB): та же идея — ввод меняет семантику запроса, лечится типизацией и запретом «сырого» объекта из клиента.

---

# 4. Самое главное запомнить

- Ввод не должен менять **структуру** SQL — только значения.
- Prepared statements / bind-параметры — основной щит.
- Конкатенация `` `...${user}` `` в SQL = уязвимость.
- ORM помогает, пока нет raw/интерполяции идентификаторов.
- DB-user приложения — минимальные права; ошибки SQL — в логи, не клиенту.

| Плохо | Хорошо |
|-------|--------|
| `` WHERE id = ${id} `` | `WHERE id = $1` + `[id]` |
| `ORDER BY ${sort}` | whitelist: `id` \| `created_at` |
| ` knex.raw(\`…${x}\`) ` | `raw('…?', [x])` / билдер |

---

# 5. Описание

## Как ломается запрос

```text
Ожидали:
  SELECT * FROM users WHERE email = 'a@b.c' AND password_hash = '…'

Ввели в email:  ' OR '1'='1' --
Получили:
  SELECT * FROM users WHERE email = '' OR '1'='1' --' AND password_hash = '…'
```

Комментарий `--` отрезает остаток условия; логин обойдён, если приложение смотрит «нашлась ли строка».

## Parameterized query

```javascript
// Плохо — конкатенация
await pool.query(`SELECT * FROM users WHERE id = ${id}`);

// Хорошо — плейсхолдер (pg)
await pool.query('SELECT * FROM users WHERE id = $1', [id]);

// Идентификаторы (ORDER BY) — только whitelist
const sort = sortKey === 'created_at' ? 'created_at' : 'id';
await pool.query(`SELECT * FROM posts ORDER BY ${sort} DESC`);
```

## Виды (кратко)

| Класс | Идея |
|-------|------|
| In-band (в т.ч. UNION) | Результат атаки в том же ответе |
| Blind boolean / time-based | Истина/ложь или задержка по ответу/времени |
| Out-of-band | СУБД сама ходит наружу (DNS/HTTP), редко |

Для практики важнее не классификация, а привычка всегда биндить значения.

## NoSQL (рядом)

```javascript
// Плохо: req.body.filter как есть → { password: { $gt: '' } }
users.find({ username, password: req.body.password });

// Лучше: явные строки/хеш, схема валидации (zod и т.п.)
```

## Частые ошибки

- Экранировать кавычки вручную вместо плейсхолдеров.
- Склеивать список `IN (${ids.join(',')})` без bind каждого id.
- Динамический SQL для отчётов «на лету» из UI-фильтров.
- Суперuser БД у приложения «чтобы миграции работали».

## Связь с лабой

Сценарии: обход логина, UNION-утечка, слепая инъекция по времени/условию, защита параметрами. В «Код» — уязвимый и безопасный Node/`pg`, whitelist сортировки.

---

# 6. Ссылки

- [OWASP — SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP — SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PortSwigger — SQL injection](https://portswigger.net/web-security/sql-injection)
- [OWASP — NoSQL Injection](https://owasp.org/www-community/attacks/NoSQL_injection)
