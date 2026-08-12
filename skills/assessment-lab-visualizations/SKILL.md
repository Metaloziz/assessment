---
name: assessment-lab-visualizations
description: >-
  Styles interactive algorithm lab visualizations (graphs, lists, stacks,
  maps) in assessment: dark panels, accent/ok highlights, SVG typography in
  viewBox. Use when building or polishing algorithm labs, graph/list/tree
  diagrams, or visual schemes in `app/src/topics/algorithms-*`.
---

# Визуализации в лабах (algorithms)

Проектный скилл. Общий стандарт лаб: [`write-assessment-labs`](../write-assessment-labs/SKILL.md).

## Эталоны

- `app/src/topics/algorithms-graphs-list/` — граф + порядок обхода
- `app/src/topics/algorithms-stack-hashmap/` — стопка LIFO и корзины `Map`

Когда в лабе есть структуры / обходы — **по возможности** схема (не только лог).

## Визуальный язык

- Тёмный фон: градиенты с лёгким `--accent` / `--ok`, `var(--bg-elevated)`, рамка `var(--border)`
- Текущий узел: `--accent` / `--accent-bright` + мягкий glow
- Посещённое: приглушённый `--ok` (не неон-фиолетовый)
- Список: карточки value | next, стрелки `→`, цикл — warn-пометка
- Граф: SVG `viewBox`, рёбра тонкие; активное — ярче/толще
- Анимации короткие; уважать `prefers-reduced-motion: reduce`
- Во вкладке **Код** при двух сущностях — переключатель + компактная схема

## Типографика в SVG

В `viewBox` `font-size` — в **user units**, не CSS-px.

- Подпись не касается обводки: зазор ≥ ~20–25% радиуса
- Ориентир: `r ≈ 11`, `font-size ≈ 7–7.5`, `text-anchor: middle`, `dominant-baseline: central`
- Рёбра `shrink` чуть больше радиуса, чтобы не заходили под диск

## Не делать

- Только таблица вместо схемы, если структура — граф/список/дерево
- Оверлеи-бейджи, фиолетовый glow «из коробки AI»
- Огромный `font-size` в SVG (например `15` при `r=8`)
