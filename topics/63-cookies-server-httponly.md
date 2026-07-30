# 1. Тема

**Установка cookies сервером, httpOnly**

---

# 2. Главное в одну фразу

Сервер выставляет cookie через `Set-Cookie`; флаг `HttpOnly` запрещает чтение этой cookie из JavaScript и снижает риск кражи сессии через XSS.

---

# 3. Суть

> Установка с сервера: заголовок **`Set-Cookie`** (в Express — `res.cookie(...)`). Для auth/session почти всегда нужны **`HttpOnly`**, **`Secure`** (HTTPS) и осмысленный **`SameSite`**, плюс `Path`/`Max-Age`.
>
> **`HttpOnly`** означает: значение **не попадает** в `document.cookie`. XSS-скрипт не может просто прочитать токен и утащить его на свой сервер. Полностью XSS не отменяет (можно дергать API от имени пользователя), но кражу самого секрета усложняет.
>
> Клиент **не может** выставить `HttpOnly` через `document.cookie` — только сервер. Поэтому «положили JWT в localStorage» и «HttpOnly cookie» — разные модели угроз.

---

# 4. Самое главное запомнить

- Сервер: `Set-Cookie` / `res.cookie`.
- `HttpOnly` → нет доступа из JS.
- Для сессии: HttpOnly + Secure + SameSite (+ короткий TTL / refresh).
- JS-установка cookie не умеет HttpOnly.
- Смотреть флаги: Application → Cookies; отправку — Network → Request Headers.

| Способ | HttpOnly возможен? |
|---|---|
| `Set-Cookie` с сервера | Да |
| `document.cookie` | Нет |
| localStorage | Нет (и всегда читается JS) |

---

# 5. Описание

### Express-пример

```typescript
res.cookie('authToken', authToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // или 'lax' под UX/навигацию
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
})
```

Эквивалент заголовка:

```http
Set-Cookie: authToken=…; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Strict
```

### Что даёт HttpOnly на практике

```javascript
document.cookie // не содержит HttpOnly-cookie
```

Даже при XSS злоумышленник не вытаскивает значение напрямую. Зато может выполнять запросы с cookie браузера (отсюда важность CSRF-защит и SameSite).

### Антипаттерн

Хранить session access token только в `localStorage` / обычной cookie без HttpOnly — при XSS токен копируется одной строкой.

---

# 6. Ссылки

- [MDN — Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
