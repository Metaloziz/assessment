---
name: write-assessment-labs
description: >-
  Creates and edits assessment interactive labs (`*Lab.tsx`): JsLabShell,
  InteractiveCodePanel, real-file Code tab with ← markers, problem tab, wiring
  in parseTopicMd and TopicPage. Use when adding or rewriting labs, вкладка Код,
  лаборатория, middle/senior lab, or LAB_FORMAT work in this repo.
---

# Как писать лабы assessment

Проектный скилл (`skills/` в корне репо). Полные правила — [`LAB_FORMAT.md`](../../LAB_FORMAT.md).

Связанный скилл теории: [`write-assessment-topics`](../write-assessment-topics/SKILL.md).  
Визуализации графов/списков: [`assessment-lab-visualizations`](../assessment-lab-visualizations/SKILL.md).

## Когда лаба нужна

| Уровень (`groups.ts`) | Лаба |
|------------------------|------|
| **middle** / **senior** | **обязательна** |
| **junior** | только по явной просьбе |

## Источники

1. [`LAB_FORMAT.md`](../../LAB_FORMAT.md)
2. Эталон оболочки: `app/src/topics/js-*/*Lab.tsx` (пилоты `107+`)
3. Эталон вкладки «Код»: `app/src/topics/project-scripts-hmr-treeshake/ProjectScriptsHmrTreeshakeLab.tsx`

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
- 2–4 сниппета-файла по подтемам.

### Не писать в UI

В `intro` / `note` / `lead` / `pain` / `hint` **запрещены** мета-фразы:

- «Настоящие файлы проекта»
- «важное выделено комментариями `← …`»
- «артефакты с пометками»

`intro` — про **содержание темы**. Пометки `←` — только внутри кода.

## Вкладка «Решение проблемы»

- `pain`: зачем механизм в работе/учёбе (без лексики собеседований)
- 2–4 шага, `LabButton`, лог (`useLabLog` / `LabLogView`)
- Ссылки на «Код» уместны («см. store.js»), без рассказа про формат оформления

## Тон

Как в теории: учёба и практика. Запрет лексики найма/собеседований — см. `TOPIC_FORMAT.md`.

## Чеклист

- [ ] Уровень middle/senior → лаба есть и подключена
- [ ] Код = узнаваемые файлы + `←` в коде
- [ ] `executable: false` где нужно; нет плейсхолдера «эталон без запуска» в консоли
- [ ] intro/lead/pain без мета-инструкций агенту
- [ ] Следование `LAB_FORMAT.md`
