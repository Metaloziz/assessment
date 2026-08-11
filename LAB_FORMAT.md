# Правила оформления лабораторий

Документ — **источник истины** для лаб в assessment. Новые лабы и правки существующих — только по этому файлу.

**Эталон оболочки:** пилоты `107+` (IIFE, классы, V8, Web Components и т.д.) в `app/src/topics/js-*/*Lab.tsx`.

**Эталон вкладки «Код» (настоящие файлы + комментарии-выделения):**  
[`app/src/topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab.tsx`](app/src/topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab.tsx) — `package.json`, `webpack.config.js`, модули с пометками `← SCRIPTS` / `HMR` / `TREE SHAKING` / `MINIFY`.

Связанный формат теории: [`TOPIC_FORMAT.md`](TOPIC_FORMAT.md).

Тон как в теории: **учёба и практика**, без лексики собеседований / найма (см. «Назначение проекта» в `TOPIC_FORMAT.md`). В `pain` / `lead` / `hint` — зачем механизм в коде, не «что спросят».

### Когда лаба обязательна

- Уровень **middle** или **senior** (новые темы и те, которые правим) — **лаба обязательна**.
- Уровень **junior** — лаба только если явно попросили; по умолчанию только теория.

---

## Формат (обязателен для новых)

Две вкладки, без «Песочницы»:

1. **Код** (первая, активна по умолчанию) — `InteractiveCodePanel`
2. **Решение проблемы** — житейская боль, 2–4 шага, `LabButton` + лог

Оболочка: `JsLabShell` + `InteractiveCodePanel`.  
`sandbox` **не передавать**.  
`defaultTab: 'code'` (дефолт shell/tabs).

Ключ LS: `assessment-lab-code:${topicId}:${snippetId}`.

### Вкладка «Код» — настоящий код

Сниппеты во вкладке **Код** — это **реальный код** (как в проекте: `package.json`, `webpack.config.js`, модули, конфиги), а не псевдо-объекты «для console.log» и не абстрактные таблицы в коде.

- Показывать цельный файл или осмысленный фрагмент файла, который можно узнать в репозитории.
- Участки, важные для темы, **выделять комментариями** в самом файле (`// ← HMR`, `// LOADERS`, блок `/* … */`), а не отдельной «шпаргалкой» вместо кода.
- Эталоны с `require` / Node API, которые песочница не исполнит — `executable: false`.
- Допустимы 2–4 сниппета-файла по подтемам; каждый — настоящий артефакт, не demo-строка.

#### Не писать в UI инструкции агенту

Правило «настоящие файлы + комментарии `← …`» — для автора лабы, **не** для текста на экране.

- В `intro`, `note`, `lead`, `pain`, `hint` **не** писать мета-фразы вроде: «Настоящие файлы проекта», «важное выделено комментариями `← …`», «артефакты с пометками».
- `intro` — коротко **о содержании темы** (что смотреть в файлах), не о формате оформления.
- Пометки `← …` остаются **только внутри кода** сниппетов.

Плохо (intro): `Настоящие файлы проекта. Важное для темы выделено комментариями ← ….`  
Хорошо (intro): `` `webpack-merge`: common / dev / prod; HtmlWebpackPlugin, Terser, analyzer. ``

Плохо: `const roles = [['css-loader', '…']]; console.log(roles)`.  
Хорошо: полный `webpack.config.js` с помеченными `module.rules` и `plugins`.

### Миграция legacy

Классика (`LabCodePanel` + «Песочница») — не создавать. Если касаешься темы со старой лабой — мигрируй на этот стандарт, если объём разумный.

### Редактор

`fill` / `fillAvailable` по умолчанию `true`: высота по контенту, потолок — свободное место в доке. Выключать только по явной просьбе.

---

## Текст с цветными вставками (как в теории)

Термины, API, имена методов/классов — **всегда** в инлайн-коде. Стиль уже в CSS: фон `rgba(255,255,255,0.06)`, цвет `#ce9178`.

