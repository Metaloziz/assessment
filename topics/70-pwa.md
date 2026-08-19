# 1. Тема

**Как веб-приложение превратить в PWA, особенности работы PWA**

---

# 2. Главное в одну фразу

PWA — это обычный сайт на HTTPS, который браузер может установить на устройство и частично запускать без сети: за это отвечают манифест, Service Worker и правила платформы.

---

# 3. Суть

> **Progressive Web App** — не отдельный фреймворк, а набор возможностей браузера. Вы уже открываете сайт во вкладке; PWA добавляет «иконку на домашнем экране», оболочку без адресной строки и офлайн за счёт кэша.
>
> Три опоры: **HTTPS** (или localhost при разработке), **Web App Manifest** — JSON с именем, иконками, `start_url`, `display`, цветами темы — и **Service Worker**, который перехватывает запросы и отдаёт оболочку из кэша, когда сети нет. Подробности жизненного цикла SW — в теме «Service workers»; здесь важно, что без SW установленное приложение не переживёт офлайн.
>
> Установка не «магия npm»: браузер проверяет манифест, иконки, secure context и активный SW в scope. Критерии в Chrome/Lighthouse менялись — сверяйте актуальный чеклист в DevTools → Application и аудите Lighthouse → PWA. Push, фоновая синхронизация и ярлык на рабочем столе — опциональные слои поверх той же базы.
>
> Ловушки: закэшированный битый `index.html` — «сайт не обновляется»; пустой или неполный manifest — нет кнопки «Установить»; push без пользы — пользователь отзывает permission. PWA не заменяет адаптивную вёрстку и безопасность API.

---

# 4. Самое главное запомнить

- PWA = HTTPS + manifest + Service Worker; каждый слой решает свою задачу.
- Manifest описывает, **как выглядит** установленное приложение (имя, иконки, `display`, `start_url`).
- Service Worker даёт **офлайн и ускорение** через стратегии кэша — см. тему «Service workers».
- Установка возможна только когда браузер считает набор критериев выполненным — проверяйте Application / Lighthouse.
- `display: standalone` убирает UI браузера; `browser` оставляет вкладку как у обычного сайта.
- Workbox и аналоги генерируют precache/runtime-кэш, но версионирование SW всё равно проектируют явно.

| Компонент | Зачем в PWA |
|---|---|
| HTTPS | Требование платформы и доверие к SW |
| Manifest | Иконка, имя, режим окна, стартовый URL |
| Service Worker | Кэш оболочки, офлайн, push (при поддержке) |

---

# 5. Описание

```text
  обычный сайт                    PWA после установки
  ─────────────                   ─────────────────
  HTTPS                           HTTPS
     │                               │
     ├─ manifest.webmanifest         ├─ иконка на экране
     │   (имя, icons, display)       ├─ standalone / minimal-ui
     │                               │
     └─ register('/sw.js')           └─ SW → Cache → офлайн-оболочка
```

## Из чего складывается PWA

Сначала у вас есть веб-приложение: HTML, CSS, JS, API. PWA — это когда браузер **может** предложить установку и открыть сайт почти как нативное приложение. «Progressive» значит, что без SW сайт всё равно работает во вкладке; каждый слой улучшает опыт, а не ломает базовый сценарий.

## Web App Manifest

JSON-файл с метаданными оболочки. Минимальный набор для учёбы и проверки в DevTools:

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

Подключение в HTML:

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#191919" />
```

Поле `display` задаёт, останется ли адресная строка: `browser` — как сайт; `standalone` — своё окно без UI браузера; `minimal-ui` — компромисс с минимальными контролами.

## Service Worker в связке PWA

SW регистрируют с главной страницы; в `install` часто кладут precache оболочки (`index.html`, CSS, JS), в `fetch` выбирают стратегию «кэш или сеть». Именно это даёт «открыл ярлык — приложение загрузилось, хотя Wi‑Fi пропал». Ошибки версионирования кэша и обновления SW одинаково болят и для PWA, и для «просто SW» — план отката и смена имени кэша обязательны.

## Установка и проверка

В Chrome: DevTools → **Application** → Manifest (поля, иконки, ошибки) и Service Workers (статус, update). **Lighthouse → Progressive Web App** — быстрый аудит критериев. На десктопе и мобильных UI установки разный, но логика та же: secure context + валидный manifest + контролирующий SW.

Типичные причины, почему кнопки «Установить» нет: HTTP вместо HTTPS, нет иконки нужного размера, SW не перехватывает `start_url`, manifest не linked из HTML.

## Что PWA не решает само

- Не заменяет store-публикацию, если нужны встроенные покупки платформы или жёсткая модерация.
- Не отменяет CORS, CSP и авторизацию на API.
- Push и background sync требуют согласия пользователя и поддержки браузера.
- Старый SW с агрессивным cache-first может показывать устаревший бандл — нужен процесс обновления (`skipWaiting`, смена версии кэша, UI «доступна новая версия»).

## Workbox

Библиотека от Google для генерации SW: precache списка файлов из сборки, runtime routes для API и статики, recipes для stale-while-revalidate. Ускоряет старт, но не снимает ответственность за стратегию кэша и тест офлайна.

---

# 6. Ссылки

- [MDN — Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev — Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [MDN — Web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Workbox](https://developer.chrome.com/docs/workbox/)
