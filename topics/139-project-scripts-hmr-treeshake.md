# 1. Тема

**Стартовые скрипты в package.json · HMR · Tree shaking · Минификация**

---

# 2. Главное в одну фразу

`scripts` в `package.json` запускают сборку и dev-сервер; HMR обновляет модули без полной перезагрузки; tree shaking выкидывает мёртвый ESM-код; минификация сжимает прод-бандл.

---

# 3. Суть

> В `package.json` → `scripts` живут команды проекта: `dev`, `build`, `lint`. Это единая точка входа для людей и CI, а не «запомнить флаги webpack».
>
> **HMR (Hot Module Replacement)** подменяет изменившийся модуль в уже открытой странице. Полный reload сбрасывает состояние; HMR сохраняет его, если модуль корректно принимает обновление.
>
> **Tree shaking** в ESM удаляет неиспользуемые экспорты при prod-сборке (нужны `import`/`export` и часто `"sideEffects"` в пакете). **Минификация** укорачивает имена и выкидывает пробелы/unreachable-код (Terser, esbuild). Вместе они режут вес и время загрузки, но отладка в prod без source maps усложняется.

---

# 4. Самое главное запомнить

- Скрипты: `npm run build` / `yarn build` — контракт команды.
- HMR ≠ live reload: live reload = полная перезагрузка.
- Tree shaking работает на **ESM**; CJS трясётся хуже.
- `sideEffects: false` в библиотеке обещает: можно дропать неиспользуемые модули.
- Minify — почти всегда только production.

---

# 5. Описание

## Скрипты

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "lint": "eslint src"
  }
}
```

Привычка: короткие имена, одинаковые в README и CI.

## HMR

```text
сохранили Button.tsx
   → dev-server шлёт update
   → runtime подменяет модуль
   → React Fast Refresh сохраняет state формы
```

Если модуль не «принимает» HMR, webpack сделает fallback на reload.

## Tree shaking

```javascript
// utils.js
export function used() { return 1; }
export function dead() { return 2; }

// index.js
import { used } from './utils';
```

В prod `dead` может исчезнуть из бандла. Ломают shaking: побочные эффекты на import, re-export всего через barrel без оговорок, CommonJS.

## Минификация

До: `function calculateTotalPrice(items) { return items.reduce(...) }`  
После: `function a(b){return b.reduce(...)}` (+ сжатие whitespace).

Считайте gzip/brotli отдельно: minify ≠ сжатие на CDN.

---

# 6. Ссылки

- [npm — scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)
- [Webpack — HMR](https://webpack.js.org/concepts/hot-module-replacement/)
- [Webpack — Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [Terser](https://terser.org/)
