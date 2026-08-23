# 1. Тема

**Стартовые скрипты в package.json · HMR · Tree shaking · Минификация**

---

# 2. Главное в одну фразу

Команды в `package.json` запускают dev и prod-сборку; в dev HMR обновляет модули без сброса состояния страницы, а в prod tree shaking и минификация уменьшают размер бандла.

---

# 3. Суть

> В `package.json` блок `scripts` — договорённость команды и CI: `npm run dev` поднимает dev-сервер, `npm run build` собирает production. Не нужно каждый раз вспоминать флаги webpack — одни и те же имена в README, локально и в pipeline.
>
> На dev-сервере **HMR (Hot Module Replacement)** подменяет только изменившийся модуль в уже открытой вкладке. Полная перезагрузка (live reload) сбрасывает state формы и store; HMR сохраняет его, если модуль умеет принять обновление через `module.hot.accept`.
>
> В production **tree shaking** на ESM помечает неиспользуемые `export` и вместе с `"sideEffects": false` может выкинуть целые модули из бандла. **Минификация** (Terser, esbuild) укорачивает имена и убирает пробелы внутри файлов — это не то же самое, что gzip или brotli на CDN.
>
> Ловушка: тяжёлый minify в dev замедляет цикл правок; shaking слабо работает на CommonJS и ломается при побочных эффектах на `import`. Без source maps отлаживать сжатый prod-бандл заметно сложнее.

---

# 4. Самое главное запомнить

- `npm run build` / `yarn build` — контракт команды, не «личная команда с флагами».
- HMR ≠ live reload: live reload = полная перезагрузка страницы и сброс state.
- Tree shaking опирается на ESM и `import`/`export`; CommonJS «трясётся» хуже.
- `"sideEffects": false` в пакете обещает: неиспользуемые модули можно выкинуть целиком.
- Minify — почти всегда только production; gzip/brotli на CDN — отдельный слой.
- `module.hot.accept` — модуль явно соглашается на горячее обновление.

---

# 5. Описание

```text
package.json · scripts
  npm run dev   → webpack serve → devServer.hot → патч модуля (HMR)
  npm run build → mode production → usedExports + sideEffects → minify → dist/
```

## Скрипты

Блок `scripts` в `package.json` — единая точка входа: и разработчик, и CI вызывают одни и те же короткие имена. Это снижает расхождения «у меня работает, в pipeline — нет».

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "lint": "eslint src"
  }
}
```

Привычка: короткие стабильные имена (`dev`, `build`, `test`), одинаковые в документации и в job CI.

## HMR

После сохранения файла dev-server шлёт update; runtime подменяет модуль. Если компонент принимает патч, React Fast Refresh может сохранить state формы — без полного reload.

```text
сохранили Button.tsx
   → dev-server шлёт update
   → runtime подменяет модуль
   → state формы сохранён (если модуль принял HMR)
```

Если модуль не «принимает» HMR, webpack делает fallback на полную перезагрузку — state сбросится.

## Tree shaking

При prod-сборке бандлер смотрит граф импортов: экспорт, который никто не импортирует, может исчезнуть из итогового файла. Нужны статические `import`/`export` (ESM) и часто подсказка `"sideEffects"` в `package.json` библиотеки.

```javascript
// utils.js
export function used() { return 1; }
export function dead() { return 2; }

// index.js
import { used } from './utils';
```

В prod `dead` может исчезнуть из бандла. Ломают shaking: побочные эффекты на import, re-export всего через barrel без оговорок, CommonJS без статического анализа.

## Минификация

Minify укорачивает идентификаторы и выкидывает whitespace и unreachable-код внутри JS-файла. На CDN поверх уже минифицированного файла обычно включают gzip или brotli — это второй этап сжатия, не замена Terser.

До: `function calculateTotalPrice(items) { return items.reduce(...) }`  
После: `function a(b){return b.reduce(...)}`

Source maps в prod подключают отдельно — без них стек ошибок указывает на короткие имена из minify.

---

# 6. Ссылки

- [npm — scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [Webpack — HMR](https://webpack.js.org/concepts/hot-module-replacement/)
- [Webpack — Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [TerserWebpackPlugin](https://webpack.js.org/plugins/terser-webpack-plugin/)
