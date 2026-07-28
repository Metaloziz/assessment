# 1. Тема

**Базовые команды: pull, push, commit, fetch**

---

# 2. Главное в одну фразу

`commit` фиксирует снимок локально, `fetch` забирает remote без merge, `pull` = fetch + merge/rebase, `push` отправляет локальные коммиты на remote.

---

# 3. Ответ для собеседования

> «Базовый цикл:
> - **`git commit`** — новая версия в локальной истории;
> - **`git fetch`** — скачать remote-ветки, **не** сливая с текущей;
> - **`git pull`** — fetch + merge (или rebase, если так настроено);
> - **`git push`** — отправить локальные коммиты на origin.
>
> Типичный поток: `add` → `commit` → `push`. Перед пушем часто `fetch`/`pull`, чтобы не разъехаться с remote.»

---

# 4. Самое главное запомнить

- commit — локально.
- fetch — узнать remote, без слияния.
- pull ≈ fetch + merge.
- push — отдать свои коммиты.

### Типовой процесс

```bash
git add .
git commit -m "feature add"
git push origin develop
```

---

# 5. Описание

| Команда | Что делает |
|---------|------------|
| `commit` | Фиксирует staged изменения |
| `fetch` | Обновляет remote-tracking ветки |
| `pull` | Fetch + слияние с текущей веткой |
| `push` | Отправляет коммиты на remote |

```bash
git push origin main
git commit -m "Описание изменений"
```

---

# 6. Ссылки

- [Git Documentation — Basic Commands](https://git-scm.com/docs)
- [GitHub Git Handbook](https://guides.github.com/introduction/git-handbook/)
