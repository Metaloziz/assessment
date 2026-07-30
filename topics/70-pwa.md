# 1. Тема

**PWA**

---

# 2. Главное в одну фразу

PWA — веб-приложение с установкой на устройство, офлайном и «нативными» возможностями за счёт HTTPS, Service Worker и Web App Manifest.

---

# 3. Суть

> **Progressive Web App** объединяет веб и черты нативного клиента: **installability**, офлайн/кэш через **Service Worker**, метаданные оболочки через **manifest.webmanifest** (имя, иконки, `display`, `start_url`, theme color), часто **push**.
>
> Базовые требования: **HTTPS**, валидный manifest, SW, который контролирует scope и даёт офлайн-ответ (детали критериев install менялись — сверять актуальный Lighthouse/Chrome). Проверка: Application → Manifest / Service Workers, аудит **Lighthouse → PWA**.
>
> PWA не отменяет адаптивную вёрстку и безопасность: кэш может устареть, push требует согласия, store-дистрибуция всё ещё отдельный канал.

---

# 4. Самое главное запомнить

- Три кита: HTTPS + Service Worker + Manifest.
- Офлайн = стратегия кэша в SW.
- Manifest = «как выглядит установленное приложение».
- Lighthouse / Application — проверка готовности.
- Workbox упрощает precache/runtime caching.

| Компонент | Роль |
|---|---|
| Manifest | Иконки, имя, display, start_url |
| Service Worker | Кэш, офлайн, push |
| HTTPS | Доверие и требование платформы |

---

# 5. Описание

### Manifest (фрагмент)

```json
{
  "name": "Assessment Prep",
  "short_name": "Assessment",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#191919",
  "background_color": "#191919",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Подключение: `<link rel="manifest" href="/manifest.webmanifest" />`.

### Service Worker

Precache оболочки + runtime для API/статиков; на `activate` — удаление старых кэшей. Для генерации часто используют **Workbox**.

### Проверка в DevTools

- Application → Manifest (поля, иконки, ошибки);
- Service Workers (статус, update);
- Lighthouse → Progressive Web App.

### Типичные грабли

- SW закэшировал битый `index.html` → «сайт не обновляется»;
- нет иконок нужных размеров / неправильный `start_url`;
- push без ценности для пользователя → отзыв permission.

---

# 6. Ссылки

- [MDN — Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev — Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [MDN — Web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developer.chrome.com/docs/workbox/)
