# 1. Тема

**Service workers**

---

# 2. Главное в одну фразу

Service Worker — фоновый скрипт-прокси между страницей и сетью: кэш, офлайн, перехват `fetch`, push и фоновая синхронизация (при поддержке).

---

# 3. Суть

> SW работает в **отдельном потоке**, **без доступа к DOM**, только по **HTTPS** (и localhost). Жизненный цикл: `install` → `activate` → обработка `fetch` / `push` / … Регистрация: `navigator.serviceWorker.register(...)`.
>
> Главная модель — **перехват запросов** и ответ из Cache Storage или сети (стратегии cache-first, network-first, stale-while-revalidate). Отсюда офлайн PWA и ускорение повторов.
>
> Обновления версий кэша и SW нужно проектировать явно (`skipWaiting`, `clients.claim`, смена имени кэша), иначе пользователи залипают на старом бандле. Отладка: Application → Service Workers / Cache Storage.

---

# 4. Самое главное запомнить

- Прокси сети + кэш; не DOM.
- Только HTTPS (+ localhost).
- События: install, activate, fetch, push.
- Версионирование кэша обязательно.
- Основа офлайна и многих PWA-фич.

| Событие | Зачем |
|---|---|
| install | Precache статики |
| activate | Чистка старых кэшей |
| fetch | Стратегия ответа |
| push | Уведомления |

---

# 5. Описание

### Регистрация

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
  })
}
```

### Precache и fetch

```javascript
const CACHE = 'app-cache-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/', '/app.css', '/app.js'])))
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})
```

### Activate — удаление старых кэшей

```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
})
```

### Ограничения

- нет `localStorage` / прямого DOM;
- отладка обновлений часто требует Update on reload / Unregister в DevTools;
- ошибочный SW может «сломать» сайт кэшем — нужен bypass и план отката.

---

# 6. Ссылки

- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev — Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [Workbox](https://developer.chrome.com/docs/workbox/)
