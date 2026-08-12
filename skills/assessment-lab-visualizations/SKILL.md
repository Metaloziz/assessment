---
name: assessment-lab-visualizations
description: >-
  Shared visual language for interactive lab diagrams and animations in
  assessment (algorithms, security, network, performance, and any live flow):
  dark panels, accent/ok highlights, SVG typography, short motion with
  prefers-reduced-motion. Use when building or polishing lab schemes, graphs,
  request/response flows, or animated state in `*Lab.tsx`.
---

# Визуализации в лабах

Проектный скилл. Общий стандарт лаб: [`write-assessment-labs`](../write-assessment-labs/SKILL.md).  
Формат: [`LAB_FORMAT.md`](../../LAB_FORMAT.md) (§ «Визуализации»).

Стиль **единый** для всех групп (algorithms, security, network, performance, browser…): не заводить отдельный look на тему.

## Когда нужна схема

Если у механизма есть **видимые состояния или переходы** — покажи их (не только лог).  
Если тема чисто про синтаксис/конфиг без потока — схема не обязательна.

## Эталоны (визуальный язык)

- `app/src/topics/algorithms-graphs-list/` — граф + порядок обхода
- `app/src/topics/algorithms-stack-hashmap/` — стопка LIFO и корзины `Map`

Новые live-API лабы (CORS, JWT, SQLi, WS…) переиспользуют **тот же** язык токенов и панелей.

## Визуальный язык

- Тёмный фон: градиенты с лёгким `--accent` / `--ok`, `var(--bg-elevated)`, рамка `var(--border)`
- Текущий / активный шаг: `--accent` / `--accent-bright` + мягкий glow (не неон-фиолетовый)
- Успех / посещённое: приглушённый `--ok`
- Ошибка / риск: `--danger` или warn-тон темы, без кричащих бейджей
- Списки/цепочки: карточки, стрелки `→`, цикл — warn-пометка
- Графы и схемы: SVG `viewBox`, рёбра тонкие; активное — ярче/толще
- Анимации короткие (GSAP или CSS); уважать `prefers-reduced-motion: reduce`
- Во вкладке **Код** при двух сущностях — переключатель + компактная схема

## Типографика в SVG

В `viewBox` `font-size` — в **viewBox units**, не CSS-px.

- Подпись не касается обводки: зазор ≥ ~20–25% радиуса
- Ориентир: `r ≈ 11`, `font-size ≈ 7–7.5`, `text-anchor: middle`, `dominant-baseline: central`
- Рёбра `shrink` чуть больше радиуса, чтобы не заходили под диск

## Не делать

- Только таблица/лог вместо схемы, если структура — граф/список/дерево/поток запроса
- Оверлеи-бейджи, фиолетовый glow «из коробки AI»
- Огромный `font-size` в SVG (например `15` при `r=8`)
- Свой палитровый «бренд» лабы в обход токенов темы
