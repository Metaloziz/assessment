# 1. Тема

**Flexbox:** ось · `justify` / `align` · `flex` · wrap · order

---

# 2. Главное в одну фразу

Flexbox раскладывает элементы вдоль одной главной оси — ряд или столбец — и выравнивает свободное место через `justify-content`, `align-items` и `flex` у детей.

---

# 3. Суть

> **Flexbox** — одномерная модель раскладки: контейнер с `display: flex` (или `inline-flex`) выстраивает детей по **главной оси** (`flex-direction`: `row` / `column` и реверсы), а по **поперечной** только выравнивает. Это тулбар, чипы, центрирование блока, «кнопка слева / действия справа», вертикальный стек формы — всё, где важна одна линия потока.

> Зачем: быстро распределить свободное место и выровнять элементы без float и ручных `margin`. Меняется ширина родителя — `flex-grow` / `flex-shrink` / `basis` и `gap` пересчитывают доли; `flex-wrap` при необходимости переносит ряд.

> Как устроено. На контейнере задают направление, перенос (`flex-wrap`), распределение по главной оси (`justify-content`) и выравнивание по поперечной (`align-items`; для многострочного — ещё `align-content`). У ребёнка — `flex` (сокращение `grow shrink basis`), `align-self`, при необходимости `order` (меняет только визуальный порядок, не DOM / Tab).

> Ловушка: собирать весь каркас страницы вложенными flex-рядами вместо Grid — появляются лишние обёртки и хрупкие «равные высоты». Ещё: `order` и `row-reverse` путают визуал с порядком фокуса; длинный контент без `min-width: 0` (или `minmax` у грида) раздувает flex-элемент.

---

# 4. Самое главное запомнить

- Flex — **1D** (ряд или столбец); Grid — **2D** (строки и колонки сразу).
- Главная ось = `flex-direction`; поперечная — то, на чём работает `align-items`.
- `justify-content` — свободное место **между/вокруг** flex-линий по главной оси; `align-items` — внутри линии по поперечной.
- `flex: 1` ≈ `1 1 0%` (растёт и сжимается от нулевой базы); `flex: auto` ≈ `1 1 auto`.
- `gap` — зазор между элементами; не путать с `margin` на детях.
- `order` меняет картинку, не порядок в DOM и не Tab — для a11y опасен без нужды.

---

# 5. Описание

```text
  display: flex
       │
       ├─ flex-direction     ← главная ось: row | column | *-reverse
       ├─ flex-wrap          ← nowrap | wrap | wrap-reverse
       ├─ justify-content    ← по главной оси
       ├─ align-items        ← по поперечной (одна линия)
       ├─ align-content      ← по поперечной, если несколько линий
       ├─ gap                ← между элементами / линиями
       │
       └─ дети (flex items)
            ├─ flex / grow / shrink / basis
            ├─ align-self
            └─ order           ← только визуально
```

## Контейнер и оси

```css
.toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
```

При `row` главная ось — горизонталь, поперечная — вертикаль. При `column` — наоборот: `justify-content` уже двигает блоки **сверху вниз**, а `align-items` — по горизонтали.

## `justify-content` и `align-items`

| Свойство | Ось | Типичные значения |
| --- | --- | --- |
| `justify-content` | главная | `flex-start`, `center`, `space-between`, `space-around`, `space-evenly` |
| `align-items` | поперечная | `stretch` (часто дефолт), `flex-start`, `center`, `baseline` |

`space-between`: первый у края, последний у края, свободное место между. `center` на обеих осях — классическое центрирование одного блока в родителе с заданной высотой.

## `flex` у ребёнка

```css
.grow {
  flex: 1 1 0%; /* забрать свободное место */
}

.fixed {
  flex: 0 0 auto; /* размер по контенту, не расти */
}
```

Короткая запись `flex: 1` удобна для «остаток ширины». Если элемент не сжимается из‑за длинного текста/картинки — часто помогает `min-width: 0` (у flex-item дефолтный минимум — `auto`).

## Wrap

```css
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

Без `wrap` элементы сжимаются или вылезают за край. С `wrap` появляются **несколько flex-линий**; тогда `align-content` раскладывает линии по поперечной оси контейнера.

## `order`

```css
.visualFirst {
  order: -1; /* рисуется раньше соседей с order: 0 */
}
```

Источник и Tab идут по DOM. Визуальный «первый» блок с `order: -1` может оказаться третьим по Tab — для доступности лучше менять порядок в разметке.

## Flex и Grid

```text
  Flex:  тулбар, чипы, форма-столбец, выравнивание в ячейке
  Grid:  каркас страницы, 2D-плитка, именованные области
```

Снаружи часто Grid-области, внутри шапки секции — Flex. Пытаться имитировать 2D-сетку только Flex’ом — вложенные ряды и хрупкий markup.

## Частые ловушки

- Путают `justify-content` и `align-items` после смены `flex-direction`.
- `margin: auto` на flex-item «съедает» свободное место по оси — удобный трюк (логотип слева, `margin-left: auto` у меню), но неочевиден новичкам.
- `inline-flex` влияет на **внешний** поток (как инлайн-бокс); внутри — тот же Flex.
- Абсолютно позиционированный потомок выпадает из flex-раскладки.

---

# 6. Ссылки

- [CSS Flexible Box Layout — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout)
- [Basic concepts of flexbox — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)
- [flex — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/flex)
- [CSS Flexible Box Layout Module Level 1 — W3C](https://www.w3.org/TR/css-flexbox-1/)
- [Relationship of flexbox to other layout methods — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Relationship_of_flexbox_to_other_layout_methods)
