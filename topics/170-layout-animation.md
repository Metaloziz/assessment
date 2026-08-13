# 1. Тема

**Анимация:** `transition` · `@keyframes` · transform / opacity · layout · `prefers-reduced-motion`

---

# 2. Главное в одну фразу

CSS-анимация меняет свойства во времени: `transition` — между двумя состояниями, `@keyframes` — по сценарию; дёшево крутить `transform` и `opacity`, дорого — ширину и позицию в потоке.

---

# 3. Суть

> **Анимация в CSS** — это смена вычисленных стилей во времени. Два основных инструмента: **`transition`** (плавный переход, когда свойство уже изменилось: hover, класс, состояние) и **`animation` + `@keyframes`** (именованный сценарий с кадрами, может крутиться сам, с задержками и повторами). Оба задают длительность, кривую времени (`timing-function`) и что именно меняется.

> Зачем: обратная связь в UI (кнопка, появление панели), направляющий motion, микроинтеракции. Без анимации интерфейс кажется резким; с лишней — отвлекает и нагружает главный поток.

> Как устроено. Браузер на каждом кадре интерполирует значения. Свойства вроде `transform` и `opacity` часто остаются на композиторе (дешевле). Смена `width`, `height`, `top`/`left`, `margin` гоняет **layout** и иногда **paint** — дороже и заметнее на слабых устройствах. `will-change` подсказывает браузеру заранее, но злоупотребление жрёт память. Для доступности смотрят `prefers-reduced-motion: reduce` — укорачивают или отключают движение.

> Ловушка: анимировать «всё подряд» через `transition: all` и двигать блоки `left`/`width` вместо `transform`. Или игнорировать reduced-motion. JS-таймлайны (GSAP и т.п.) подчиняются тем же правилам стоимости кадра — библиотека не отменяет layout thrashing.

---

# 4. Самое главное запомнить

- `transition` — реакция на смену значения; `animation` / `@keyframes` — автономный сценарий.
- Предпочитать `transform` и `opacity`; `width` / `top` / `margin` дергают раскладку.
- `transition: all` — шумно и непредсказуемо; перечислять свойства явно.
- `animation-fill-mode` / `forwards` оставляют конечный кадр; без этого элемент «прыгает» назад.
- `prefers-reduced-motion: reduce` — укоротить или убрать motion, не только «красивый бонус».
- Кривая (`ease`, `cubic-bezier`) меняет ощущение при той же длительности.

---

# 5. Описание

```text
  изменение стиля (класс / :hover / JS)
       │
       ├─ transition        ← A → B, один раз на смену
       │     property · duration · easing · delay
       │
       └─ animation         ← сценарий по имени
             @keyframes 0% … 100%
             duration · iteration · direction · fill-mode
```

## `transition`

```css
.panel {
  opacity: 0;
  transform: translateY(0.5rem);
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.panel.isOpen {
  opacity: 1;
  transform: translateY(0);
}
```

Переход стартует, когда меняется указанное свойство. Нет смены значения — нет анимации. Для «туда-обратно» достаточно снять класс: transition отыграет в обе стороны (если задан на базовом правиле).

## `@keyframes` и `animation`

```css
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}

.dot {
  animation: pulse 1.2s ease-in-out infinite;
}
```

Удобно для зацикленных индикаторов, появления «с нуля», сложных многошаговых сцен. Несколько анимаций на одном элементе перечисляют через запятую.

## Что дёшево и что дорого

| Свойства | Типичная цена |
| --- | --- |
| `transform`, `opacity` | композитинг, обычно гладко |
| `color`, `background-color` | paint |
| `width`, `height`, `top`, `left`, `margin` | layout (+ часто paint) |

Сдвиг кнопки: `transform: translateX(8px)`, не `left: 8px`. Раскрытие панели по высоте — отдельная задача (часто grid/`interpolate-size` / аккуратно JS); «анимировать height: auto» классически неудобно.

## Easing и длительность

Короткие UI-переходы обычно **150–300 ms**. `ease-out` — появление «въехало и встало»; `ease-in` — уход. `linear` редко уместен для интерфейса, чаще для прогресса и бесконечных лент. Свой `cubic-bezier` подбирают под характер продукта, не ради эффекта.

## `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
  }
  .dot {
    animation: none;
  }
}
```

В лабах и продукте: либо мгновенный конечный кадр, либо очень короткий fade без крупного смещения. Это требование доступности, не «настройка для эстетов».

## Transition vs JS

CSS хватает для состояний и простых циклов. Сложный оркестр (паузы, timeline, scrub) — JS (в этом проекте часто GSAP), но по-прежнему: один активный элемент, уважение к reduced-motion, не анимировать layout без нужды.

## Частые ловушки

- Забыли `transition` на исходном селекторе — при снятии класса откат резкий.
- Анимация `display` — `display` не интерполируется; прячут через opacity/visibility или закрывают после `transitionend`.
- Бесконечный `infinite` на крупном блоке без паузы — нагрузка и укачивание.
- `will-change: transform` на сотне карточек «на всякий случай».

---

# 6. Ссылки

- [CSS transitions — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions)
- [CSS animations — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations)
- [Using CSS transitions — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)
- [prefers-reduced-motion — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [CSS Animations Level 2 — W3C](https://www.w3.org/TR/css-animations-2/)
