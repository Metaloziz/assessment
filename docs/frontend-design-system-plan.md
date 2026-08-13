# План: единый визуальный язык фронта

Актуально на **2026-08-13**. Аудит `app/`. Реализация — по этому файлу; чат не обязателен.

Цель: свести шрифты, размеры, цвета и радиусы к токенам и вынести переиспользуемые UI-примитивы. **Не** редизайн продукта и **не** переписывание лаб.

Связанные документы:

- Токены: [`app/src/styles/tokens.css`](../app/src/styles/tokens.css)
- Тема (сейчас устарела относительно кода): [`app/THEME.md`](../app/THEME.md)
- Лабы: [`LAB_FORMAT.md`](../LAB_FORMAT.md), [`skills/write-assessment-labs/SKILL.md`](../skills/write-assessment-labs/SKILL.md)
- Визуализации: [`skills/assessment-lab-visualizations/SKILL.md`](../skills/assessment-lab-visualizations/SKILL.md)

---

## Вне скоупа (не делать)

- Светлая тема
- Тексты, кейсы, сниппеты, метафоры схем, GSAP-таймлайны
- Сведение всех схем к одному шаблону (Cors-поток и т.п.)
- Разрезание «полотна» `algorithms-graphs-list` (это LAB_FORMAT, не дизайн-система)
- Смена темы CodeMirror / Prism (VS Code Dark+ — отдельный набор, не chrome)
- Tailwind, CSS-in-JS, новый набор иконок
- Перевод legacy-лаб на `JsLabShell` (только токены и кнопка)

Критерий: лабы визуально те же по UX — те же вкладки, те же «Запустить», те же схемы.

---

## Диагноз

Разброс — не «кривой вкус», а **три параллельные системы**, которые не свели.

### 1. Три кнопки с разным primary

| Система | Где | Primary |
|---|---|---|
| `uiBtn*` | `tokens.css`, legacy live-лабы | `--btn-primary-bg` `#69b1ff`, тёмный текст, radius **4** |
| `LabButton` | новые лабы, `InteractiveCodePanel` | `#2f5f8f` + белый текст, radius **8** |
| `shell.btn` / `shell.btnPrimary` | `JsLabShell.module.css`, ~14 `js-*` лаб | копия LabButton, сырой `<button>` |

`THEME.md` велит использовать `uiBtn*`. Новые лабы так не делают.

### 2. Шрифт заявлен, но не загружен

`--font-sans: 'Geist', …`, в `app/index.html` подключён только JetBrains Mono. Geist нигде не импортируется → фактически Segoe UI. `THEME.md` говорит «system stack», токены — Geist.

### 3. Шкала размеров дырявая

Есть `--font-size-body/ui/h1–h3` и `--lab-font-*`. Сайдбар и куски TopicPage бьют хардкодом: `0.62 / 0.68 / 0.7 / 0.72 / 0.8 / 0.82 / 0.84 / 0.88 / 0.9 / 0.95 / 1.05 / 1.1 / 1.45rem`. Веса: `450 / 500 / 600 / 650 / 700`.

### 4. Цвета мимо токенов

- Заголовки: `#fff` вместо `--text` (`#ffffffd9`)
- Лог: `#6a9955 / #f14c4c / #9cdcfe / #dcdcaa` вместо `--ok / --danger / --warn`
- Кнопки LabButton: navy-палитра, которой нет в токенах
- Legacy: `#121212`, `#ce9178`, `#0e0e0e`
- Схемы: `#f14c4c` вместо `--danger`, `#d7ba7d` рядом с `--warn`
- `THEME.md`: акцент `#81a1c1`; в токенах `#69b1ff`. H1/H2 в доке и в CSS тоже разные

### 5. Радиусы

`--radius: 6px`, в коде ещё `2, 3, 4, 8, 10, 14, 999`. Кнопки 8 vs `uiBtn` 4.

### 6. Копипаста вместо примитивов

Семь почти одинаковых `.viz` / `.vizHead` / `.node*`:

- `app/src/topics/cors/CorsLab.module.css`
- `app/src/topics/software-incremental-iterative-spiral/IncrementalIterativeSpiralLab.module.css`
- `app/src/topics/patterns-factory-prototype-proxy-singleton-adapter/PatternsFactoryProxyAdapterLab.module.css`
- `app/src/topics/patterns-chain-abstract-factory-strategy-decorator/PatternsChainStrategyDecoratorLab.module.css`
- `app/src/topics/patterns-mediator-composite-memento/PatternsMediatorCompositeMementoLab.module.css`
- `app/src/topics/algorithms-stack-hashmap/AlgorithmsStackHashmapLab.module.css`
- `app/src/topics/algorithms-graphs-list/AlgorithmsGraphsListLab.module.css`

`JsLabShell.module.css` — кухня: layout + кнопки + field + log + badge. Каждая лаба импортирует CSS модуля как утилиты.

### 7. Два поколения лаб

