# 1. Тема

**Механизмы уменьшения бандла и роль CDN**

---

# 2. Главное в одну фразу

Бандл уменьшают на этапе сборки (tree shaking, code splitting, minify), а CDN ускоряет доставку готовых ассетов через геораспределённый кэш.

---

# 3. Ответ для собеседования

> «Меньше кода: tree shaking, code splitting/dynamic import, minify, убрать тяжёлые зависимости, `sideEffects`, не дублировать shared libs.
> Быстрее отдача: gzip/brotli, CDN edge cache, hashed filenames + long `Cache-Control`.
>
> CDN сам логику бандла не уменьшает — быстрее доставляет. Оптимально: маленький бандл + CDN.»

---

# 4. Самое главное запомнить

- Tree shaking + code splitting — главные рычаги размера.
- CDN ≠ сжатие логики приложения; CDN = доставка/кэш.
- Content hash + `immutable` cache.
- Сначала analyzer, потом оптимизация.

---

# 5. Описание

```javascript
const Admin = lazy(() => import('./Admin'));
```

```http
Cache-Control: public, max-age=31536000, immutable
```

`index.html` — короткий кэш; чанки с hash — длинный.

---

# 6. Ссылки

- [web.dev — Code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)
- [Webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [MDN — CDN](https://developer.mozilla.org/en-US/docs/Glossary/CDN)
- [HTTP cache](https://web.dev/articles/http-cache)
