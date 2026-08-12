---
name: write-assessment-labs
description: >-
  Creates and edits assessment interactive labs (`*Lab.tsx`): simple visual
  stands (one mechanism, one diagram, buttons change the picture), JsLabShell,
  InteractiveCodePanel, real-file Code tab with ← markers, problem tab,
  wiring in parseTopicMd and TopicPage. Use when adding or rewriting labs,
  вкладка Код, лаборатория, middle/senior lab, or LAB_FORMAT work in this repo.
---

# Как писать лабы assessment

Проектный скилл (`skills/` в корне репо). Полные правила — [`LAB_FORMAT.md`](../../LAB_FORMAT.md).

Связанный скилл теории: [`write-assessment-topics`](../write-assessment-topics/SKILL.md).  
Визуализации (общий стиль): [`assessment-lab-visualizations`](../assessment-lab-visualizations/SKILL.md).

## Когда лаба нужна

| Уровень (`groups.ts`) | Лаба |
|------------------------|------|
| **middle** / **senior** | **обязательна** |
| **junior** | только по явной просьбе |

## Источники

1. [`LAB_FORMAT.md`](../../LAB_FORMAT.md) — формат и лимиты
2. Эталон вкладки **«Код»**: `app/src/topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab.tsx`
3. Эталон вкладки **«Решение проблемы»** (стенд): `app/src/topics/cors/CorsLab.tsx` — схема + 2–3 действия; лог — квитанция
4. Визуальный **язык** (токены, SVG): [`assessment-lab-visualizations`](../assessment-lab-visualizations/SKILL.md). Algorithms — стиль, не объём файла
5. Оболочка: `app/src/topics/js-*/*Lab.tsx` (пилоты `107+`)

## Стенд, не статья

Лаба — мини-стенд на **один** механизм темы. За 10–20 секунд должно быть ясно: что сломано, что нажать, что изменилось на схеме.

Вкладки UI **две** (не три): **Код** и **Решение проблемы**. Схема живёт на «Решении проблемы», не отдельной вкладкой.

### Дизайн до кода

1. Выбрать **один** механизм (не всю «Суть» markdown).
2. Набросать 3–6 узлов и 2–4 состояния (`idle` → шаг → ok / ошибка).
3. Придумать 2–3 действия, которые **меняют картинку** (плохо/хорошо или 2–3 контраста).
4. Только потом — сниппеты «Код» и проводка.

### Лимиты

| Что | Лимит |
|-----|--------|
| `pain` | 1–2 предложения |
| шаги | 2–3, про действие |
| сценарии / режимы | **2–3**, не 4–5 |
| сниппеты | **2–3** файла |
| схема | 3–6 узлов, один «сейчас» |
| лог за прогон | 2–5 строк; не дублировать `pain` |

### Схема по умолчанию

На «Решении проблемы» схема **норма**, не опция. Кнопка обновляет картинку; лог — квитанция (статус, заголовок), не урок.

Исключение: у темы нет состояний/потока (чистый синтаксис/конфиг) — контраст в UI или крошечный before/after. **Запрещено** учить механизм только строками `log(...)`.

Live-API (CORS, JWT, SQLi…) — двигатель стенда, не замена схеме. Стиль схемы — только [`assessment-lab-visualizations`](../assessment-lab-visualizations/SKILL.md). `prefers-reduced-motion: reduce`.

### Антипаттерны

- Только лог, без картины — как `sql-injection` / соседние security до рерайта
- 4–5 сценариев на один экран (хватает 2–3 контрастов, см. CorsLab)
- Вся тема в одной лабе (список + граф + BFS + DFS) — не копировать объём `algorithms-graphs-list`
- Мета-фразы в UI про «настоящие файлы» и `←` (см. ниже)

## Обязательный каркас

- `JsLabShell` + `InteractiveCodePanel`
- Две вкладки: **Код** (первая) и **Решение проблемы**
- **Не** передавать `sandbox` / не делать «Песочницу»
- `TOPIC_ID` = id темы; ключ LS: `assessment-lab-code:${topicId}:${snippetId}`

Проводка:

1. `hasLab` в `app/src/content/parseTopicMd.ts`
2. import + ветка в `TopicLab` в `app/src/pages/TopicPage.tsx`
3. файл `app/src/topics/<slug>/<Name>Lab.tsx`

## Вкладка «Код»

- Сниппеты = **реальные** файлы/фрагменты (`package.json`, `webpack.config.js`, `store.js`, …), не псевдо-`console.log`-демо.
- Важное помечать **в коде**: `// ← HMR`, блоки `/* LOADERS */`.
- Node / `require` / неисполняемое → `executable: false` (консоль и «Выполнить» скрыты).
- 2–3 сниппета-файла по подтемам.

### Не писать в UI

В `intro` / `note` / `lead` / `pain` / `hint` **запрещены** мета-фразы:

- «Настоящие файлы проекта»
- «важное выделено комментариями `← …`»
- «артефакты с пометками»

`intro` — про **содержание темы**. Пометки `←` — только внутри кода.

## Вкладка «Решение проблемы»

Раскладка: `pain` → схема → 2–3 действия (`LabButton`) → одна строка `hint` → короткий лог (`useLabLog` / `LabLogView`).

- `pain`: зачем механизм в работе/учёбе (без лексики собеседований)
- Ссылки на «Код» уместны («см. store.js»), без рассказа про формат оформления
- Кнопка не должна только писать в лог, если на экране есть схема

## Тон

Как в теории: учёба и практика. Запрет лексики найма/собеседований — см. `TOPIC_FORMAT.md`.

## Чеклист

- [ ] Уровень middle/senior → лаба есть и подключена
- [ ] Один механизм; лимиты (pain / шаги / 2–3 сценария / 2–3 файла)
- [ ] На «Проблеме» схема реагирует на кнопки (или явное исключение: нет потока)
- [ ] Лог — квитанция, не урок
- [ ] Код = узнаваемые файлы + `←` в коде
- [ ] `executable: false` где нужно; нет плейсхолдера «эталон без запуска» в консоли
- [ ] intro/lead/pain без мета-инструкций агенту
- [ ] Стиль схемы — `assessment-lab-visualizations`
- [ ] Следование `LAB_FORMAT.md`
