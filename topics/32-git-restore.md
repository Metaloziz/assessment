# 1. Тема

**git restore**

---

# 2. Главное в одну фразу

`git restore` (с Git 2.23) восстанавливает файлы в working tree или индексе — современная замена `checkout -- file` и части сценариев `reset` для файлов.

---

# 3. Ответ для собеседования

> «**`git restore`** — про файлы, не про историю веток.
> - `git restore file.js` — откатить working tree к HEAD (или другому `--source`);
> - `git restore --staged file.js` — убрать из индекса (unstage);
> - `git restore --source=<commit> file.js` — взять версию из коммита.
>
> Отличие от **`reset`**: restore трогает файлы/индекс локально; reset двигает HEAD/ветку и может переписать историю.
> Отличие от **`checkout -- file`**: тот же смысл, но яснее и безопаснее по API.»

---

# 4. Самое главное запомнить

- restore = файлы.
- `--staged` = unstage.
- `--source` = из любого коммита.
- reset = про коммиты/ветку; restore = про содержимое файлов.

| | restore | reset |
|--|---------|-------|
| Уровень | Файлы | Коммиты / ветка |
| История | Не двигает HEAD | Может двигать |
| Unstage | `--staged` | `reset HEAD file` |

---

# 5. Описание

```bash
git restore file.js
git restore --staged file.js
git restore --source=abc123 src/
git restore .
```

Своими словами из Notion: применение состояния из коммита/индекса; отличающееся остаётся под контролем индекса/working tree.

## Источник и назначение

Без флагов `restore` берёт содержимое из index и записывает его в working tree.
Поэтому команда откатывает незакоммиченные правки файла, но не убирает уже staged
изменение. `--staged` меняет именно index; его источником по умолчанию становится
`HEAD`. При необходимости можно явно выбрать ревизию:

```bash
git restore src/app.js                    # index → working tree
git restore --staged src/app.js           # HEAD → index (unstage)
git restore --source=HEAD~1 src/app.js    # старый commit → working tree
git restore --source=abc123 --staged src/ # commit → index
git restore --source=abc123 --staged --worktree src/
```

Последняя команда обновляет оба слоя. Состояние файла из другого коммита при этом
не создаёт новый commit: оно лишь становится локальным изменением, которое нужно
проверить и затем при необходимости добавить и закоммитить.

## Безопасность и частые сценарии

`git restore file.js` перезаписывает локальные незакоммиченные правки этого файла.
Перед восстановлением используйте `git diff`, а важную работу сохраните через
commit или stash. Для интерактивного выбора частей существует `git restore -p`;
это позволяет отменить отдельные hunks, а не весь файл.

```bash
git diff
git restore -p src/app.js
git restore --staged -p src/app.js
git restore .                 # осторожно: все tracked-файлы
```

Команда не удаляет untracked-файлы и не двигает HEAD, поэтому она существенно
уже `reset --hard`. Однако «уже» не значит «безопасно»: восстановленное
незакоммиченное содержимое без stash или commit обычно невозможно вернуть.

## Сравнение с reset и checkout

| Сценарий | Предпочтительная команда | Почему |
|---|---|---|
| Отменить правки файла | `git restore file` | работает с working tree |
| Убрать файл из staging | `git restore --staged file` | не двигает ветку |
| Взять версию из старого коммита | `git restore --source=<rev> file` | источник указан явно |
| Откатить целую локальную ветку | `git reset` | это операция над refs/index |

Старое `git checkout -- file` часто делает то же, но перегруженная команда также
умеет менять ветки и входить в detached HEAD. Разделение на `switch` для веток и
`restore` для файлов делает команды ревьюемыми и снижает риск неверно прочитать
намерение коллеги.

---

# 6. Ссылки

- [git-restore](https://git-scm.com/docs/git-restore)
- [Git Tools — Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified)
- [GitHub Blog — Switch and Restore](https://github.blog/2019-08-16-highlights-from-git-2-23/)
