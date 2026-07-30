# 1. Тема

**Безопасность cookie**

---

# 2. Главное в одну фразу

Безопасность cookie — это набор атрибутов и практик (`HttpOnly`, `Secure`, `SameSite`, срок, scope), которые закрывают XSS-кражу, перехват по HTTP и часть CSRF-сценариев.

---

# 3. Суть

> Три опорных флага: **`HttpOnly`** (не читать из JS), **`Secure`** (только HTTPS), **`SameSite`** (когда cookie уходит в cross-site запросах: `Strict` / `Lax` / `None`+`Secure`).
>
> Дополнительно: короткий **`Max-Age`**, узкий **`Path`/`Domain`**, отказ от чувствительных данных в значении (лучше opaque session id), ротация/инвалидация на logout.
>
> Cookie не серебряная пуля: XSS всё ещё может дергать API «как пользователь»; CSRF закрывают SameSite + токены/проверки; subdomain-атаки лечат правильным `Domain`.

---

# 4. Самое главное запомнить

- Auth cookie: HttpOnly + Secure + SameSite.
- `SameSite=None` без `Secure` браузеры отвергают.
- Не класть PII/пароли в значение cookie.
- Минимальный domain/path → меньше поверхность утечки.
- DevTools: Application → Cookies (флаги) + Network (факт отправки).

| Угроза | Что помогает |
|---|---|
| XSS-кража токена | HttpOnly |
| Перехват в сети | Secure (HTTPS) |
| CSRF | SameSite + anti-CSRF |
| Лишний scope | Path / Domain |

---

# 5. Описание

### Минимальный безопасный набор

```typescript
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // баланс UX и CSRF; для чувствительных операций — strict / CSRF-token
  maxAge: 60 * 60 * 1000,
  path: '/',
})
```

```http
Set-Cookie: session=…; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Lax
```

### SameSite — смысл

- **Strict** — почти не едет с чужого сайта (даже по ссылке).
- **Lax** — едет при top-level GET-навигации; хороший дефолт для многих сессий.
- **None** — нужен cross-site (встроенные виджеты); только с Secure.

### Типичные ошибки

- session без Secure на проде;
- JWT с полными правами в читаемой JS cookie / localStorage;
- `Domain=.example.com` «на всякий случай» для всех поддоменов;
- вечная cookie без ротации.

---

# 6. Ссылки

- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN — Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN — SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [RFC 6265 — Security Considerations](https://datatracker.ietf.org/doc/html/rfc6265#section-8)
