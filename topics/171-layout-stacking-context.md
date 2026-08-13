# 1. Тема

**Контекст наложения:** `z-index` · stacking context · порядок отрисовки

---

# 2. Главное в одну фразу

`z-index` сравнивают только внутри одного stacking context — новый контекст у родителя «запирает» детей, и огромный `z-index` ребёнка не выпрыгнет поверх соседа родителя.

---

# 3. Суть

> **Контекст наложения** (stacking context) — локальная «колода» слоёв, внутри которой браузер раскладывает потомков по оси Z. Корневой контекст есть у документа; дополнительные создают элементы с определёнными свойствами (`position` + `z-index`, `opacity` < 1, `transform`, `filter`, `isolation: isolate`, дети flex/grid с `z-index` и др.).
>
> Без этой модели «кнопка с `z-index: 9999` всё равно под модалкой» кажется багом CSS. На деле модалка и кнопка живут в разных колодах: сравнивают сначала родителей, потом уже детей внутри.
>
> Как читать конфликт: подняться к ближайшим предкам, которые образуют контексты, сравнить их `z-index` (и порядок в дереве при равенстве), и только внутри победившего контекста смотреть детей. DevTools → Layers / 3D view помогают увидеть колоду, а не гадать по числам в CSS.
>
> Ловушка: считать `z-index` глобальным рейтингом по всей странице. Число имеет смысл только среди «братьев» одного контекста; `opacity: 0.99` или `transform: translateZ(0)` без явного `z-index` уже могут создать новую колоду и сломать ожидаемый порядок.

---

# 4. Самое главное запомнить

- `z-index` работает только у элемента, который участвует в stacking context (часто — позиционированный или flex/grid-item).
- Новый контекст у родителя изолирует детей: их `z-index` не сравнивают с элементами вне этой колоды.
- `opacity` < 1, `transform`, `filter`, `isolation: isolate`, `will-change` (некоторые значения) создают контекст даже без `z-index`.
- При равном `z-index` побеждает тот, кто позже в дереве (порядок отрисовки / source order).
- «Поднял до 9999» не лечит перекрытие, если родительский контекст ниже соседнего.
- Отладка: найти, кто создал контекст (Computed / Layers), а не крутить только число у ребёнка.

---

# 5. Описание

```text
viewport (root stacking context)
│
├── header          z-index: 10   ← контекст A
│     └── badge     z-index: 9999 ← только внутри A
│
└── modal-backdrop  z-index: 20   ← контекст B (выше A)
      └── dialog                  ← весь A, включая badge, под B
```

`badge` с `9999` проигрывает `modal-backdrop` с `20`, потому что сравнивают **A и B**, а не badge и backdrop.

## Что такое stacking context

Элемент с собственным контекстом наложения рисует своих потомков как **одну композитную единицу** относительно соседей. Снаружи виден «пакет» целиком: нельзя вытащить одного ребёнка поверх чужого контекста, обойдя родителя.

Корневой контекст — у html/корня документа. Каждый новый контекст вложен в родительский.

## Что создаёт новый контекст

Неполный, но практичный список триггеров:

| Условие | Пример |
| --- | --- |
| Позиционирование + `z-index` ≠ `auto` | `position: relative; z-index: 1` |
| `opacity` < 1 | `opacity: 0.99` |
| `transform` / `filter` / `perspective` / `clip-path` (не `none`) | `transform: translateY(0)` |
| `isolation: isolate` | явная новая колода |
| Flex/grid-item с `z-index` ≠ `auto` | ребёнок `display: flex` |
| Некоторые значения `will-change`, `contain` | композитный слой |

Полный перечень — в спецификации CSS Positioned Layout / MDN; в работе достаточно помнить: «почти любая композиция/эффект» может создать контекст.

## Порядок внутри одного контекста

Упрощённо (без редких edge-case вроде `mix-blend-mode`):

```text
1. фон и граница самого контекста
2. потомки с отрицательным z-index (их контексты)
3. поток in-flow (непозиционированные блоки/инлайны)
4. floats
5. in-flow инлайны
6. потомки с z-index: auto / 0 (позиционированные)
7. потомки с положительным z-index
```

Внутри одной «полки» с одинаковым `z-index` порядок = порядок в DOM.

## Типичная ловушка UI

```css
.card {
  position: relative;
  z-index: 1; /* ← новая колода */
  opacity: 1;
}

.card__badge {
  position: absolute;
  z-index: 9999; /* ← только внутри .card */
}

.overlay {
  position: fixed;
  z-index: 10; /* ← сосед .card; 10 > 1 → overlay выше всей карточки */
}
```

Фикс не в ещё большем числе у badge, а в пересмотре **чьей** колоды должен быть оверлей: поднять `z-index` у `.card`, не создавать лишний контекст на карточке, или вынести badge/portal в тот же контекст, что и overlay (часто — в конец `body`).

## Как проверять

1. В DevTools найти предков с ненулевым/не `auto` `z-index`, `opacity` < 1, `transform` и т.д.
2. Сравнить `z-index` **контекстов**-соседей.
3. Layers / «Show compositing borders» — увидеть, что элемент уехал на свой слой.
4. Временно сбросить подозрительный `opacity`/`transform` у родителя — если порядок «магически» чинится, причина была в новом контексте, не в числе ребёнка.

---

# 6. Ссылки

- [MDN — Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
- [MDN — z-index](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index)
- [MDN — Understanding CSS z-index](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index)
- [CSS Positioned Layout Module — Painting Order](https://www.w3.org/TR/css-position-3/#painting-order)
- [CSS Positioned Layout — Stacking Contexts](https://www.w3.org/TR/css-position-3/#stacking-context)
