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

## Основной сценарий

Worktree создаёт дополнительную папку, связанную с тем же репозиторием. У папок
отдельные working tree и HEAD, но общая объектная база, refs и remotes. Поэтому
можно спокойно оставить незавершённую feature в основном каталоге и открыть
hotfix рядом:

```bash
git worktree add ../project-hotfix main
git worktree add ../project-feature -b feature/payments
git worktree list
```

```text
~/code/shop/          ← feature/cart
~/code/shop-hotfix/   ← main или hotfix/api-500
~/code/shop-review/   ← review/pr-42
```

Fetch в одной папке обновляет remote-tracking refs для всех worktree. Commit и
`git status`, напротив, действуют на рабочую папку, в которой выполнена команда.

## Правила и обслуживание

Одну ветку нельзя checkout'нуть одновременно в двух worktree. Если `main` уже
занят, создайте отдельную ветку от него:

```bash
git worktree add ../other -b hotfix/from-main main
# fatal: 'main' is already checked out
```

Удаляйте завершённую рабочую копию через Git, чтобы он очистил метаданные:

```bash
git worktree remove ../project-hotfix
git worktree prune          # если папку удалили вручную
git worktree move ../old ../new
git worktree lock ../project-hotfix
```

`lock` полезен, когда worktree находится на временном или съёмном пути и Git не
должен автоматически считать его устаревшим.

## Worktree или второй clone

| Подход | Плюс | Минус |
|---|---|---|
| stash + checkout | ничего дополнительно не нужно | теряется контекст, конфликты stash |
| второй clone | полная изоляция репозиториев | дубль объектов, отдельная синхронизация |
| `git worktree` | быстрый старт, общие refs и история | ветка занята только в одном tree |

Это особенно удобно для code review, параллельных PR, долгих сборок и срочных
исправлений production. IDE можно открыть отдельными окнами на каждую папку:
они будут видеть разный набор файлов, но одинаковую историю репозитория.

---

# 6. Ссылки

- [git-worktree](https://git-scm.com/docs/git-worktree)
- [Atlassian — git worktree](https://www.atlassian.com/git/tutorials/git-worktree)
