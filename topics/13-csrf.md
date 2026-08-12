# 1. Тема

**CSRF (Cross-Site Request Forgery)**

---

# 2. Главное в одну фразу

CSRF — браузер жертвы сам отправляет state-changing запрос на ваш сайт с её cookie-сессией, потому что вредоносная страница инициировала запрос на ваш origin.

---

# 3. Суть

> **Cross-Site Request Forgery (CSRF)** — подделка **действия**, а не кража данных из ответа. Жертва залогинена на `bank.com` (сессия в cookie). Она открывает `evil.com`, тот инициирует `POST https://bank.com/transfer`. Браузер **сам** прикрепляет cookies домена `bank.com` — cookies привязаны к домену, не к «вкладке». Сервер видит валидную сессию и выполняет перевод.
>
> Когда это работает: cookie-based auth (или другая credential, которую браузер подставляет автоматически) + изменение состояния без дополнительной проверки «запрос реально с нашего UI». Same-Origin Policy мешает `evil.com` **прочитать** ответ банка, но для CSRF достаточно, чтобы действие **выполнилось**.
>
> Защита слоями. **CSRF-токен** (synchronizer): секрет в сессии + то же значение в форме/`X-CSRF-Token`; сервер сверяет. **`SameSite=Lax`/`Strict`** на session cookie — браузер не шлёт cookie в многих cross-site POST. Проверка **`Origin`/`Referer`**. Критичные операции — повторный пароль / MFA. Меняющие состояние методы — не через `GET` (картинка/`<img src>` не должны списывать деньги).
>
> Ловушка: Bearer в `Authorization` классический CSRF обычно не цепляет — браузер сам header не подставит. XSS ≠ CSRF, но XSS обходит CSRF-защиту: скрипт на вашем origin читает токен и шлёт запросы «легитимно». `SameSite=None` для кросс-сайтовых виджетов снова требует токен/Origin-check.

---

# 4. Самое главное запомнить

- Cookies → домен, не вкладка; браузер сам приложит их к запросу на ваш сайт.
- CSRF = выполнить действие от имени жертвы; читать JSON с `evil.com` SOP не даст.
- Cookie-сессия → CSRF-токен и/или SameSite (+ Origin).
- Не делать мутации через `GET`.
- XSS может украсть CSRF-токен; Bearer-header — другая модель угроз.

| Защита | Что даёт |
|--------|----------|
| CSRF token | Секрет, которого нет у `evil.com` |
| `SameSite=Lax/Strict` | Cookie не уйдёт в типичный cross-site POST |
| Origin / Referer | Откуда пришёл запрос |
| re-auth / MFA | Критичные действия |

---

# 5. Описание

## Механика

```text
victim: session cookie на bank.com

evil.com
  └── form/fetch/img → POST https://bank.com/transfer
        └── Cookie: session=…   ← браузер добавил сам
              └── bank выполняет перевод
```

```html
<!-- идея атаки (упрощённо) -->
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker" />
  <input name="amount" value="1000" />
</form>
<script>document.forms[0].submit()</script>
```

## CSRF-токен (сервер)

```javascript
// выдача: спрятать токен в сессии + отдать в HTML/JSON клиенту
req.session.csrf = crypto.randomBytes(32).toString('hex');

// мутация
if (req.body._csrf !== req.session.csrf) {
  return res.sendStatus(403);
}
```

Клиент шлёт токен в body или заголовке; `evil.com` его не знает (и из ответа банка не прочитает из-за SOP), если нет XSS.

## SameSite

- **Strict** — cookie почти не едет с чужого сайта.
- **Lax** — top-level GET-навигация ок; типичный cross-site POST без cookie — хороший дефолт для многих сессий.
- **None; Secure** — нужен cross-site; CSRF закрывают токеном/Origin отдельно.

## CSRF vs XSS vs CORS

| | CSRF | XSS |
|--|------|-----|
| Кто исполняет | браузер шлёт запрос «с cookie» | чужой JS **в вашем** origin |
| Цель | действие | код + часто кража сессии |
| SOP | ответ чужому сайту не отдать | не мешает скрипту на вашем origin |

CORS настраивает, может ли **JS с другого origin читать ответ**; это не замена CSRF-токена для cookie-сессий.

## Частые ошибки

- Session cookie без SameSite и без токена.
- «Защита» только проверкой custom header без CORS-осознанности (простые form POST header не пошлют — токен всё равно нужен для форм).
- Logout / смена email через `GET`.
- Считать SPA с Bearer полностью «как cookie» — модели разные.

## Связь с лабой и соседями

Лаба: атака form-POST, SameSite, CSRF-токен, отличие от Bearer. Рядом: **безопасность cookie**, **CORS**, **XSS**, **JWT** (хранение access).

---

# 6. Ссылки

- [OWASP — Cross-Site Request Forgery](https://owasp.org/www-community/attacks/csrf)
- [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN — SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value)
- [MDN — CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
