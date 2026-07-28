# 1. Тема

**Lazy-loading и оптимизация критичного пути**

---

# 2. Главное в одну фразу

Lazy-loading откладывает загрузку того, что вне viewport, а оптимизация critical rendering path сокращает ресурсы, блокирующие первую отрисовку (FCP/LCP).

---

# 3. Ответ для собеседования

> «**Lazy-loading** — отложенная загрузка ресурсов, когда они появляются во viewport: картинки, iframe, компоненты.
>
> HTML: `<img loading="lazy" …>`. В React: `React.lazy` + `Suspense` и dynamic `import()` для code splitting маршрутов/тяжёлых виджетов.
>
> **Critical rendering path** — цепочка ресурсов, без которых браузер не может показать контент. Оптимизация:
> - minify/compress CSS и HTML;
> - inline критического CSS в `<head>`;
> - отложить неиспользуемые стили;
> - приоритизировать видимый контент (preload LCP, меньше блокирующего JS).
>
> Цель — быстрее FCP/LCP: меньше блокирующего на критическом пути, остальное — lazy.»

---

# 4. Самое главное запомнить

- Lazy = не грузим, пока не нужно.
- Critical path = то, что блокирует первую отрисовку.
- `loading="lazy"` / `React.lazy` / dynamic import.
- Critical CSS + меньше блокирующего JS → быстрее FCP.

### Lazy-loading

Техника отложенной загрузки ресурсов при появлении во viewport (изображения, iframe, компоненты).

```html
<img loading="lazy" src="image.jpg" alt="Пример" />
```

```js
const LazyComponent = React.lazy(() => import('./LazyComponent'))
```

### Оптимизация критичного пути

Минимизация времени до первого отображения: minify/compress, inline critical CSS, отложенный unused CSS, приоритет видимого контента.

---

# 5. Описание

Критичный путь — ресурсы, блокирующие рендеринг. Оптимизация сокращает время до First Contentful Paint (FCP).

| Приём | Эффект |
|-------|--------|
| lazy images / iframes | меньше трафика на старте |
| code splitting | меньше JS на критическом пути |
| critical CSS | быстрее первая отрисовка |
| defer non-critical | меньше блокировок |

---

# 6. Ссылки

- [MDN — Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
- [Google — Critical Rendering Path](https://developers.google.com/web/fundamentals/performance/critical-rendering-path)