| Где | Как писать |
| --- | --- |
| **Решение проблемы** (`pain`, `steps`, `hint`, `lead`) | JSX: `<code>getPrototypeOf</code>` |
| **Код** (`intro`, `note` у сниппетов) | Строка с backticks: `` `getPrototypeOf` `` — `InteractiveCodePanel` сам рендерит в `<code>` |

### Примеры

**Проблема:**

```tsx
<p className={shell.pain}>
  Метод лежит на <code>Person.prototype</code>, не на экземпляре. Смотрите{' '}
  <code>Object.getPrototypeOf</code>.
</p>
```

**Код (intro / note):**

```tsx
intro="Смотрите связи: `prototype`, `getPrototypeOf`, `extends`, `new`."
note: '`target` — источник; `currentTarget` — узел с обработчиком.'
```

- ✅ Оборачивать: `class`, `new`, `Map`, `localStorage`, `#field`, `::part`, имена API.
- ❌ Голый текст терминов без backticks / `<code>` во вкладке «Код» или в pain/steps.

Тон «Проблемы»: житейский, без глоссария. Детали API — в «Код» и в теории справа.

---

## Кнопки — только `LabButton`

Компонент: [`app/src/components/lab/LabButton.tsx`](app/src/components/lab/LabButton.tsx). Варианты через props:

| Prop | Назначение |
| --- | --- |
| `variant="primary"` | Главное действие на экране |
| `variant="secondary"` | Остальные действия (дефолт) |
| `variant="ghost"` + `active` | Табы сниппетов / переключатели режимов |
| `size="sm"` | Компактные ghost-табы |

```tsx
<LabButton variant="primary" onClick={…}>Создать</LabButton>
<LabButton variant="secondary" onClick={clear}>Очистить лог</LabButton>
```

- ❌ Не использовать `shell.btn` / `shell.btnPrimary` в новых лабах.
- ❌ Не плодить локальные стили кнопок «чуть другие» на одной странице.

Во вкладке «Код» тулбар и табы сниппетов уже на `LabButton` внутри `InteractiveCodePanel`.

---

## Подключение лабы к теме

1. Компонент: `app/src/topics/<slug>/<Name>Lab.tsx`.
2. В [`app/src/content/parseTopicMd.ts`](app/src/content/parseTopicMd.ts) — добавить `id` темы в `hasLab`.
3. В [`app/src/pages/TopicPage.tsx`](app/src/pages/TopicPage.tsx) — импорт и ветка в `TopicLab`.
4. В markdown темы при необходимости отметить наличие лабы (если в проекте есть такой маркер в frontmatter/теле — следуй существующим темам с лабой).

### Группа Redux

Лабы Redux пишем на **React + TypeScript** с `@reduxjs/toolkit` и `react-redux`:

- живой UI и store — во вкладке «Решение проблемы» (`Provider`, `createSlice`, `createAsyncThunk`);
- во вкладке «Код» — эталоны TS/TSX со `executable: false` (песочница `new Function` не исполняет JSX/типы);
- оболочка по-прежнему `JsLabShell` + `InteractiveCodePanel`.

### Визуализации (структуры / обходы)

Если лаба про графы, списки, деревья, обходы — **по возможности** схема в духе эталона `algorithms-graphs-list` (тёмная панель, accent/ok подсветка, SVG или цепочка узлов). Детали стиля: [`.cursor/rules/lab-visualizations.mdc`](.cursor/rules/lab-visualizations.mdc). В SVG не давать подписям цеплять край круга (`font-size` в user units viewBox).

---

## Чеклист новой лабы

- [ ] `JsLabShell` + `InteractiveCodePanel`, без `sandbox`
- [ ] «Код» первая / default
- [ ] Все действия через `LabButton` (`primary` / `secondary`)
- [ ] В pain/steps/hint — `<code>…</code>` на терминах
- [ ] В `intro` и каждом `note` — backticks на терминах
- [ ] 2–4 сниппета **настоящего кода** (файлы проекта); важное — комментариями в коде; `executable: false` если Node/`require`
- [ ] Тема подключена в `parseTopicMd.ts` и `TopicPage.tsx`
- [ ] Если уместна схема структуры/обхода — визуализация по `lab-visualizations`
