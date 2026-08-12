# 1. Тема

**Атрибут `rel`: `noreferrer`, `noopener`, `nofollow`**

---

# 2. Главное в одну фразу

`rel` на ссылке и в `<a target="_blank">` задаёт отношение к документу назначения: отключает доступ к `window.opener`, скрывает Referer и подсказывает поисковикам не передавать «вес» ссылки.

---

# 3. Суть

> Атрибут **`rel`** (relationship) описывает связь текущей страницы с URL в `href`. Для обычных внешних ссылок важны три значения: **`noopener`**, **`noreferrer`** и **`nofollow`**. Их часто пишут вместе через пробел: `rel="noopener noreferrer nofollow"`.
>
> Зачем: ссылка с `target="_blank"` открывает вкладку, и без защиты новая страница может получить **`window.opener`** — ссылку на ваш `window`. Злоумышленный сайт способен перенаправить исходную вкладку (`opener.location = …`) — классический **tabnabbing**. `noopener` обрывает эту связь. `noreferrer` не отправляет заголовок Referer (и в современных браузерах обычно включает поведение noopener). `nofollow` — сигнал поисковым системам: не считать ссылку рекомендацией для ранжирования (UGC, реклама, недоверенный контент).
>
> Как ставить на практике. Внешние `target="_blank"` — как минимум `rel="noopener noreferrer"`. Для пользовательского контента и платных ссылок часто добавляют `nofollow` (или `sponsored` / `ugc` по правилам поисковиков). В React и многих линтерах (`eslint-plugin-react`) на `target="_blank"` без `rel` ругаются именно из‑за opener.
>
> Ловушка: путать `nofollow` с безопасностью сессии — он **не** защищает от XSS и не заменяет `noopener`. И наоборот: `noopener` не влияет на SEO. `noreferrer` скрывает источник перехода — удобно для приватности, но аналитика «откуда пришли» на стороне назначения пропадает.

---

# 4. Самое главное запомнить

| Значение | Эффект |
|----------|--------|
| `noopener` | Нет `window.opener` у новой вкладки; защита от tabnabbing |
| `noreferrer` | Не слать Referer (+ обычно как noopener) |
| `nofollow` | Подсказка поисковику: не передавать link equity |

- `target="_blank"` → почти всегда `rel="noopener noreferrer"`.
- `nofollow` — про SEO/доверие к ссылке, не про opener.
- Несколько значений: `rel="noopener noreferrer nofollow"`.

---

# 5. Описание

## Минимально безопасная внешняя ссылка

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Пример
</a>
```

```jsx
<a href={url} target="_blank" rel="noopener noreferrer">
  {label}
</a>
```

## Что ломает отсутствие `noopener`

```text
Ваша вкладка                         Вредоносная страница (_blank)
     │                                        │
     │  window.opener ───────────────────────►│
     │◄──── opener.location = phishing ───────│
```

Пользователь думает, что всё ещё на вашем сайте, а исходная вкладка уже на фишинге.

## `noreferrer` vs приватность и аналитика

- Без Referer сайт назначения не видит полный URL источника (часто только origin или ничего — зависит от Referrer-Policy).
- На своей стороне для метрик обычно смотрят клики у себя, а не Referer у чужого домена.
- Политика Referrer-Policy документа может дополнительно ограничивать Referer даже без `rel`.

## `nofollow` и соседи

| Значение | Типичный смысл |
|----------|----------------|
| `nofollow` | Не считать доверенной рекомендацией |
| `sponsored` | Реклама / платная ссылка (Google) |
| `ugc` | Контент пользователей (комменты, форум) |

Можно комбинировать: `rel="nofollow ugc noopener noreferrer"`.

## Что `rel` не делает

- Не санитизирует URL (`javascript:` в `href` проверяйте отдельно).
- Не заменяет CORS, CSP, HttpOnly.
- Не блокирует переход — только отношения и побочные каналы (opener / referrer / SEO-сигнал).

---

# 6. Ссылки

- [MDN: rel](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel)
- [MDN: rel=noopener](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noopener)
- [MDN: rel=noreferrer](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/noreferrer)
- [MDN: rel=nofollow](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/nofollow)
- [Google: Qualify outbound links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
