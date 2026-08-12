# 1. Тема

**X-Frame-Options**

---

# 2. Главное в одну фразу

`X-Frame-Options` — HTTP-заголовок, который запрещает или ограничивает встраивание страницы в `<iframe>` / `<frame>` / `<object>`, чтобы снизить риск clickjacking.

---

# 3. Суть

> **Clickjacking** — жертва видит «безобидную» страницу, а поверх (или под прозрачным слоем) лежит ваш UI в iframe: клик уходит на «Удалить аккаунт» или «Перевести деньги». **`X-Frame-Options` (XFO)** говорит браузеру: эту страницу нельзя (или почти нельзя) показывать во фрейме.
>
> Зачем: любые экраны с опасным действием в один клик — настройки, платежи, админка. Без запрета встраивания чужой сайт может наложить ваш origin поверх своей разметки. Заголовок выставляет **сервер** (или CDN/прокси); клиентский JS его не «включит» надёжно.
>
> Как работает. Значения: **`DENY`** — нигде не встраивать; **`SAMEORIGIN`** — только если родитель с того же origin; устаревший **`ALLOW-FROM uri`** в современных браузерах почти не поддерживается. Современная замена и расширение — CSP-директива **`frame-ancestors`** (список разрешённых родителей, в том числе `'none'`). Если заданы оба, в актуальных браузерах приоритет у CSP `frame-ancestors`.
>
> Ловушка: ставить XFO через `<meta http-equiv>` — браузеры это **игнорируют**; нужен именно HTTP-заголовок ответа. `SAMEORIGIN` не защитит, если атакующий контролирует другую страницу **на вашем же** origin. XFO не заменяет CSRF-токены и не лечит XSS.

---

# 4. Самое главное запомнить

| Значение / механизм | Смысл |
|---------------------|--------|
| `DENY` | Запрет встраивания везде |
| `SAMEORIGIN` | Только свой origin как родитель |
| `frame-ancestors` (CSP) | Современный whitelist родителей |
| meta http-equiv | **Не работает** для XFO |

- Цель — clickjacking, не XSS и не CSRF.
- Выставлять на сервере / edge.
- Для гибкого whitelist — `Content-Security-Policy: frame-ancestors …`.
- Критичные UI: по умолчанию `DENY` или `frame-ancestors 'none'`.

---

# 5. Описание

## Заголовок

```http
X-Frame-Options: DENY
X-Frame-Options: SAMEORIGIN
```

```text
evil.com
  └── <iframe src="https://bank.com/transfer">
        └── браузер смотрит X-Frame-Options / frame-ancestors
              ├── DENY / 'none'     → пустой/заблокированный фрейм
              └── разрешено         → UI банка внутри evil.com → clickjacking
```

## Express / nginx (примеры)

```js
// express
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  // современнее / гибче:
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});
```

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Content-Security-Policy "frame-ancestors 'self'" always;
```

## XFO vs `frame-ancestors`

| | X-Frame-Options | CSP `frame-ancestors` |
|--|-----------------|------------------------|
| Гибкость | DENY / SAMEORIGIN | список origin, `'self'`, `'none'` |
| Поддержка | старые и новые браузеры | современные |
| meta-тег | нет | CSP иногда через meta, но **frame-ancestors в meta не действует** — только HTTP |

На практике часто шлют оба на переходный период, либо сразу CSP с `frame-ancestors`.

## Связь с другими темами

- **CSP** — полный заголовок политики; `frame-ancestors` — часть CSP.
- **iframe** — сторона встраивающего; XFO / frame-ancestors — сторона **встраиваемого**.
- Clickjacking ≠ CSRF: при clickjacking пользователь сам кликает по вашему UI; при CSRF запрос уходит без такого «обмана кликом» по вашему фрейму.

---

# 6. Ссылки

- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
- [OWASP: Clickjacking](https://owasp.org/www-community/attacks/Clickjacking)
- [OWASP: Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
