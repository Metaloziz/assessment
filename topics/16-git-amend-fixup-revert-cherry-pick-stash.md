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
