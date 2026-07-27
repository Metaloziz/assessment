# 1. Тема

**CSRF (Cross-Site Request Forgery)**

---

# 2. Главное в одну фразу

CSRF — атака, при которой злоумышленник заставляет браузер жертвы отправить запрос на доверенный сайт от её имени, используя уже существующую сессию (обычно cookies).

---

# 3. Ответ для собеседования

> «Жертва залогинена на `bank.com`. Открывает `evil.com`, который инициирует POST на `bank.com`. Браузер **сам** прикрепляет cookies домена `bank.com` — это не «вкладка шлёт во вкладку», а запрос вредоносной страницы напрямую на сервер.
>
> Работает при cookie-based auth и state-changing действиях без CSRF-защиты.
>
> Защита: CSRF-токен, SameSite cookies (`Lax`/`Strict`), проверка Origin/Referer, re-auth для критичных операций.
> Bearer в header обычно не уязвим к классическому CSRF — браузер сам его не подставит.
> XSS ≠ CSRF, но XSS может украсть CSRF-токен.»

---

# 4. Самое главное запомнить

- Cookies привязаны к **домену**, не к вкладке.
- CSRF = подделка **действия**, не чтение ответа.
- Cookie-auth → нужна CSRF-защита.
- CSRF-токен + SameSite.
- Опасные действия не через GET.

---

# 5. Описание

## Уточнение механики

```
evil.com → POST https://bank.com/transfer
Браузер добавляет Cookie: session=...
bank.com выполняет действие
```

SOP мешает прочитать ответ; для CSRF достаточно выполнить действие.

## Защита

- Synchronizer CSRF token в form/header
- `SameSite=Lax|Strict; HttpOnly; Secure`
- Origin/Referer check
- Не использовать GET для изменений

---

# 6. Ссылки

- [OWASP CSRF](https://owasp.org/www-community/attacks/csrf)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
