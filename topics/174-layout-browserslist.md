# 1. Тема

**Browserslist**

---

# 2. Главное в одну фразу

Browserslist — общий конфиг целевых браузеров: один набор запросов читают Babel, Autoprefixer и другие инструменты сборки.

---

# 3. Суть

> **Browserslist** — конфиг «какие браузеры (и версии Node) поддерживаем». Запросы вроде `defaults`, `last 2 versions`, `> 0.5%` и `not dead` превращаются в конкретный список версий по данным **caniuse-lite**. Сам Browserslist бандл не собирает — он даёт этот список инструментам.

> Без общего конфига каждый плагин задаёт цели сам: Babel транспилирует под один набор, Autoprefixer добавляет префиксы под другой. CSS и JS «живут» в разных браузерах, а размер бандла и набор polyfill’ов разъезжаются.

> Конфиг кладут в `package.json` (`browserslist`) или в `.browserslistrc`. При сборке Babel (`@babel/preset-env`), Autoprefixer, PostCSS-пресеты и часть линтеров сами находят файл и берут один список. Можно развести окружения: `production` шире, `development` — последние Chrome/Firefox.

> Ловушка: дублировать `targets` только в `babel.config` и забывать общий Browserslist — или держать устаревший `caniuse-lite`. Тогда «мы на defaults» на бумаге, а реальное покрытие другое. Список проверяют `npx browserslist` в корне проекта.

---

# 4. Самое главное запомнить

- Browserslist = **общий** список целей; не замена Babel или Autoprefixer.
- Запросы (`defaults`, `> 0.5%`, `not dead`) → версии через **caniuse-lite**.
- Источник: ключ `browserslist` в `package.json` или файл `.browserslistrc`.
- `@babel/preset-env` и Autoprefixer читают конфиг сами, если не переопределены `targets` / `overrideBrowserslist`.
- Уже список → `npx browserslist`; покрытие фич — browsersl.ist / Can I Use.
- Узкий query (modern) режет transpile и префиксы; широкий (IE) раздувает бандл.
- Обновляйте `caniuse-lite` (через `npx update-browserslist-db`), иначе «свежие» запросы резолвятся по старым данным.

---

# 5. Описание

```text
package.json / .browserslistrc
        │  запросы: defaults, > 0.5%, not dead, …
        ▼
   Browserslist  +  caniuse-lite
        │  конкретные версии: chrome 120, firefox 121, …
        ▼
   ┌────────────┬────────────────┬─────────────┐
   │ Babel      │ Autoprefixer   │ PostCSS /   │
   │ preset-env │ (префиксы)     │ ESLint …    │
   └────────────┴────────────────┴─────────────┘
```

## Зачем один конфиг

Инструменты отвечают на один вопрос: «под какие браузеры готовить код?». Если ответ разный в каждом плагине, появляются лишние трансформы, лишние `-webkit-` и сюрпризы в старых браузерах. Один Browserslist — контракт команды и CI.

## Где писать

В `package.json`:

```json
{
  "browserslist": [
    "defaults",
    "not IE 11"
  ]
}
```

Или `.browserslistrc` (каждая строка — запрос, `#` — комментарий):

```text
# поддержка продукта
defaults
not dead
not IE 11
```

Окружения:

```json
{
  "browserslist": {
    "production": ["> 0.5%", "not dead"],
    "development": ["last 1 chrome version", "last 1 firefox version"]
  }
}
```

## Типичные запросы

| Запрос | Смысл |
| --- | --- |
| `defaults` | разумный набор: `> 0.5%`, `last 2 versions`, Firefox ESR, `not dead` |
| `> 0.5%` | доля рынка по статистике |
| `last 2 versions` | две последние мажорные версии каждого браузера |
| `not dead` | отсечь официально «мёртвые» браузеры |
| `not IE 11` | явное исключение |
| `baseline widely available` | цель по Baseline (современный вариант политики) |

Точный состав зависит от версии **caniuse-lite** в `node_modules`.

## Как подхватывают инструменты

- **Babel**: `@babel/preset-env` без своего `targets` берёт Browserslist → решает, какие синтаксис и helpers нужны.
- **Autoprefixer**: читает тот же конфиг → решает, какие вендорные префиксы оставить.
- Явный `targets` в Babel или `overrideBrowserslist` в Autoprefixer **перебивает** общий файл — удобно точечно, опасно как «второй источник правды».

## Проверка

```bash
npx browserslist
npx update-browserslist-db
```

Первая команда печатает разрешённый список. Вторая обновляет базу Can I Use у установленных пакетов.

## Ловушки

- Несколько конфигов в монорепо без `browserslistConfigFile` / корня — разные пакеты резолвят разное.
- `defaults` без пересмотра под аудиторию продукта: внутренний дашборд ≠ публичный лендинг с IE в аналитике.
- Путать Browserslist с полифилами: список задаёт **цели**, а `@babel/preset-env` + `core-js` / `polyfill.io` — отдельный слой runtime.

---

# 6. Ссылки

- [Browserslist (GitHub)](https://github.com/browserslist/browserslist)
- [browsersl.ist — разобрать query](https://browsersl.ist/)
- [Babel — preset-env targets / browserslist](https://babeljs.io/docs/babel-preset-env#browserslist-integration)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [web.dev — Browserslist и Baseline](https://web.dev/blog/browserslist-supports-baseline)
