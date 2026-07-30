# 1. Тема

**devTools (network, application)**

---

# 2. Главное в одну фразу

Network показывает, что и как грузится по сети; Application — что лежит в клиентских хранилищах и как устроены SW/кэш/manifest.

---

# 3. Суть

> **Network** — лента HTTP(S)-запросов: статус, размер, timing, headers/body, waterfall. Нужна для медленных API, лишних round-trip, кэша, приоритета ресурсов, WebSocket-фреймов.
>
> **Application** (Storage) — Local/Session Storage, Cookies, IndexedDB, Cache Storage, Service Workers, Manifest. Нужна, чтобы увидеть состояние приложения: токены, кэш PWA, устаревшие данные.
>
> Вместе это основной контур отладки «сеть ↔ локальное состояние» без правок кода. Фильтры (Fetch/XHR, JS, Img), Disable cache и Preserve log — обязательные привычки при разборе.

---

# 4. Самое главное запомнить

- Network = запросы и timing; Application = storage / SW / manifest.
- Waterfall показывает параллелизм и блокировки загрузки.
- Cookies и storage смотрят в Application; факт отправки cookie — ещё и в Network → Headers.
- Disable cache при отладке загрузки; Preserve log — при редиректах/навигации.
- Для API удобен фильтр Fetch/XHR + вкладка Timing/Response.

| Вкладка | Зачем |
|---|---|
| Network | Запросы, waterfall, headers, payload |
| Application | Storage, cookies, IndexedDB, SW, cache |

---

# 5. Описание

### Network

- список запросов с методом, URL, статусом, initiator;
- **Headers / Payload / Preview / Response**;
- **Timing**: DNS, connect, TTFB, download;
- throttling CPU/сети для воспроизведения медленных условий.

Типичные сценарии: «почему API 800 ms», «кто тянет огромный JS», «почему ресурс не из кэша».

### Application

- **Local/Session Storage** — ключи/значения, правка на лету;
- **Cookies** — флаги HttpOnly/Secure/SameSite, срок, domain/path;
- **IndexedDB** — object stores и записи;
- **Cache Storage** — кэши Service Worker;
- **Service Workers** — регистрация, update, skipWaiting;
- **Manifest** — для PWA.

### Практический порядок отладки

1. Воспроизвести баг с открытым Network (Preserve log).
2. Найти проблемный запрос → статус/тело/timing.
3. Сверить cookies/token в Application.
4. Если офлайн/кэш — Cache Storage и SW.

---

# 6. Ссылки

- [Chrome DevTools — Network](https://developer.chrome.com/docs/devtools/network/)
- [Chrome DevTools — Application](https://developer.chrome.com/docs/devtools/storage/)
- [Chrome DevTools — Cookies](https://developer.chrome.com/docs/devtools/storage/cookies/)
