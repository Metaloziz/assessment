# Visual Theme — Assessment Prep

Описание визуальной системы приложения. Ориентир — **Notion dark** для области чтения (`#191919`) + плоский IDE-chrome для сайдбара/панелей.

Источник токенов: [`app/src/styles/tokens.css`](src/styles/tokens.css)

---

## Принципы

1. **Плоскость** — без мягких градиентов фона и тяжёлых теней.
2. **Контраст действий** — интерактивные кнопки не сливаются с панелями: primary заливка accent, danger с тёплым контуром.
3. **Читаемый контент + компактный chrome** — body ~16px / line-height 1.6; сайдбар остаётся UI-scale (~13px).
4. **Один акцент** — холодный blue-gray (`#81a1c1`), без фиолетового «AI glow».
5. **Reduced motion** — анимации GSAP уважают `prefers-reduced-motion`.

---

## Палитра

| Токен | Значение | Назначение |
|-------|----------|------------|
| `--bg-deep` | `#191919` | Фон чтения / main (как Notion dark) |
| `--bg-panel` | `#151515` | Сайдбар |
| `--bg-elevated` | `#202020` | Карточки, code chrome |
| `--bg-hover` | `#2a2a2a` | Hover строк |
| `--bg-active` | `#2f2f2f` | Active row / secondary surfaces |
| `--border` | `#2b2b2b` | Разделители |
| `--text` | `#e6e6e6` | Основной текст |
| `--text-muted` | `#9a9a9a` | Вторичный |
| `--text-faint` | `#6b6b6b` | Мета / номера |
| `--accent` | `#81a1c1` | Active indicator, primary btn |
| `--accent-bright` | `#a8c7e8` | Ссылки, hover primary |
| `--selection` | `#264f78` | Выделение текста |
| `--danger` | `#f48771` | Destructive actions |
| `--ok` | `#89d185` | Успех / immutable «good» |

---

## Кнопки (обязательный контраст)

Глобальные классы в `tokens.css`:

| Класс | Когда |
|-------|--------|
| `uiBtn uiBtnPrimary` | Главное действие: Скопировать, Immutable update, Reveal |
| `uiBtn uiBtnDanger` | Риск / мутация: Мутировать |
| `uiBtn uiBtnGhost` | Вторичное: Сброс |

Primary: заливка `--btn-primary-bg`, тёмный текст.  
Danger: тёплый border + tinted background.  
Ghost: более светлая рамка (`#4a4a4a`), не «серое на сером».

Не делать основные lab-кнопки только `border + bg-active` — они теряются.

---

## Типографика

- **Body (теория):** `--font-size-body: 16px`, `--line-height-body: 1.6` — комфортное чтение как в markdown preview.
- **H1 темы:** `--font-size-h1: 1.75rem` (~28px), bold.
- **H2 секций:** `--font-size-h2: 1.25rem` (~20px), bold.
- **Sidebar UI:** `--font-size-ui: 13px` — explorer остаётся плотным.
- **UI sans:** system stack (`Segoe UI` / system-ui).
- **Mono:** `JetBrains Mono` — код, номера тем, progress.

---

## Layout

- **Sidebar ~300px** — Notion-like list: checkbox + цветной квадрат уровня + название; soft hover, без IDE left-border.
- **Main** — теория слева; при наличии lab — правая колонка «Лаборатория» всегда видна (независимый скролл).
- **Tabs** — Теория / Код / Ссылки (лаборатория не во вкладках).

---

## Компоненты лабораторий

Секции lab: тонкая рамка `--border`, фон `--bg-elevated`, без box-shadow.  
Интерактив внутри: GSAP + `useGSAP` (`@gsap/react`), scope на контейнер секции.

---

## Группы и уровни (Notion)

Группы сайдбара = базы Notion Senior (`Производительность`, `Git`, `Тестирование`, …).

Цвет вопроса в Notion = уровень сложности:

| Notion | Уровень | В UI |
|--------|---------|------|
| 🟩 | Junior | зелёный квадрат |
| 🟧 | Middle | оранжевый квадрат |
| 🟪 | Senior | фиолетовый квадрат |

Маппинг: [`src/content/groups.ts`](src/content/groups.ts)

---

## Как расширять тему

1. Новые цвета — только через CSS variables в `tokens.css`.
2. Новые кнопки — переиспользовать `uiBtn*`, не копировать локальные серые стили.
3. Новая lab-тема — те же токены; анимации по skills `gsap-react` / `gsap-core`.
4. Светлая тема — вне текущего scope (пока только dark chrome).