- **Новые (~60):** `JsLabShell`. Часть на `LabButton`, ранние `js-*` на `shell.btn`.
- **Legacy (~20):** cookies, git-*, dead-code, jenkins, mesos, clusters, worklets, workers, web-apis, SW, IndexedDB. Свои CSS, `uiBtn`, без оболочки.

---

## Решения (зафиксировать в фазе 0, не изобретать третий look)

1. **Кнопка = текущий LabButton** (navy primary, ghost + `active`, sm/md). Он уже в большинстве новых лаб и лучше читается на тёмном chrome, чем светлый `uiBtnPrimary`. Цвета primary вынести в токены (`--btn-lab-primary-*`), не оставлять hex в CSS модуля.
2. **`uiBtn*` удалить** после миграции legacy. Danger перенести в `LabButton variant="danger"`.
3. **Geist:** либо подключить (локально, не Google Fonts для sans), либо вычеркнуть из `--font-sans` и оставить system stack. Не оставлять мёртвое имя.
4. **Инлайн-код в UI/теории:** один токен (сейчас `#ce9178` в shell и MarkdownSections). Синтаксис CodeMirror **не** смешивать с chrome-токенами.
5. **Лог:** `ok/err/warn/info` только из семантических токенов.
6. **Схемы:** общий `LabVizPanel` + состояния узла. Метафору (поток / стопка / граф) не унифицировать — только chrome и токены.

---

## Целевые токены (`app/src/styles/tokens.css`)

Дописать, не ломая существующие имена `--bg-* / --text-* / --accent* / --lab-font-*`.

### Тип

- `--font-weight-regular: 400`
- `--font-weight-medium: 500`
- `--font-weight-semibold: 600`
- `--font-weight-bold: 700`

Убрать `650` / `450`. Chrome-сайдбар: `--font-size-ui-sm`, `--font-size-ui-xs` (вместо россыпи 0.62–0.7). Не плодить 12 ступеней — **5–6 на весь продукт**.

| Токен | Роль |
|---|---|
| `--font-size-ui-xs` | бейджи, прогресс, номер темы |
| `--font-size-ui` | сайдбар, мелкие контролы (уже 13px) |
| `--lab-font-meta` | подписи схем, hint |
| `--lab-font-ui` | кнопки, табы |
| `--font-size-body` / `--lab-font-body` | теория и тело лабы |
| `--lab-font-lead` / `--font-size-h3` / `--h2` / `--h1` | как сейчас |

### Пространство

`--space-1 … --space-6` (например 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2.5 rem). Паддинги секций лаб (`0.85 / 0.9 / 0.95`) свести к двум значениям.

### Радиус

- `--radius-sm: 4px` — инлайн-код, мелкий бейдж
- `--radius: 6px` — карточки, табы
- `--radius-lg: 8px` — кнопки, инпуты, узлы схем (сейчас 8–10)
- `--radius-pill: 999px` — только чипы

### Семантика лога / узла

- `--log-ok`, `--log-err`, `--log-warn`, `--log-info` (могут ссылаться на `--ok` / `--danger` / `--warn` / `--accent-bright`)
- `--node-idle-bg` — не сырой `rgba(20,24,30,0.55)` в каждой лабе

### Кнопка

Все цвета LabButton в `--btn-*`. В компонентах только `var()`.

**Правило:** hardcoded hex вне `tokens.css` и вне CodeMirror/Prism-темы — запрещён.

---

## Переиспользуемые элементы

Класть в `app/src/components/lab/` (chrome при необходимости в `app/src/components/`). Не плодить папки «на будущее».

| Компонент | API (минимум) | Заменяет |
|---|---|---|
| **LabButton** | `variant: primary \| secondary \| ghost \| danger`, `size: sm \| md`, `active` | `uiBtn*`, `shell.btn*` |
| **LabField** | label + `input`/`select`/`textarea` | `.field` из shell CSS |
| **LabLogView** | уже есть; вынести CSS из shell | `.log*` |
| **LabBadge** | children + optional tone | `.badge` |
| **LabStage** | площадка демо | `.stage` |
| **LabVizPanel** | `title`, `meta`, `children` | `.viz` / `.vizHead` / `.vizTitle` / `.vizMeta` |
| **LabNode** | `state: idle \| active \| ok \| err`, label, sub | `.node*` |
| **Инлайн-код** | не обязателен как React; глобальный стиль + токен | дубли в shell, MarkdownSections, InteractiveCodePanel |

**Не выносить в компоненты:** уникальные SVG-графы, стопки, луковицы, пакеты. Только панель и состояние узла.

`JsLabShell.module.css` после фазы 4: только `.root / .section / .title / .lead / .panel / .pain / .steps / .hint / .row`. Кнопки и поля — не здесь.

---

## Фазы

Коммиты лучше по фазам, не одним «design system». Коммитить только если попросили.

### Фаза 0 — контракт

