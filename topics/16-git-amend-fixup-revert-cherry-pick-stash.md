# 1. Тема

**Git: amend, fixup, revert, cherry-pick, stash**

---

# 2. Главное в одну фразу

`amend` и `fixup` правят уже сделанные коммиты, `revert` безопасно отменяет опубликованное, `cherry-pick` переносит один коммит на другую ветку, `stash` временно прячет незакоммиченную работу.

---

# 3. Суть

> После коммита часто всплывает мелкая ошибка: забыли файл, опечатка в сообщении, правка к старому коммиту в серии. **`git commit --amend`** переписывает **последний** коммит — у него будет новый hash, даже если меняется только сообщение. Пока ветка локальная, это нормальный способ «подчистить» tip. После `push` в общую ветку amend создаёт расходящуюся историю: коллеги уже видели старый hash, и без договорённости и `push --force-with-lease` это ломает совместную работу.
>
> **`fixup`** решает другую задачу: поправить **не последний** коммит. Сначала создаётся отдельный коммит-правка с привязкой к целевому (`git commit --fixup abc1234`), затем при `git rebase -i --autosquash` Git сам ставит `fixup` рядом с нужным `pick` и схлопывает diff. Сообщение fixup-коммита отбрасывается — в отличие от `squash`, где Git предлагает объединить тексты. Вместе это способ собрать аккуратную серию коммитов **до** публикации.
>
> Когда коммит уже в `main` или release, переписывать историю опасно. **`git revert`** создаёт **новый** коммит с обратным diff — в логе остаётся и исходное изменение, и его отмена. Для merge-коммита нужен `-m 1`, чтобы указать, какую родительскую линию считать mainline. **`cherry-pick`** не отменяет, а **копирует** diff выбранного коммита на текущую ветку (типичный hotfix: fix проверен на `main`, переносим на `release/2.0`). Hash будет другой; длинные цепочки pick без нужды усложняют merge.
>
> **`git stash`** не трогает историю коммитов: он сохраняет незакоммиченный WIP в стек записей, чтобы можно было переключить ветку или подтянуть remote. По умолчанию untracked-файлы не попадают в stash — для них нужен `-u`. `pop` применяет и удаляет запись; при конфликте запись часто остаётся, и её нужно разобрать вручную.

---

# 4. Самое главное запомнить

- `amend` — только последний коммит; после push в shared-ветку — только по договорённости и с `--force-with-lease`.
- `fixup` + `rebase -i --autosquash` — правка старого коммита в локальной серии; сообщение fixup не сохраняется.
- `revert` — безопасный откат опубликованного: история растёт, исходный коммит виден.
- `cherry-pick` — копия одного коммита на текущую ветку; новый hash.
- `stash` — карман для WIP; untracked нужен флаг `-u`.
- `reset --hard` на shared `main` вместо `revert` — типичная ошибка.

| | Переписывает историю? |
|---|---|
| amend / fixup + rebase | Да |
| revert / cherry-pick | Добавляет новые коммиты |
| stash | Нет |

---

# 5. Описание

## Когда что выбирать

```text
локальный tip, забыли файл     →  git add … && git commit --amend
локальная серия, правка C2       →  git commit --fixup C2 → rebase -i --autosquash
отмена уже в main / release      →  git revert <hash>
hotfix с main на release         →  git cherry-pick <hash>
WIP перед switch / pull          →  git stash push → … → git stash pop
```

## `git commit --amend`

Команда заменяет последний коммит новым. Чтобы добавить забытый файл, сначала поместите его в индекс:

```bash
git add forgotten.js
git commit --amend --no-edit
git commit --amend -m "fix: correct login validation"
```

До публикации ветки это удобный способ «дописать» tip. После `push` rewrite создаёт расходящуюся историю с remote: использовать в общей ветке можно только по договорённости и обычно с `git push --force-with-lease`.

## `fixup` и autosquash

`fixup` — отдельный коммит-правка для уже существующего; склейка происходит при rebase:

```bash
git add .
git commit --fixup abc1234
git rebase -i --autosquash abc1234^
```

`--autosquash` сам поставит строку `fixup` после целевого `pick`. В отличие от `squash`, сообщение fixup-коммита отбрасывается — удобно для мелких правок перед review.

## `git revert`

`revert` вычисляет обратный diff и записывает его новым коммитом. История показывает и исходное изменение, и отмену:

```bash
git revert abc1234
git revert HEAD
git revert --no-commit abc1234
```

При конфликте исправьте файлы, добавьте в индекс и завершите операцию. Для merge-коммита укажите mainline: `git revert -m 1 <merge>`.

## `git cherry-pick`

Переносит diff выбранного коммита в текущую ветку с новым hash:

```bash
git switch release/2.0
git cherry-pick abc1234
git cherry-pick -n abc1234       # применить без коммита
git cherry-pick --continue       # после конфликта
git cherry-pick --abort
```

Типичный случай — перенести проверенный hotfix в поддерживаемую release-ветку. Длинные цепочки pick без причины усложняют merge и могут продублировать изменения.

## `git stash`

Stash сохраняет незакоммиченный WIP отдельно от истории коммитов. Untracked по умолчанию не входят:

```bash
git stash push -m "login experiment"
git stash push -u -m "include untracked"
git stash list
git stash show -p stash@{0}
git stash apply stash@{0}        # сохранить запись
git stash pop                    # применить и удалить
git stash drop stash@{0}
```

`pop` может завершиться конфликтом — тогда запись обычно остаётся в stash. Перед `checkout -f`, очисткой рабочей директории или сложным rebase проверьте `git status` и при необходимости сохраните работу коммитом или stash.

## Практический выбор

| Задача | Команда | Безопасность для shared history |
|---|---|---|
| Исправить локальный последний коммит | `commit --amend` | Только до публикации |
| Поправить старый локальный коммит | `fixup` + rebase | Только до публикации |
| Отменить опубликованное изменение | `revert` | Безопасно |
| Перенести отдельный hotfix | `cherry-pick` | Создаёт новый коммит |
| Временно отложить WIP | `stash` | Не меняет историю |

Частые ошибки: `amend` в уже используемой ветке, `reset --hard` вместо revert на `main`, забытые untracked при stash, cherry-pick длинных цепочек вместо merge.

---

# 6. Ссылки

- [git-commit --amend](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---amend)
- [git-rebase](https://git-scm.com/docs/git-rebase)
- [git-revert](https://git-scm.com/docs/git-revert)
- [git-cherry-pick](https://git-scm.com/docs/git-cherry-pick)
- [git-stash](https://git-scm.com/docs/git-stash)
