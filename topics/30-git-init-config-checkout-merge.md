# 1. Тема

**Команды: init, config, checkout, merge**

---

# 2. Главное в одну фразу

`init` создаёт репозиторий, `config` настраивает Git, `checkout` переключает ветки/восстанавливает файлы, `merge` вливает одну ветку в другую.

---

# 3. Ответ для собеседования

> «**`git init`** — новый репозиторий в текущей папке.
> **`git config`** — имя, email, aliases (`--global` / локально).
> **`git checkout`** — классика: переключение веток, создание `-b`, восстановление файлов. С 2.23 для веток предпочтительнее `switch`, для файлов — `restore`.
> **`git merge`** — влить `feature` в текущую ветку; при конфликтах правим файлы и коммитим merge.
>
> Сценарий: `init` → `config` → `checkout -b feature` → работа → `checkout main` → `merge feature`.»

---

# 4. Самое главное запомнить

- init = новый repo.
- config = user.name / user.email.
- checkout — ветки и файлы (исторически).
- merge — слияние веток.

### Примеры

```bash
git init
git config --global user.name "Ваше имя"
git config --global user.email "ваш@email.com"
git checkout develop
git checkout HEAD -- file.js
git checkout main
git merge feature-branch
```

---

# 5. Описание

```bash
git init
git config user.name "John"
git checkout -b new-feature
```

---

# 6. Ссылки

- [Git Documentation — Reference](https://git-scm.com/docs)
- [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials)