- [ ] Сверить и поправить `app/THEME.md` под фактические токены **после** решений выше (не откатывать LabButton к старому `uiBtn`)
- [ ] Зафиксировать в THEME: шкала типа, радиусы, «одна кнопка — LabButton», «hex только в tokens.css»
- [ ] Короткий чеклист в `skills/write-assessment-labs/SKILL.md`: новые лабы не копируют `.viz`, не пишут `shell.btn`, не хардкодят цвета

### Фаза 1 — токены

Файл: `app/src/styles/tokens.css`.

- [ ] Добавить space / radius / weight / log / btn-lab
- [ ] `uiBtn` пока оставить (legacy) либо сразу пометить deprecated в THEME
- [ ] Вычистить hex из hover `uiBtnDanger` (`#ffe0d8` и т.п.) — тоже в var

### Фаза 2 — шрифт

- [ ] Geist: подключить **или** удалить имя из `--font-sans`
- [ ] `--font-mono` уже JetBrains — не трогать
- [ ] `ApiSmokePage.module.css`: стек `ui-monospace, Menlo…` → `var(--font-mono)`

### Фаза 3 — одна кнопка

Порядок:

1. Расширить `LabButton` (`danger`; цвета из токенов)
2. Заменить `shell.btn` / `shell.btnPrimary` во всех `js-*` на `LabButton`
3. Заменить `className="uiBtn …"` в legacy: LiveJenkins, LiveMesos, clusters, worklets, workers, IndexedDB, WebApis, SW, git simulators
4. Chrome: `labCloseBtn` / `labOpenBtn` на TopicPage — тот же примитив, не третий вид
5. Удалить `.btn` / `.btnPrimary` из `JsLabShell.module.css` и `.uiBtn*` из `tokens.css`

Не менять подписи кнопок и сценарии.

Потребители `shell.btn` (на момент аудита):  
`EventDelegationLab`, `BindCallApplyLab`, `ArrowPrototypeLab`, `SelectionRangeLab`, `MutationObserverLab`, `NullPrototypeLab`, `PrototypalInheritanceLab`, `FactoryFunctionsLab`, `ArrowSyntaxLab`, `EventThisLab`, `LiveCollectionsLab`, `PrototypeChainLab`, `ScopeChainLab`, `LexicalEnvironmentLab`.

### Фаза 4 — примитивы лаб + viz

- [ ] Вынести CSS log / field / badge / stage из shell
- [ ] `LabVizPanel` + общие классы узла (можно один `LabViz.module.css`)
- [ ] Подключить в 7 лаб с копипастой `.viz`. Уникальное (`.packet`, SVG, стопка) оставить в локальном CSS
- [ ] Graphs-list: только токены панели/узла, **не** резать полотно

### Фаза 5 — chrome приложения

Файлы: `TopicSidebar.module.css`, `TopicPage.module.css`, `AppShell.module.css`, `MarkdownSections.module.css`, `LevelBadge`, `TopicCheckbox`.

- [ ] Все `font-size` → токены шкалы
- [ ] `#fff` → `--text` (или один `--text-heading`, если нужен чуть ярче body — не сырой white)
- [ ] Радиусы сайдбара к `--radius-sm` / `--radius`
- [ ] Теория: `1rem` в MarkdownSections → `--font-size-body`

Сетку/поведение сайдбара не ломать.

### Фаза 6 — legacy CSS

Не переписывать на JsLabShell. Только:

- [ ] `#121212` / `#0e0e0e` → `--bg-deep` или `--code-bg`
- [ ] `#ce9178` инлайн-кода → тот же токен, что в теории
- [ ] `uiBtn` уже уйдёт в фазе 3
- [ ] секции `.section / .title / .lead` в GitSwitchLab и аналогах — те же токены, что у shell

Приоритет: git / cookies / dead-code (проще), потом Live* (больше hex).

### Фаза 7 — сторожа

- [ ] THEME.md = истина после кода
- [ ] В write-assessment-labs: запрет нового `.viz` с нуля, запрет hex, запрет `shell.btn`
- [ ] По желанию: grep-чек в CI (`#[0-9a-f]{3,8}` в `*.module.css` кроме tokens и code-theme). Не обязательно, если нет готового пайплайна

---

## Порядок файлов

1. `tokens.css` + `THEME.md`
2. `LabButton` + миграция потребителей
3. Сплит `JsLabShell.module.css` + `LabField` / log CSS
4. `LabVizPanel` + 7 viz-лаб
5. Sidebar / TopicPage / MarkdownSections
6. Legacy CSS
7. Skills

---

## Критерий готовности

- Один primary у кнопок во всём `app/`
- Geist либо загружен, либо отсутствует в токенах
- Нет копипасты `.viz {` в топиках — общий модуль
- `font-size` / `border-radius` / цвета chrome и лаб — из `var(--…)`
- `THEME.md` совпадает с `tokens.css`
- UX лаб не изменился

Ориентир объёма: не редизайн с нуля, а сведение уже существующего LabButton/shell-look к одному контракту и вынос 6–8 примитивов.
