# 1. Тема

**CSP (Content Security Policy)**

---

# 2. Главное в одну фразу

CSP — HTTP-заголовок с whitelist источников скриптов, стилей и других ресурсов; снижает риск XSS и data injection.

---

# 3. Ответ для собеседования

> «Сервер шлёт `Content-Security-Policy`, браузер блокирует всё вне whitelist.
>
> Директивы: `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `frame-ancestors`, `object-src 'none'`.
> Избегать `'unsafe-inline'` / `'unsafe-eval'`; для inline — **nonce** или **hash**.
> Внедрение: сначала `Content-Security-Policy-Report-Only`, потом enforce.
> CSP — второй рубеж, не замена санитизации.»

---

# 4. Самое главное запомнить

- Whitelist через HTTP-заголовок.
- Цель №1 — XSS.
- Не использовать `'unsafe-inline'` в prod.
- nonce/hash вместо inline без контроля.
- Report-Only → затем enforce.

---

# 5. Описание

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-rAnd0m';
  object-src 'none';
  frame-ancestors 'none';
```

`frame-ancestors` — защита от clickjacking (альтернатива/дополнение к X-Frame-Options).

---

# 6. Ссылки

- [MDN — CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
