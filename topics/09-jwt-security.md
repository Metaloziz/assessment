# 1. Тема

**Безопасность JWT (JSON Web Token)**

---

# 2. Главное в одну фразу

JWT безопасен только при правильном хранении, коротком TTL, надёжной подписи и серверной проверке — сам по себе он не шифрует данные и не отзывается автоматически.

---

# 3. Ответ для собеседования

> «JWT = header.payload.signature. Payload только base64, **не шифрован** — секреты туда нельзя.
>
> Хранение: memory или httpOnly+Secure+SameSite cookie, не localStorage при XSS-риске.
> Короткий access TTL + refresh с rotation/отзывом.
> Verify: подпись, `exp`, `iss`, `aud`, явный `algorithms` (защита от algorithm confusion).
> Только HTTPS, Bearer в header, не в URL.
> Stateless → для logout нужен blacklist/`jti`/короткий TTL.»

---

# 4. Самое главное запомнить

- Payload не секретен.
- Не хранить access token в localStorage при XSS.
- Короткий access + защищённый refresh.
- Всегда `verify`, не только `decode`.
- Explicit algorithms; механизм отзыва.

---

# 5. Описание

## Угрозы

- XSS + localStorage
- Algorithm confusion (`none` / HS256 vs RS256)
- Слабый секрет, долгий TTL
- Токен в URL/логах
- Невозможность отзыва без доп. инфраструктуры

## Практика для SPA

```
Access → memory (короткий TTL)
Refresh → httpOnly Secure SameSite cookie
HTTPS + CSRF defense если cookie-based
```

---

# 6. Ссылки

- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725 — JWT BCP](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [jwt.io](https://jwt.io/)
