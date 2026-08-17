# 1. Тема

**Lazy-loading и оптимизация критичного пути**

---

# 2. Главное в одну фразу

Lazy-loading откладывает загрузку ресурсов вне viewport, а оптимизация critical rendering path сокращает CSS и JS, блокирующие первую отрисовку (FCP/LCP).

---

# 3. Суть

> **Lazy-loading** откладывает загрузку того, что пользователь ещё не видит: картинки ниже сгиба, iframe, тяжёлые React-компоненты. В HTML — `loading="lazy"` у `<img>`; в React — `React.lazy` с dynamic `import()` и `Suspense` для code splitting маршрутов и виджетов. Цель — меньше байт и запросов на старте, быстрее первый экран.
>
> **Critical rendering path (CRP)** — минимальная цепочка ресурсов, без которых браузер не может построить render tree и показать контент. Синхронный CSS блокирует рендер; синхронный `<script>` без `async`/`defer` блокирует парсинг HTML. Inline critical CSS и отложенный хвост стилей и скриптов сокращают время до FCP.
>
> Рабочая связка: на критическом пути — только то, что нужно для первого экрана (hero, шрифт, app shell); остальное lazy или defer. Preload/prefetch/async/defer — в соседней теме 25; tree shaking и CDN — в теме 15; метрики FCP/LCP — в теме 14.
>
> Ловушки: `loading="lazy"` на LCP-картинке задерживает главный контент; lazy без `width`/`height` даёт CLS; `React.lazy` без fallback в `Suspense` ломает UX; «lazy всё» на above-the-fold ухудшает LCP.

---

# 4. Самое главное запомнить

- `loading="lazy"` — нативная отложенная загрузка `<img>`/`<iframe>` при приближении к viewport.
- `React.lazy` + dynamic `import()` — code splitting компонентов; нужен `Suspense` с fallback.
- CRP = HTML + блокирующий CSS/JS до первой отрисовки; не путать с «всем бандлом».
- Critical CSS inline в `<head>`; остальные стили — async/defer/media.
- LCP-кандидат и hero — **не** lazy; ниже сгиба — lazy.
- Lazy-loading ≠ tree shaking: первое — когда грузить, второе — что включить в бандл.

---

# 5. Описание

```text
стартовая навигация
  → HTML (парсинг)
  → CSSOM (блокирует, если CSS render-blocking)
  → DOM + CSSOM → render tree
  → layout → paint → FCP / LCP
параллельно: JS без defer/async блокирует парсинг HTML

lazy / defer / code split — вне критического пути до первого экрана
```

## Lazy-loading

Отложенная загрузка — когда ресурс реально нужен, а не «на всякий случай на старте».

HTML:

```html
<img
  loading="lazy"
  src="gallery-4.jpg"
  alt="Слайд 4"
  width="640"
  height="360"
/>
```

React (code splitting):

```tsx
import { lazy, Suspense } from 'react';

const Settings = lazy(() => import('./SettingsPage'));

export const App = () => (
  <Suspense fallback={<p>Загрузка…</p>}>
    <Settings />
  </Suspense>
);
```

Intersection Observer — когда нужен контроль вне `<img>` (фон, кастомный виджет):

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) loadChunk(e.target);
  }
});
io.observe(document.querySelector('#below-fold'));
```

## Critical rendering path

Оптимизация CRP — убрать лишнее с пути до FCP:

| Приём | Эффект |
|-------|--------|
| inline critical CSS | быстрее первая отрисовка |
| async CSS / `media` + `onload` | меньше блокировки render |
| `defer` / `async` для скриптов | меньше блокировки парсинга |
| code splitting / lazy routes | меньше JS на старте |
| `loading="lazy"` ниже сгиба | меньше конкуренции за сеть на LCP |

Critical CSS — минимальный набор правил для above-the-fold; остальное подгружается позже. Генерируют build-плагинами или вручную для маленьких страниц.

## Ловушки

- **Lazy на LCP** — hero с `loading="lazy"` откладывает главную метрику; для LCP-картинки — `fetchpriority="high"` или eager + preload (тема 25).
- **CLS** — lazy-картинки без размеров сдвигают layout при появлении; задавайте `width`/`height` или `aspect-ratio`.
- **React.lazy без Suspense** — throw promise без границы; всегда оборачивайте fallback.
- **Путаница с bundle size** — lazy грузит чанк позже, но не уменьшает суммарный JS; tree shaking и split по маршрутам — отдельные рычаги.

---

# 6. Ссылки

- [MDN — Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading)
- [web.dev — Critical rendering path](https://web.dev/articles/critical-rendering-path)
- [web.dev — Optimize LCP](https://web.dev/articles/optimize-lcp)
- [React — lazy](https://react.dev/reference/react/lazy)
- [HTML — img loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#loading)
