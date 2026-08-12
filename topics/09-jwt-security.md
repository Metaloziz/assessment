# 1. Тема

**Безопасность JWT (JSON Web Token)**

---

# 2. Главное в одну фразу

JWT безопасен только при правильном хранении, коротком TTL, явной проверке подписи и claims — сам по себе он не шифрует payload и не отзывается при logout.

---

# 3. Суть

> **JWT** — компактный токен из трёх частей: `header.payload.signature`. Сервер (или IdP) подписывает payload; клиент и API потом проверяют подпись. Payload — это JSON в Base64URL: его **легко прочитать без ключа**. Подпись доказывает целостность и происхождение, но не скрывает содержимое. Секреты, пароли и номера карт в claims класть нельзя.
>
> Зачем так делают: после login не обязательно держать серверную сессию на каждый запрос — API проверяет токен локально (подпись, `exp`, иногда `iss`/`aud`). Удобно для SPA, мобильных клиентов и межсервисных вызовов. Цена: пока токен валиден по сроку, его украденная копия работает как «ключ от двери», если нет доп. инфраструктуры отзыва.
>
> Как устроена безопасная схема. Access — короткий TTL, в `Authorization: Bearer` (не в URL). Verify на сервере с **явным** списком `algorithms` и проверкой claims — `decode` без `verify` недостаточен. Refresh — дольше живёт, но в `HttpOnly` + `Secure` + осмысленный `SameSite` cookie, с ротацией. Access в памяти процесса вкладки предпочтительнее `localStorage` при XSS-риске.
>
> Ловушка: «JWT = безопасно, потому что подписан». Подпись не шифрует; `alg: none` и algorithm confusion (RS256 → HS256) ломают доверие, если библиотека не ограничила алгоритмы. Logout «удалил из memory» не отзывает уже выданный access до `exp` — нужны короткий TTL, blacklist/`jti` или версия сессии.

---

# 4. Самое главное запомнить

- Payload читается кем угодно — это не шифрование (JWE — другая история).
- Всегда `verify` + whitelist `algorithms`; не полагаться на `decode`.
- Access короткий; refresh — в HttpOnly Secure cookie, не «вечный» access в `localStorage`.
- Токен не в query/логах; только HTTPS.
- Stateless → logout требует отзыва (`jti`, denylist, rotation) или очень короткого TTL.

| Угроза | Что закрывает |
|--------|----------------|
| Чтение секретов из токена | Не класть секреты в payload |
| XSS + кража access | Memory / HttpOnly; короткий TTL |
| Algorithm confusion / `none` | Явный `algorithms` при verify |
| Долгий ущерб после утечки | Короткий access + отзыв refresh |
| CSRF при cookie-refresh | SameSite + anti-CSRF стратегия |

---

# 5. Описание

## Структура

```text
eyJhbGciOiJSUzI1NiJ9.  ← header  (alg, typ) — Base64URL
eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiIsImV4cCI6…}.  ← payload — Base64URL, не шифр
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  ← signature
```

Типичные claims: `sub` (кто), `exp` (срок), `iat`, `iss`, `aud`, иногда `jti` (id токена для отзыва), роли/scopes — только то, что API реально проверяет.

## `decode` vs `verify`

```text
decode  → разобрать JSON; подпись не проверяется
verify  → подпись + (обычно) exp/iss/aud + algorithms
```

На API доверять можно только результату `verify`. Иначе атакующий подставит свой payload с `role: admin`.

## Algorithm confusion

Сервер ждёт **RS256** (проверка публичным ключом). Если принять токен с `alg: HS256` и использовать публичный ключ как HMAC-секрет — подпись может «пройти». Отдельно: `alg: none` без проверки. Защита — жёсткий whitelist, например `algorithms: ['RS256']`, и отказ от «alg из header как есть».

## Хранение в SPA

```text
Access  → memory (переменная модуля), TTL минуты
Refresh → Set-Cookie: HttpOnly; Secure; SameSite=…; Path=/auth
Запросы → Authorization: Bearer <access> + credentials для refresh-cookie
```

`localStorage` / JS-читаемая cookie удобны, но при XSS скрипт уносит access. HttpOnly не спасает от «API от имени пользователя», но прячет refresh от `document.cookie`.

## Logout и отзыв

Пока access не истёк, обычный JWT валиден на любом инстансе API. Варианты:

- очень короткий access + отзыв/ротация refresh;
- denylist по `jti` (Redis/БД) до `exp`;
- «версия сессии» в БД: при logout увеличить версию, в токене — старая.

Просто очистить state на клиенте недостаточно, если refresh или длинный access ещё живы.

## Частые ошибки

- Секреты и PII в payload «потому что подписано».
- Access на недели в `localStorage`.
- `jwt.decode` в middleware «для скорости».
- Verify без `algorithms` / без `exp`.
- Токен в URL (утечка в Referer, логах, истории).
- Считать проверку JWT полной **авторизацией** — это в основном AuthN; права на ресурс — отдельно.

## Связь с лабой

В лабе сценарии: читаемый payload, XSS+storage, algorithm confusion, TTL/refresh, logout без отзыва. Во вкладке «Код» — `auth.js` (issue/verify), `apiClient.ts` (memory + Bearer), `session.js` (refresh cookie + заготовка `jti`).

---

# 6. Ссылки

- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725 — JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP — JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [jwt.io](https://jwt.io/)
