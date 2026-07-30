# 1. Тема

**cookies**

---

# 2. Главное в одну фразу

Cookie — небольшой фрагмент данных, который сервер (или страница) сохраняет в браузере и который браузер автоматически прикладывает к подходящим HTTP-запросам.

---

# 3. Суть

> **Cookie** — механизм HTTP state: сервер отвечает заголовком `Set-Cookie`, браузер хранит пару имя/значение и при следующих запросах на подходящий origin/path отправляет заголовок `Cookie`.
>
> Типичные задачи: **сессия и auth**, персонализация, редко — трекинг. Объём маленький (порядка 4 KB на cookie), это не замена `localStorage` / IndexedDB.
>
> Ключевые атрибуты безопасности: **`HttpOnly`** (недоступно из JS → сильнее против XSS-кражи сессии), **`Secure`** (только HTTPS), **`SameSite`** (ограничивает отправку с чужих сайтов → снижает CSRF). Срок жизни задают `Max-Age` / `Expires`; без них cookie обычно сессионная.
>
> Смотреть и править cookie удобно в DevTools → **Application → Cookies** и в **Network** (Request/Response Headers).

---

# 4. Самое главное запомнить

- Установка: `Set-Cookie` от сервера (или ограниченно из JS через `document.cookie`).
- Отправка: браузер сам добавляет `Cookie` к запросам по правилам domain/path/Secure/SameSite.
- `HttpOnly` — JS не читает; `Secure` — только HTTPS; `SameSite` — cross-site политика.
- Cookie ≠ общее клиентское хранилище: размер мал, уходит на сервер автоматически.
- Для auth-токена в cookie обычно связка `HttpOnly` + `Secure` + продуманный `SameSite`.

| Атрибут | Эффект |
|---|---|
| `HttpOnly` | Нет доступа из `document.cookie` |
| `Secure` | Только по HTTPS |
| `SameSite=Strict\|Lax\|None` | Когда cookie уходит в cross-site запросах |
| `Max-Age` / `Expires` | Срок жизни |
| `Path` / `Domain` | Куда cookie привязана |

---

# 5. Описание

### Жизненный цикл

1. Сервер: `Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Lax`
2. Браузер сохраняет cookie для сайта.
3. Следующий запрос на тот же сайт (с учётом path/domain/SameSite): `Cookie: sessionId=abc123`.

Сессионная cookie (без `Max-Age`/`Expires`) живёт до закрытия браузера/профиля (поведение зависит от браузера). Постоянная — до истечения срока или явного удаления.

### Установка с сервера

```http
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

Несколько cookie — несколько заголовков `Set-Cookie`.

### Установка из JavaScript

```javascript
document.cookie = 'theme=dark; Path=/; Max-Age=604800; SameSite=Lax'
```

Так **нельзя** выставить `HttpOnly` — атрибут задаёт только сервер. Значит session token в `document.cookie` уязвим к XSS.

### SameSite кратко

- **Strict** — cookie почти не уходит с cross-site навигации/запросов.
- **Lax** — уходит при top-level GET-переходах (ссылка), не при cross-site POST из формы/iframe по умолчанию.
- **None** — нужна пара с `Secure`; иначе современные браузеры отклонят.

### Типичные ловушки

- Путать cookie с `localStorage`: storage не уходит на сервер сам и не защищается `HttpOnly`.
- Ставить auth cookie без `Secure` на проде.
- `SameSite=None` «чтобы заработало» без понимания CSRF.
- Ожидать, что `HttpOnly` cookie видна в JS — её там нет; это нормально.

В DevTools: Application → Cookies — список, флаги, размер; Network → выбранный запрос → Headers — факт отправки.

---

# 6. Ссылки

- [MDN — HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [RFC 6265](https://datatracker.ietf.org/doc/html/rfc6265)
- [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Chrome DevTools — Cookies](https://developer.chrome.com/docs/devtools/storage/cookies/)
