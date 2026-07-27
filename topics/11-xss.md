# 1. Тема

**XSS (Cross-Site Scripting)**

---

# 2. Главное в одну фразу

XSS — атака, при которой злоумышленник внедряет вредоносный JavaScript на страницу, и браузер жертвы выполняет его в контексте доверенного сайта.

---

# 3. Ответ для собеседования

> «Типы: **Stored** (в БД), **Reflected** (из запроса в ответ), **DOM-based** (клиентский JS пишет небезопасный ввод в DOM).
>
> Последствия: кража cookies/токенов, действия от имени пользователя, фишинг.
>
> Защита: экранирование вывода (`textContent`, JSX `{}`), DOMPurify для HTML, CSP, HttpOnly cookies, серверная валидация.
> React экранирует по умолчанию, но `dangerouslySetInnerHTML`, `javascript:` URL и `eval` снова открывают XSS.»

---

# 4. Самое главное запомнить

- XSS = чужой JS в вашем origin.
- Stored / Reflected / DOM-based.
- Escape + sanitize + CSP + HttpOnly.
- Не `innerHTML` без санитизации.
- React ≠ полная защита.

---

# 5. Описание

| Опасно | Безопаснее |
|--------|------------|
| `innerHTML` | `textContent` |
| `dangerouslySetInnerHTML` | `{var}` или DOMPurify |
| `eval` / `new Function` | не использовать |
| `href={userInput}` | whitelist протоколов |

---

# 6. Ссылки

- [OWASP XSS](https://owasp.org/www-community/attacks/xss/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [PortSwigger XSS](https://portswigger.net/web-security/cross-site-scripting)
