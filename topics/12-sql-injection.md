# 1. Тема

**SQL Injection (SQL-инъекции)**

---

# 2. Главное в одну фразу

SQL Injection — атака, при которой пользовательский ввод внедряется в SQL и выполняется как часть запроса к базе, изменяя его логику.

---

# 3. Ответ для собеседования

> «Если ввод конкатенируется в SQL, атакующий меняет запрос: `' OR '1'='1' --` обходит логин.
>
> Типы: in-band (UNION), blind boolean/time-based, out-of-band.
>
> Главная защита — **prepared statements / parameterized queries**. ORM помогает, но raw с интерполяцией снова уязвим. Плюс: least privilege DB user, не светить SQL-ошибки клиенту, валидация/whitelist.»

---

# 4. Самое главное запомнить

- Ввод не должен менять структуру SQL.
- Prepared statements — основной щит.
- Конкатенация строк = уязвимость.
- ORM ≠ гарантия при raw queries.
- Минимальные права DB-пользователя.

---

# 5. Описание

```javascript
// Плохо
`SELECT * FROM users WHERE id = ${id}`

// Хорошо
await pool.query('SELECT * FROM users WHERE id = $1', [id]);
```

Также существует **NoSQL injection** (например, `$gt` в MongoDB) — валидировать типы.

---

# 6. Ссылки

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [PortSwigger SQLi](https://portswigger.net/web-security/sql-injection)
