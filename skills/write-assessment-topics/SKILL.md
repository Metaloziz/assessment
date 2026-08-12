---
name: write-assessment-topics
description: >-
  Writes and edits assessment theory topics (`topics/*.md`) and related group
  metadata: structure, dense «Суть», remember bullets, description, links;
  junior/middle/senior levels; labs when required. Use when creating or rewriting
  topics, groups, «Суть», interview-prep content in this repo, or when the user
  asks to добавить/оформить тему, группу тем, или теорию assessment.
---

# Как писать темы assessment

Проектный скилл (`skills/` в корне репо, не в `.cursor`). Полные правила — рядом в корне; здесь workflow и обязательные якоря.

Связанный скилл лаб: [`write-assessment-labs`](../write-assessment-labs/SKILL.md).

## Источники истины (читать перед работой)

1. [`TOPIC_FORMAT.md`](../../TOPIC_FORMAT.md) — структура markdown-темы и раздел **«Суть»**.
2. [`LAB_FORMAT.md`](../../LAB_FORMAT.md) — лабы (если нужны).
3. Метаданные: [`app/src/content/groups.ts`](../../app/src/content/groups.ts) — группа, уровень, `sortInGroup`.

Правило Cursor `.cursor/rules/topic-format.mdc` только отсылает сюда и к `TOPIC_FORMAT.md` — **не дублируй** длинные правила в новых местах.

## Эталоны

| Что | Файл |
|-----|------|
| Целая тема (описание, структура) | `topics/112-js-v8-pipeline.md` |
| Плотность **«Сути»** (широкая тема) | `topics/140-project-prod-dev-plugins.md` |
| Короткая «Суть» | `topics/71-why-cicd.md` |
| Вкладка «Код» в лабе | `app/src/topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab.tsx` |

Перед написанием «Сути» для широкой темы — **прочитай** эталон 140 (или § «Хорошо (широкая тема)» в `TOPIC_FORMAT.md`).

## Когда что делать

| Запрос | Действия |
|--------|----------|
| Новая тема / группа | `topics/NNN-….md` + запись в `TOPIC_META` / при необходимости группа в `TOPIC_GROUPS` |
| Только теория | junior → **без** лабы, пока явно не попросили |
| middle / senior | теория **+ лаба** по `LAB_FORMAT.md`; проводка `hasLab` в `parseTopicMd.ts` и `TopicPage.tsx` |
| Правка одной темы | тяни качество к эталонам; **не** массовый рерайт всех файлов |
| Старый «Ответ для собеседования» | заменить на `# 3. Суть` |

Имена файлов: `NNN-slug.md`, номер = префикс id (как `140-project-prod-dev-plugins`). Уровень **только** в `groups.ts`, не в заголовке markdown.

## Структура `topics/*.md` (обязательна)

```markdown
# 1. Тема
**Заголовок**

# 2. Главное в одну фразу
Одна плотная фраза.

# 3. Суть
> абзац
>
> абзац
>
> …

# 4. Самое главное запомнить
- буллеты или короткая таблица

# 5. Описание
## Подразделы, схемы, примеры кода

# 6. Ссылки
- первоисточники
```

Язык: **русский**. Тон: учёба и практика в коде — **не** найм / собеседования.

### Запрещённая лексика

Не писать: собеседование, интервью, interview, кандидат, оффер, «часто спрашивают», «как отвечать», «шпаргалка к интервью» и т.п. (полный список — в `TOPIC_FORMAT.md`).

## «Суть» — кратко

- Один blockquote `>`; 2–4 абзаца: **что → зачем → как → ловушка** (ловушка желательна).
- ~80–160 слов; широкая тема — до ~200–220.
- Не буллеты, не копия раздела 2, не каталог фич без «зачем».
- Между абзацами — строка с одним `>`.

Чеклист после написания:

- [ ] что / зачем / как на месте
- [ ] читается вслух ~за минуту
- [ ] нет лексики собеседований и «я бы…»
- [ ] `# 3. Суть` именно так
- [ ] детали вынесены в Описание, если раздулось

## Лаба (middle / senior)

Читай и следуй [`LAB_FORMAT.md`](../../LAB_FORMAT.md). Якоря:

- `JsLabShell` + `InteractiveCodePanel`; без sandbox / песочницы.
- «Код» = **реальные** файлы (`webpack.config.js`, `store.js`, …) с пометками `// ← …` **внутри кода**.
- `executable: false` для Node/`require` — консоль и «Выполнить» скрыты.
- В `intro` / `lead` / `pain` **не** писать мета про «настоящие файлы» и «выделено комментариями» — это правило автора, не UI.
- Эталон кода: lab `139-project-scripts-hmr-treeshake`.

## Workflow новой темы

```
1. Уточнить группу, уровень, заголовок, id (NNN-slug)
2. Прочитать TOPIC_FORMAT.md (+ эталон Сути при широкой теме)
3. Добавить TOPIC_META в groups.ts (sortInGroup)
4. Написать topics/NNN-….md
5. Если middle/senior → лаба + parseTopicMd hasLab + TopicPage import
6. Чеклист Сути и (если есть) LAB_FORMAT
```

## Чего не делать

- Не копировать весь `TOPIC_FORMAT.md` в ответы пользователю — делай тему по правилам.
- Не массово переписывать старые темы без запроса.
- Не ставить лабу junior «на всякий случай».
- Не оставлять в UI агентские инструкции про формат.
