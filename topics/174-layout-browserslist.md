# 1. Тема

**Browserslist**

---

# 2. Главное в одну фразу

Browserslist — общий список целевых браузеров, чтобы CSS и JavaScript готовились под одних и тех же людей, а не под два разных «минимума».

---

# 3. Суть

> Сборка должна знать, **для каких браузеров** готовить CSS и JavaScript. **Browserslist** — не бандлер и не полифил, а общий список целей: короткие запросы вроде «последние две версии, без мёртвых». По ним смотрят статистику Can I Use (`caniuse-lite`) и получают конкретные версии — Chrome 120, Firefox 121 и так далее.
>
> Babel решает, какой синтаксис ещё переписывать. Autoprefixer — какие `-webkit-` оставить. Если каждый пишет цели сам, JS и CSS «живут» в разных браузерах: лишний размер бандла или сюрприз в старом Safari.
>
> Список кладут в `package.json` (ключ `browserslist`) или в `.browserslistrc`. Инструменты сами его находят, пока им не подсунуть свой `targets`. Можно развести `production` (шире) и `development` (свежий Chrome — быстрее сборка). Кто реально в списке — `npx browserslist`.
>
> Ловушка: цели только в Babel, без общего файла — или устаревший `caniuse-lite`. На бумаге `defaults`, по факту другой набор. Какие слои тулчейна включать под этот список — соседняя тема.

---

# 4. Самое главное запомнить

- Browserslist задаёт **кого** поддерживаем; сам код не транспилирует и префиксы не пишет.
- Запросы в файле — не готовый список: конкретные версии считает `caniuse-lite`.
- Один источник: ключ `browserslist` в `package.json` или файл `.browserslistrc`.
- `@babel/preset-env` без `targets` и Autoprefixer без `overrideBrowserslist` читают тот же файл.
- Свой `targets` в Babel — второй источник правды: CSS легко уедет в другую сторону.
- Узкий список режет трансформы и префиксы; широкий (вплоть до IE) раздувает бандл.
- Базу обновляют `npx update-browserslist-db`, иначе «свежие» запросы резолвятся по старым данным.

---

# 5. Описание

```text
package.json / .browserslistrc
        запросы: последние версии, доля рынка, не мёртвые
        │
        ▼
   Browserslist  +  данные Can I Use
        конкретные версии браузеров
       ↙                         ↘
  JS-сборка                   CSS-префиксы
  Babel preset-env            Autoprefixer
```

## Зачем один список

Инструменты отвечают на один вопрос: «под каких людей готовить код?». Если Babel думает про IE, а Autoprefixer — про свежий Chrome, в одном релизе окажутся тяжёлый JavaScript и «голый» CSS. Один Browserslist — договор команды и CI, а не ещё один плагин в цепочке.

Это про **цели**. Какие слои тулчейна реально включать (transpile, polyfill, префиксы) — тема «Определение инструментов в зависимости от используемых браузеров». Как Autoprefixer стоит в цепочке PostCSS — тема PostCSS.

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

Или `.browserslistrc` — каждая строка запрос, `#` комментарий:

```text
# поддержка продукта
defaults
not dead
not IE 11
```

Два окружения — когда в dev достаточно свежего Chrome, а в prod список шире:

```json
{
  "browserslist": {
    "production": ["> 0.5%", "not dead"],
    "development": ["last 1 chrome version", "last 1 firefox version"]
  }
}
```

## Что значат запросы

Пишете не «Chrome 120», а правило. Состав зависит от версии `caniuse-lite` в `node_modules`.

| Запрос | Житейски |
| --- | --- |
| `defaults` | разумный набор: заметная доля рынка, свежие версии, без официально мёртвых |
| `> 0.5%` | браузеры, которыми пользуется больше полпроцента |
| `not IE 11` | явное «этот браузер больше не наш» |

`last 2 versions` — две последние мажорные версии каждого браузера. `not dead` отсекает то, что Can I Use считает мёртвым. Современный вариант политики — `baseline widely available` (Baseline). Точный состав всегда лучше посмотреть командой, чем угадывать по памяти.

## Как подхватывают инструменты

**Babel.** `@babel/preset-env` без своего `targets` берёт Browserslist и решает, какой синтаксис ещё переписать в более старый.

**Autoprefixer.** Читает тот же конфиг и решает, какие вендорные префиксы ещё нужны.

Явный `targets` в Babel или `overrideBrowserslist` в Autoprefixer **перебивает** общий файл. Удобно точечно в одном пакете монорепо — опасно как второй источник правды на весь продукт.

## Как проверить

```bash
npx browserslist
npx update-browserslist-db
```

Первая команда печатает разрешённый список в корне проекта. Вторая обновляет базу Can I Use у уже установленных пакетов. Покрытие отдельных фич смотрят на [browsersl.ist](https://browsersl.ist/) и Can I Use — относительно **вашего** списка, не «мира вообще».

## Ловушки

- Несколько конфигов в монорепо без общего корня / `browserslistConfigFile` — пакеты резолвят разное.
- `defaults` «навсегда»: внутренний дашборд и публичный лендинг с IE в аналитике — разная аудитория.
- Путать список целей с полифилами: Browserslist говорит **кого**, а `core-js` / точечные shim’ы — **что подставить в рантайме**.
- Не обновлять `caniuse-lite`: запросы те же, версии в списке — прошлогодние.

---

# 6. Ссылки

- [Browserslist (GitHub)](https://github.com/browserslist/browserslist)
- [browsersl.ist — разобрать query](https://browsersl.ist/)
- [Babel — preset-env targets / browserslist](https://babeljs.io/docs/babel-preset-env#browserslist-integration)
- [Autoprefixer](https://github.com/postcss/autoprefixer)
- [web.dev — Browserslist и Baseline](https://web.dev/blog/browserslist-supports-baseline)
