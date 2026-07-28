# 1. Тема

**git grep**

---

# 2. Главное в одну фразу

`git grep` ищет текст/regex в файлах, отслеживаемых Git (с учётом `.gitignore`), и может искать в конкретной ревизии — удобнее «голого» grep по рабочей копии.

---

# 3. Ответ для собеседования

> «**`git grep`** — поиск по tracked-файлам репозитория.
> Плюсы vs обычный grep: игнорирует `.gitignore`, работает с индексацией Git, можно искать в ветке/коммите: `git grep "deprecated" develop`.
>
> Частые флаги: `-n` (номера строк), `-i` (без регистра), `-c` (счётчик), `-- '*.js'` (фильтр путей), `--cached` (только индекс).
> Для поиска **когда** строка появилась/пропала в истории — скорее `git log -S` / `-G`, не просто grep.»

---

# 4. Самое главное запомнить

- Ищет в tracked (и опционально в ревизии).
- Уважает `.gitignore`.
- `-n`, `-i`, pathspec `-- '*.js'`.
- История появления строки → `git log -S`.

```bash
git grep "функция"
git grep "import" -- '*.js'
git grep -n --color "TODO"
git grep -c "function"
git grep "deprecated" develop
```

---

# 5. Описание

Поиск в истории появления/удаления (связанный приём):

```bash
git log -p -S "удалённая функция"
```

---

# 6. Ссылки

- [git-grep](https://git-scm.com/docs/git-grep)
- [Git Tools — Searching](https://git-scm.com/book/en/v2/Git-Tools-Searching)
