# Visual Theme — Assessment Prep

Описание визуальной системы приложения. Ориентир — **Notion dark** для области чтения (`#191919`) + плоский IDE-chrome для сайдбара/панелей.

**Источник истины токенов:** [`app/src/styles/tokens.css`](src/styles/tokens.css).  
Hardcoded hex вне `tokens.css` и вне тем CodeMirror/Prism — **запрещён**.

---

## Принципы

1. **Плоскость** — без мягких градиентов фона и тяжёлых теней.
2. **Одна кнопка** — все действия chrome/лаб через `LabButton` (`app/src/components/lab/LabButton.tsx`). Не копировать локальные `.btn` / не возвращать `uiBtn*`.
3. **Читаемый контент + компактный chrome** — body 16px; сайдбар UI-scale.
4. **Один акцент** — холодный blue `--accent` `#69b1ff`, без фиолетового «AI glow».
5. **Reduced motion** — GSAP уважает `prefers-reduced-motion`.

---

## Палитра (кратко)

| Токен | Назначение |
|-------|------------|
| `--bg-deep` | Фон чтения / main |
| `--bg-panel` | Сайдбар / lab chrome |
| `--bg-elevated` / `--code-bg` | Карточки, code blocks |
| `--text` | Основной текст |
| `--text-heading` | Заголовки (чуть ярче body) |
| `--text-muted` / `--text-faint` | Вторичный / подписи |
| `--accent` / `--accent-bright` | Акцент |
| `--ok` / `--warn` / `--danger` | Семантика |
| `--code-inline` | Инлайн-код в теории и лаб-chrome (не CodeMirror) |
| `--log-ok` / `--log-err` / `--log-warn` / `--log-info` | Строки лога |
| `--node-idle-bg` | Базовый фон узла схемы |

Кнопка LabButton: `--btn-primary-*`, `--btn-secondary-*`, `--btn-ghost-*`, `--btn-danger-*`.

---

## Кнопки

Компонент: **`LabButton`**

| variant | Когда |
|---------|--------|
| `primary` | Главное действие: Запустить, Reveal, подтверждение |
| `secondary` | Вторичное залитое (по умолчанию) |
| `ghost` + `active` | Переключатели кейсов / сниппетов |
| `danger` | Риск / мутация / удаление |

Размеры: `sm` | `md`.  
Не плодить третий look в CSS модулях лаб.

---

## Типографика

- **Sans:** Geist Variable (локально через `@fontsource-variable/geist`) + system fallbacks — `--font-sans`
- **Mono:** JetBrains Mono — `--font-mono` (уже в `index.html`)
- **Веса:** только `--font-weight-regular|medium|semibold|bold` (без 450/650)

Шкала (5–6 ступеней на продукт):

| Токен | Роль |
|-------|------|
| `--font-size-ui-xs` | бейджи, прогресс, номер темы |
| `--font-size-ui-sm` | мелкий chrome |
| `--font-size-ui` | сайдбар (13px) |
| `--lab-font-meta` | подписи схем, hint |
| `--lab-font-ui` | кнопки, табы |
| `--font-size-body` / `--lab-font-body` | теория и тело лабы |
| `--lab-font-lead` / `--font-size-h3` / `--h2` / `--h1` | лиды и заголовки |

---

## Пространство и радиусы

- `--space-1` … `--space-6` (0.25 / 0.5 / 0.75 / 1 / 1.5 / 2.5 rem)
- `--lab-section-pad-y` / `--lab-section-pad-x` — паддинг секций лаб
- `--radius-sm` 4px — инлайн-код, мелкий бейдж
- `--radius` 6px — карточки, табы
- `--radius-lg` 8px — кнопки, инпуты, узлы схем
- `--radius-pill` — только чипы

---

## Примитивы лаб (`app/src/components/lab/`)

| Компонент | Заменяет |
|-----------|----------|
| `LabButton` | любые локальные кнопки / бывший `uiBtn*` / `shell.btn*` |
| `LabField` | `.field` |
| `LabLogView` | лог (свои CSS-токены `--log-*`) |
| `LabBadge` | `.badge` |
| `LabStage` | `.stage` |
| `LabVizPanel` + `LabNode` / `labVizStyles` | копипаста `.viz` / `.node*` |

`JsLabShell.module.css` — оболочка: `.root`, `.section`, `.title`, `.lead`, `.panel`, `.pain`, `.steps`, `.hint`, `.row` (+ list).  
Новые лабы **не** копируют `.viz` в топик и **не** хардкодят цвета.

Уникальные метафоры схем (SVG-граф, стопка, луковица, пакет) остаются в локальном CSS топика.

Синтаксис CodeMirror / Prism — отдельный набор, не смешивать с chrome-токенами.

---

## Layout

- **Sidebar ~300px** — список тем; можно скрыть, состояние в `assessment-layout`.
- **Main** — теория / lab dock; ширины тянутся за разделитель.

---

## Группы и уровни

Цвет вопроса в Notion = уровень:

| Notion | Уровень |
|--------|---------|
| 🟩 | Junior |
| 🟧 | Middle |
| 🟪 | Senior |

Маппинг: [`src/content/groups.ts`](src/content/groups.ts)

---

## Как расширять тему

1. Новые цвета / радиусы / размеры — только CSS variables в `tokens.css`, затем `var()` в модулях.
2. Новые кнопки — только `LabButton`.
3. Новая схема — `LabVizPanel` (+ `LabNode` / `labVizStyles`); метафору не унифицировать.
4. Светлая тема — вне текущего scope.
