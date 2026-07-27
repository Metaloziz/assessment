# 1. Тема

**git worktree**

---

# 2. Главное в одну фразу

`git worktree` даёт несколько рабочих директорий у одного репозитория — параллельная работа с разными ветками без постоянного `stash` и `checkout`.

---

# 3. Ответ для собеседования

> «Один `.git` / объектная база, несколько папок с разными HEAD.
> Пример: в одной папке `feature`, рядом worktree на `hotfix` — без потери WIP.
> Команды: `add`, `list`, `remove` / `prune`.
> Одна ветка не может быть checkout’нута в двух worktree сразу.
> Легче второго clone: общая история и remotes.»

---

# 4. Самое главное запомнить

- Несколько папок → один репозиторий.
- Общие объекты; раздельный working tree.
- Одна ветка = один worktree.
- Удобно для hotfix параллельно с feature.
- Удалять через `worktree remove`.

---

# 5. Описание

```bash
git worktree add ../project-hotfix -b hotfix/api main
git worktree list
git worktree remove ../project-hotfix
git worktree prune
```

vs stash/checkout — теряется контекст; vs второй clone — дубль диска и fetch.

---

# 6. Ссылки

- [git-worktree](https://git-scm.com/docs/git-worktree)
- [Atlassian — git worktree](https://www.atlassian.com/git/tutorials/git-worktree)
