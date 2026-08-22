# 1. Тема

**Lazy-loading и critical path**

---

# 2. Главное в одну фразу

Lazy-loading откладывает загрузку того, что пользователь ещё не видит, а оптимизация critical rendering path оставляет на старте только CSS и JS, без которых браузер не может нарисовать первый экран.

---

# 3. Суть

> Представьте первый экран сайта: hero, меню, пара карточек. Ниже сгиба — ещё десяток картинок и тяжёлый виджет настроек. **Lazy-loading** говорит браузеру: «не качай всё сразу — подгрузи, когда элемент почти попадёт в viewport». В HTML это `loading="lazy"` у `<img>`; в React — `React.lazy` с dynamic `import()` и обёрткой `Suspense`, чтобы вынести страницу или виджет в отдельный чанк.
>
> Параллельно браузер строит **critical rendering path (CRP)** — цепочку ресурсов до первой отрисовки. Пока не готов CSSOM, render tree не собрать; синхронный `<script>` без `async`/`defer` останавливает разбор HTML. На критическом пути оставляют только то, что нужно для above-the-fold: inline critical CSS, hero, app shell; остальное — lazy или defer.
>
> Рабочая связка: первый экран — eager и с приоритетом; ниже сгиба — lazy; LCP-картинку lazy не делают. Preload/prefetch/async/defer — соседняя тема 25; tree shaking и CDN — тема 15; FCP/LCP как метрики — тема 14.
>
> Ловушки: `loading="lazy"` на LCP-картинке задерживает главный контент; lazy без `width`/`height` даёт CLS; `React.lazy` без fallback в `Suspense` ломает UX; «lazy всё» на above-the-fold только ухудшает LCP.

---

# 4. Самое главное запомнить

- `loading="lazy"` — нативная отложенная загрузка `<img>` и `<iframe>` при приближении к viewport.
- `React.lazy` + dynamic `import()` — code splitting компонентов; нужен `Suspense` с fallback.
- CRP — HTML плюс блокирующий CSS/JS до первой отрисовки; это не «весь бандл приложения».
- Critical CSS inline в `<head>`; полные стили и хвост скриптов — async, defer или отложенная подгрузка.
- Hero и LCP-кандидат — не lazy; картинки ниже сгиба — lazy.
- Отложенная загрузка решает **когда** тянуть файл; tree shaking — **что** попало в бандл.

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

## Зачем откладывать загрузку

На старте сеть и main thread и так заняты HTML, стилями и app-бандлом. Если сразу запросить все картинки каталога и тяжёлые чанки, они конкурируют с hero и блокирующим CSS — первый экран появляется позже. Lazy-loading снимает лишнее с первых секунд: пользователь видит контент above-the-fold, а остальное подтягивается по мере прокрутки или перехода на экран.

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

CRP — не «весь сайт», а минимальный набор, без которого браузер не рисует первый кадр. Оптимизация — убрать лишнее с этого пути до FCP:

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
