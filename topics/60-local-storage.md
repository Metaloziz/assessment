# 1. Тема

**localStorage**

---

# 2. Главное в одну фразу

`localStorage` — синхронное строковое key-value хранилище в браузере: переживает перезагрузку вкладки, привязано к origin, без автоматической отправки на сервер.

---

# 3. Суть

> **Web Storage**: `localStorage` (долгоживущее) и `sessionStorage` (до закрытия вкладки). API: `setItem` / `getItem` / `removeItem` / `clear` / `key` / `length`. Значения — **только строки**; объекты через `JSON.stringify` / `JSON.parse`.
>
> Лимит порядка **5–10 MB** на origin (зависит от браузера). API **синхронный** — большие записи могут подтормаживать main thread. Нет `HttpOnly`: всё читается JS → **не место для access-токенов** при XSS.
>
> Для объёмных/структурированных данных чаще IndexedDB; для секретов сессии — cookie с `HttpOnly` или memory + refresh-схема.

---

# 4. Самое главное запомнить

- Только строки; объекты — через JSON.
- Origin-scoped; не уходит на сервер само.
- Синхронно → осторожно с большими данными.
- Нет HttpOnly → уязвимо к XSS.
- QuotaExceeded — ловить в `try/catch`.
- Смотреть/править в Application → Local Storage.

| | localStorage | sessionStorage | cookie |
|---|---|---|---|
| Срок | Долго | Вкладка | По Max-Age / session |
| На сервер | Нет | Нет | Да (автоматически) |
| JS доступ | Да | Да | Если не HttpOnly |

---

# 5. Описание

### Базовый API

```typescript
localStorage.setItem('theme', 'dark')
const theme = localStorage.getItem('theme')

localStorage.setItem('prefs', JSON.stringify({ lang: 'ru', notifications: true }))
const prefs = JSON.parse(localStorage.getItem('prefs') || '{}')

localStorage.removeItem('theme')
// localStorage.clear()
```

### Безопасная запись

```typescript
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    // private mode / quota
    return false
  }
}
```

### Типичные применения

- тема, язык, UI-флаги;
- черновики форм (с оглядкой на чувствительные поля);
- кэш «лёгких» справочников.

### Чего избегать

- пароли, session tokens, ПДн без шифрования и политики;
- гигантские JSON как замена БД.

---

# 6. Ссылки

- [MDN — Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN — Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Chrome DevTools — Local storage](https://developer.chrome.com/docs/devtools/storage/localstorage/)
