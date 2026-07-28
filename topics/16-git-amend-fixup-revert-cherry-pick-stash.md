# 1. Тема

**Git: amend, fixup, revert, cherry-pick, stash**

---

# 2. Главное в одну фразу

`amend`/`fixup` правят коммиты, `revert` безопасно откатывает опубликованное, `cherry-pick` переносит коммит, `stash` прячет незакоммиченное.

---

# 3. Ответ для собеседования

> «**`--amend`** — правит последний коммит (только до push или с осознанным force).
> **`fixup`** — коммит-правка для склейки через `rebase -i --autosquash`.
> **`revert`** — новый отменяющий коммит; безопасно для main.
> **`cherry-pick`** — копия коммита на текущую ветку (hotfix между ветками).
> **`stash`** — карман для WIP перед checkout/pull.
>
> amend/fixup+rebase переписывают историю; revert добавляет; cherry-pick копирует; stash не про историю.»

---

# 4. Самое главное запомнить

- amend — только последний, осторожно после push.
- fixup + autosquash — правка не последнего коммита.
- revert — безопасный откат shared-веток.
- cherry-pick — перенос коммита.
- stash — незакоммиченное.

---

# 5. Описание

```bash
git commit --amend --no-edit
git commit --fixup abc1234
git rebase -i --autosquash abc1234^
git revert abc1234
git cherry-pick abc1234
git stash push -m "wip" && git stash pop
```

## `git commit --amend`

Команда заменяет последний коммит новым: у него будет другой hash, даже если меняется
только сообщение. Чтобы добавить забытый файл, сначала поместите его в индекс, затем:

```bash
git add forgotten.js
git commit --amend --no-edit
git commit --amend -m "fix: correct login validation"
```

Это удобно до публикации ветки. После `push` rewrite создаёт расходящуюся историю:
использовать его в общей ветке можно только по договорённости и обычно с
`git push --force-with-lease`, а не с безусловным `--force`.

## `fixup` и autosquash

`fixup` — отдельный коммит с исправлением для уже существующего коммита. Он не
переписывает историю сразу; склейка происходит при интерактивном rebase.

```bash
git add .
git commit --fixup abc1234
git rebase -i --autosquash abc1234^
```

`--autosquash` сам поставит строку `fixup` после целевого `pick`. В отличие от
`squash`, сообщение fixup-коммита отбрасывается; `squash` предлагает объединить
сообщения. Это хороший способ подготовить чистую серию коммитов перед review.

## `git revert`

`revert` вычисляет обратный diff и записывает его новым коммитом. Поэтому история
показывает и исходное изменение, и его отмену — это безопасный путь для `main` и
release-веток.

```bash
git revert abc1234
git revert HEAD
git revert --no-commit abc1234
```

При конфликте исправьте файлы, добавьте их в индекс и завершите операцию. Если
отменяется merge-коммит, нужно явно выбрать mainline через `git revert -m 1 <merge>`.

## `git cherry-pick`

Команда переносит diff выбранного коммита в текущую ветку и создаёт новый hash:

```bash
git switch release/2.0
git cherry-pick abc1234
git cherry-pick -n abc1234       # применить без коммита
git cherry-pick --continue       # после конфликта
git cherry-pick --abort
```

Типичный случай — перенести проверенный hotfix в поддерживаемую release-ветку.
Не стоит переносить длинные цепочки без причины: позднее это усложняет merge и
может привести к дублированию изменений.

## `git stash`

Stash сохраняет незакоммиченный WIP отдельно от истории коммитов. По умолчанию
untracked-файлы не входят в него; добавьте `-u`, если они тоже нужны.

```bash
git stash push -m "login experiment"
git stash push -u -m "include untracked"
git stash list
git stash show -p stash@{0}
git stash apply stash@{0}        # сохранить запись
git stash pop                    # применить и удалить запись
git stash drop stash@{0}
```

`pop` может завершиться конфликтом и тогда запись обычно остаётся в stash. Перед
`checkout -f`, очисткой рабочей директории или сложным rebase лучше проверить
`git status` и при необходимости сохранить работу коммитом либо stash.

## Практический выбор

| Задача | Команда | Безопасность для shared history |
|---|---|---|
| Исправить локальный последний коммит | `commit --amend` | Только до публикации |
| Поправить старый локальный коммит | `fixup` + rebase | Только до публикации |
| Отменить опубликованное изменение | `revert` | Безопасно |
| Перенести отдельный hotfix | `cherry-pick` | Создаёт новый коммит |
| Временно отложить WIP | `stash` | Не меняет историю |

Частые ошибки: делать `amend` в уже используемой ветке, применять `reset --hard`
вместо revert на `main`, забывать untracked-файлы при stash и воспринимать
cherry-pick как замену нормальному merge.

| | Переписывает историю? |
|---|---|
| amend / fixup+rebase | Да |
| revert / cherry-pick | Добавляет новые коммиты |
| stash | Нет |

---

# 6. Ссылки

- [git-commit --amend](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---amend)
- [git-rebase](https://git-scm.com/docs/git-rebase)
- [git-revert](https://git-scm.com/docs/git-revert)
- [git-cherry-pick](https://git-scm.com/docs/git-cherry-pick)
- [git-stash](https://git-scm.com/docs/git-stash)
