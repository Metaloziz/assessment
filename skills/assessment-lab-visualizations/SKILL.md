---
name: assessment-lab-visualizations
description: >-
  Shared visual language for interactive lab diagrams and animations in
  assessment (algorithms, security, network, layout, performance, React live
  stands, and any live stand): dark panels, accent/ok highlights, live mechanism
  demos when the API/DOM effect is visible, live UI samples when the topic is
  about visual look, SVG typography, GSAP timeline with prefers-reduced-motion.
  Use when building or polishing lab schemes, graphs, catalogs, clones, caches,
  stacks, portals / boundaries, design-system / typography / a11y contrasts, or
  animated state in `*Lab.tsx`.
---

# Визуализации в лабах

Проектный скилл. Общий стандарт лаб: [`write-assessment-labs`](../write-assessment-labs/SKILL.md).  
Формат: [`LAB_FORMAT.md`](../../LAB_FORMAT.md) (§ «Просто и наглядно», § «Визуализации»).

Стиль **единый** для всех групп (algorithms, security, network, performance, browser…): не заводить отдельный look на тему.

## Когда нужна схема

Схема на вкладке **«Решение проблемы»** — норма, не опция. **Запустить** меняет картинку; лог не заменяет схему.

Два-три равноправных вида картины (выбрать по теме, не по привычке к `LabNode`):

| Вид | Когда | Что на экране |
|---|---|---|
| **Живой механизм** | эффект темы виден в браузере тем же API/DOM (`createPortal`, boundary, clip, HTTP…) | мини-приложение / контрол; **Запустить** включает реальный эффект |
| **Живой UI-образец** | механизм = **визуальный контракт / look** | 2–3 карточки с реальными контролами; глаз видит совпадение или дрейф |
| **Механизм узлами** | поток, граф, стек, кэш, пайплайн, связи паттерна… | 3–6 узлов, подсвечен **один** текущий шаг |

**Выбор:** если узлы только *рассказывают* то, что глаз может *увидеть* на живом стенде — бери живой механизм. Если «пощупать» нельзя (алгоритм, внутренняя структура без DOM-эффекта) — узлы. Look-темы — UI-образец, не стек `LabNode`.

Если тема чисто про синтаксис/конфиг без состояний — схема не обязательна (крошечный before/after или контраст в UI).

Кластер механизмов — **переключатель + одна схема** (как `algorithms-stack-hashmap`). Не копировать **полотно** `algorithms-graphs-list` (несколько картин сразу).

## Метафора — под механизм

Не копировать горизонтальный поток `A → B → C` (CorsLab) «по умолчанию». Сначала выбрать картинку, которая **показывает** механизм — не абстрактный слой «как в теории», если глаз должен увидеть результат.

| Механизм | Примеры метафор |
|---|---|
| HTTP / CORS / запрос | **живой** поток браузер → API (CorsLab) |
| React portals / overflow clip | **живой** Card + `createPortal` в `#modal-root` (`react-portals`) |
| Error boundaries | **живой** cabinet + fallback (`react-error-boundaries`) |
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
| **Дизайн-система / токены / UI-kit** | **живые кнопки/поля на 2–3 «экранах»**: один контракт vs дрейф look |
| **Типографика / ритм / denseness** | два столбца текста или контролов side-by-side |
| **a11y contrast / focus** | один контрол «ок» рядом с «сломано» (контраст, focus ring) |

CorsLab — эталон **live-API**, не шаблон любой схемы.  
Эталон **живого механизма (React/DOM)**: `app/src/topics/react-portals/ReactPortalsLab.tsx`, `app/src/topics/react-error-boundaries/ReactErrorBoundariesLab.tsx`.  
Эталон **живого UI-образца**: `app/src/topics/layout-design-system/LayoutDesignSystemLab.tsx`.

### Живой механизм (не подменять узлами)

Если тема про поведение, которое **уже видно в DOM/браузере** (портал, clip от `overflow`, fallback границы, реальный запрос) — **не** рисовать схему «узел Card → узел Modal». Стенд должен **делать** то же, что сниппет.

Правила:

