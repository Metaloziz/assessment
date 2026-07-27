# 1. Тема

**Git: reset, tag, log, diff, reflog**

---

# 2. Главное в одну фразу

`log`/`diff` показывают историю и изменения, `tag` помечает релизы, `reset` двигает ветку (и опционально index/файлы), `reflog` — локальный журнал HEAD для восстановления после ошибок.

---

# 3. Ответ для собеседования

> «**`log`** — история; **`diff`** — изменения (unstaged/staged/между ревизиями).
> **`tag`** — метка коммита; annotated — для релизов.
> **`reset`**: `--soft` (только ветка), `--mixed` (ветка+index), `--hard` (всё, опасно).
> **`reflog`** — найти старый HEAD после ошибочного hard reset.
>
> На shared main после push лучше `revert`, не `reset`.»

---

# 4. Самое главное запомнить

- log = история; diff = изменения.
- tag = снимок коммита (annotated для релизов).
- soft / mixed / hard — разная глубина.
- hard может уничтожить WIP.
- reflog спасает локально.

---

# 5. Описание

```bash
git log --oneline --graph --decorate
git diff
git diff --staged
git tag -a v1.0.0 -m "Release 1.0.0"
git reset --soft HEAD~1
git reset --hard HEAD~1
git reflog
git reset --hard HEAD@{1}
```

---

# 6. Ссылки

- [git-log](https://git-scm.com/docs/git-log)
- [git-diff](https://git-scm.com/docs/git-diff)
- [git-tag](https://git-scm.com/docs/git-tag)
- [git-reset](https://git-scm.com/docs/git-reset)
- [git-reflog](https://git-scm.com/docs/git-reflog)
