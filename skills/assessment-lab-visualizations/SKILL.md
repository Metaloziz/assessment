---
name: assessment-lab-visualizations
description: >-
  Shared visual language for interactive lab diagrams and animations in
  assessment (algorithms, security, network, performance, and any live stand):
  dark panels, accent/ok highlights, SVG typography, GSAP timeline with
  prefers-reduced-motion. Use when building or polishing lab schemes, graphs,
  catalogs, clones, caches, stacks, or animated state in `*Lab.tsx`.
---

# Визуализации в лабах

Проектный скилл. Общий стандарт лаб: [`write-assessment-labs`](../write-assessment-labs/SKILL.md).  
Формат: [`LAB_FORMAT.md`](../../LAB_FORMAT.md) (§ «Просто и наглядно», § «Визуализации»).

Стиль **единый** для всех групп (algorithms, security, network, performance, browser…): не заводить отдельный look на тему.

## Когда нужна схема

Схема на вкладке **«Решение проблемы»** — норма, не опция: 3–6 узлов, подсвечен **один** текущий шаг. **Запустить** меняет картинку; лог не заменяет схему.

Если тема чисто про синтаксис/конфиг без состояний — схема не обязательна (крошечный before/after или контраст в UI).

Кластер механизмов — **переключатель + одна схема** (как `algorithms-stack-hashmap`). Не копировать **полотно** `algorithms-graphs-list` (несколько картин сразу).

## Метафора — под механизм

Не копировать горизонтальный поток `A → B → C` (CorsLab) «по умолчанию». Сначала выбрать картинку, которая **показывает** механизм:

| Механизм | Примеры метафор |
|---|---|
| HTTP / CORS / запрос | поток браузер → API |
| Factory | каталог / штамп продукта |
| Prototype | оригинал vs clone |
| Proxy / кэш | обёртка + hit/miss |
| Singleton | два call-site → один чип |
| Adapter | переводчик между контрактами |
| Chain | вертикальный стек, пакет падает |
| Strategy | слот алгоритма |
| Decorator | луковица обёрток |
| Abstract Factory | семейство продуктов одной линейки |
| Стек / Map | стопка LIFO / корзины |

CorsLab — эталон **live-API**, не шаблон визуализации.

## Эталоны (визуальный язык)

- `app/src/topics/algorithms-graphs-list/` — граф + порядок обхода
- `app/src/topics/algorithms-stack-hashmap/` — стопка LIFO и корзины `Map` (переключатель, не полотно)

Новые live-API лабы (CORS, JWT, SQLi, WS…) переиспользуют **тот же** язык токенов и панелей.

## Визуальный язык

- Тёмный фон: градиенты с лёгким `--accent` / `--ok`, `var(--bg-elevated)`, рамка `var(--border)`
- Текущий / активный шаг: `--accent` / `--accent-bright` + мягкий glow (не неон-фиолетовый)
- Успех / посещённое: приглушённый `--ok`
- Ошибка / риск: `--danger` или warn-тон темы, без кричащих бейджей
- Списки/цепочки: карточки, стрелки `→`, цикл — warn-пометка
- Графы и схемы: SVG `viewBox`, рёбра тонкие; активное — ярче/толще
- Во вкладке **Код** при кластере / двух сущностях — **тот же** ghost-переключатель, что на «Решении проблемы»; сниппеты — выбранного паттерна. Компактная схема на «Код» по желанию (как stack/hash)

## Анимация

- `gsap.timeline()`: шаг **0.5–0.7 с**, `ease: "power2.inOut"`
- Твин **только** активного элемента (карточка появляется, пакет падает, слот заполняется)
- Состояния узлов — CSS `transition` **0.35–0.45 с** (border / color / shadow)
- Не `gsap.fromTo` всех узлов на каждый `phase` — это дёргает схему
- Перед новым прогоном `tl.kill()`
- `prefers-reduced-motion: reduce` → сразу финальный кадр, без твинов

## Типографика в SVG

В `viewBox` `font-size` — в **viewBox units**, не CSS-px.

- Подпись не касается обводки: зазор ≥ ~20–25% радиуса
- Ориентир: `r ≈ 11`, `font-size ≈ 7–7.5`, `text-anchor: middle`, `dominant-baseline: central`
- Рёбра `shrink` чуть больше радиуса, чтобы не заходили под диск

## Не делать

- Только таблица/лог вместо схемы, если структура — граф/список/дерево/каталог/клон
- Горизонтальный CORS-поток для темы, которая не про пайплайн запроса
- Оверлеи-бейджи, фиолетовый glow «из коробки AI»
- Огромный `font-size` в SVG (например `15` при `r=8`)
- Свой палитровый «бренд» лабы в обход токенов темы
- Несколько схем сразу на одном экране «как в graphs-list»