1. Мини-сценарий (карточка, кабинет, запрос) внутри `LabVizPanel`; API темы — настоящий (`createPortal`, throw + boundary, `fetch`…).
2. Ghost-кейсы = контраст поведения (без portal / с portal; без границы / с границей), не разные «рисунки узлов».
3. **Запустить** включает эффект; допускается лёгкая анимация появления, но смысл — в реальном результате.
4. Подписи — квитанция (`#modal-root`, `overflow · clip`), не урок.
5. Не раздувать до полноценного продукта: 1 экран, 1 механизм, те же лимиты кейсов.

Плохо: два столбца `#root` / `#modal-root` из `LabNode` с текстом «Modal overlay».  
Хорошо: карточка с `overflow: hidden` и реальный `createPortal` в соседний host.

### Живой UI-образец (не подменять узлами)

Если тема про то, **как выглядит** UI (дизайн-система, токены, типографика, визуальный a11y) — **не** рисовать стек `tokens → Button → Screen` из `LabNode`. Глаз должен сравнить контролы.

Правила:

1. Карточки-сцены (2–3) + настоящие или близкие к ним контролы (`LabButton`, демо-кнопки).
2. Кейсы: **совпадение** vs **дрейф** (или ok vs broken) — после **Запустить** разница видна без чтения подписей.
3. Подпись под контролом — квитанция (`LabButton · tokens` / `uiBtn · r4`), не урок.
4. Chrome лабы (панель, ok/warn рамка) — из токенов. Антипримеры look (намеренно «чужая» кнопка) допустимы **только** внутри схемы: через `var(--…)` с другим сочетанием (radius / weight / fill) или явный demo-класс в CSS топика; не размазывать третий product-primary по приложению.
5. `LabVizPanel` остаётся рамкой; внутри — сцены, не обязательный ряд `LabNode`.

Плохо: три узла «токены / примитив / экран» с текстом `#69b1ff · r4` вместо самой кнопки.  
Хорошо: три экрана с кнопкой «Оплатить» — одинаковые или явно разные.

## Эталоны (визуальный язык)

- `app/src/topics/algorithms-graphs-list/` — граф + порядок обхода
- `app/src/topics/algorithms-stack-hashmap/` — стопка LIFO и корзины `Map` (переключатель, не полотно)
- `app/src/topics/layout-design-system/` — живые primary на экранах (контракт vs дрейф)
- `app/src/topics/react-portals/` — живой `createPortal` + clip
- `app/src/topics/react-error-boundaries/` — живой cabinet + fallback

Новые live-API / живой-механизм лабы переиспользуют **тот же** язык токенов и панелей: `LabVizPanel` / `LabNode` / `labVizStyles` из `app/src/components/lab/LabViz.tsx`. Не копировать блок `.viz` в CSS топика. UI-look и живой механизм — тот же `LabVizPanel`, но содержимое = сцена/контролы, не обязанность `LabNode`.

## Визуальный язык

- Панель схемы: **`LabVizPanel`** (не копипастить `.viz` в топик)
- Узлы (для механизм-схем): **`LabNode`** или `labVizStyles.node*` при кастомной вёрстке / GSAP
- UI-look схемы: карточки-сцены + контролы; `LabNode` не обязателен
- Тёмный фон: градиенты с лёгким `--accent` / `--ok`, `var(--bg-elevated)`, рамка `var(--border)`
- Текущий / активный шаг: `--accent` / `--accent-bright` + мягкий glow (не неон-фиолетовый)
- Успех / посещённое: приглушённый `--ok` / `--log-ok`
- Ошибка / риск / дрейф look: `--warn` или `--danger` / `--log-err`, без кричащих бейджей
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
- **Абстрактные `LabNode`-слои** вместо живого эффекта, если механизм можно показать тем же API/DOM (portal, clip, boundary, live request)
- **Абстрактные `LabNode`-слои** вместо живых контролов, если тема про визуальный look / дизайн-систему / типографику / contrast
- Горизонтальный CORS-поток для темы, которая не про пайплайн запроса
- Оверлеи-бейджи, фиолетовый glow «из коробки AI»
- Огромный `font-size` в SVG (например `15` при `r=8`)
- Свой палитровый «бренд» лабы в обход токенов темы (антипример look — только внутри схемы-демо)
- Несколько схем сразу на одном экране «как в graphs-list»
