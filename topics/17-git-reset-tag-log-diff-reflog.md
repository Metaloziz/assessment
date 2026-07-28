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

## `git log`: история в нужном разрезе

`log` показывает коммиты, а формат и фильтры превращают его в инструмент
диагностики. Для ежедневной навигации обычно достаточно:

```bash
git log --oneline --graph --decorate --all
git log -p -n 5
git log --author="Anna" --since="2 weeks ago"
git log -- path/to/file
git log main..feature/login
```

Последняя форма показывает коммиты, которые есть в `feature/login`, но отсутствуют
в `main`. `--decorate` выводит имена веток и тегов, а `--graph` помогает увидеть
merge и расходящиеся линии истории.

## `git diff`: что именно сравнивается

Git хранит три состояния: `HEAD` (последний коммит), index (staging area) и
working tree. Поэтому команда без аргументов показывает только неиндексированные
правки:

```bash
git diff                    # working tree ↔ index
git diff --staged           # index ↔ HEAD
git diff HEAD               # все локальные изменения ↔ HEAD
git diff main...HEAD        # изменения ветки с merge-base
git diff abc1234 def5678 -- src/app.js
```

Перед коммитом полезно выполнять и `git diff`, и `git diff --staged`: иначе легко
посмотреть не то состояние и закоммитить неполный набор файлов.

## `git tag`: неизменяемая метка версии

Тег указывает на конкретный коммит и не движется вместе с веткой. Lightweight tag —
простой указатель; annotated tag содержит автора, дату и сообщение, поэтому для
релизов обычно выбирают его:

```bash
git tag -a v2.1.0 -m "Release 2.1.0"
git tag -a v2.1.0 abc1234 -m "Release 2.1.0"
git show v2.1.0
git push origin v2.1.0
git push origin --tags
```

Создание тега не публикует его автоматически. Удаление локального тега также не
удаляет remote-тег: для этого нужна отдельная операция push с удалением ref.

## `git reset`: три уровня сброса

`reset` перемещает текущую ветку и, в зависимости от режима, синхронизирует index
и рабочие файлы. До выполнения проверьте `status` и `diff`.

| Режим | HEAD/ветка | Index | Working tree | Обычный случай |
|---|---|---|---|---|
| `--soft` | перемещает | сохраняет | сохраняет | пересобрать коммит |
| `--mixed` | перемещает | сбрасывает | сохраняет | убрать commit, править дальше |
| `--hard` | перемещает | сбрасывает | сбрасывает | выбросить локальную работу |

```bash
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset HEAD file.js       # убрать файл из index
git reset --hard abc1234
```

`--hard` способен уничтожить незакоммиченные изменения. На опубликованной ветке
`reset` меняет общую историю, поэтому для отмены уже доставленного кода обычно
правильнее `git revert`.

## `git reflog`: восстановление после ошибки

Reflog — локальный журнал перемещений ссылок: commit, checkout, rebase, reset и
amend. Даже если ветка больше не указывает на коммит, его часто можно найти:

```bash
git reflog
git reflog show main
git reset --hard HEAD@{1}
git switch -c recovery abc1234
```

Это не remote-история: записи не отправляются на сервер и очищаются сборщиком
мусора со временем. Поэтому reflog — отличная страховка от локального ошибочного
reset, но не замена резервному копированию или нормальной публикации работы.

---

# 6. Ссылки

- [git-log](https://git-scm.com/docs/git-log)
- [git-diff](https://git-scm.com/docs/git-diff)
- [git-tag](https://git-scm.com/docs/git-tag)
- [git-reset](https://git-scm.com/docs/git-reset)
- [git-reflog](https://git-scm.com/docs/git-reflog)
