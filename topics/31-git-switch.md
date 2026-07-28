# 1. Тема

**git switch**

---

# 2. Главное в одну фразу

`git switch` (с Git 2.23) — безопасная команда только для переключения/создания веток; файлы и detached HEAD остаются зоне `checkout`/`restore`.

---

# 3. Ответ для собеседования

> «**`git switch`** заменяет часть `checkout`, которая про ветки:
> - `git switch develop` — на существующую;
> - `git switch -c new-feature` — создать и перейти;
> - `git switch -` — назад на предыдущую.
>
> **`checkout`** умел слишком многое (ветки + файлы + коммиты) и был опасен. Теперь: ветки → `switch`, файлы → `restore`.
> При незакоммиченных конфликтующих изменениях `switch` откажется переключиться — нужен stash/commit.»

---

# 4. Самое главное запомнить

- switch = только ветки.
- `-c` = создать ветку.
- checkout для файлов/коммитов устаревает в пользу restore/switch.
- Не перезаписывает файлы «случайно», как часть старых сценариев checkout.

| | switch | checkout |
|--|--------|----------|
| Цель | Ветки | Универсально |
| Файлы | Нет | Да (`-- file`) |
| Коммит (detached) | Нет / ограничено | Да |

---

# 5. Описание

```bash
git switch main
git switch -c feature/login
git switch develop
```

Восстановление файла — не через switch:

```bash
git checkout HEAD -- file.js   # или git restore file.js
```

## Полезные варианты

```bash
git switch main                         # существующая локальная ветка
git switch -c feature/login             # создать от текущего HEAD
git switch -c feature/login origin/main # создать от указанной точки
git switch -                             # предыдущая ветка
git switch --track origin/feature/api   # локальная tracking-ветка
git switch -d abc1234                   # detached HEAD для исследования
```

Короткий `-c` соответствует старому `checkout -b`. Если локальной ветки ещё нет,
но есть единственная подходящая remote-ветка, Git часто предложит создать
tracking-ветку; явный `--track` делает это намерение понятным. Detached HEAD нужен
для просмотра старой ревизии, но новый commit в этом состоянии легко потерять,
если не создать ветку: `git switch -c investigation`.

## Незакоммиченные изменения

Перед переключением Git проверяет, не будут ли локальные правки перезаписаны
содержимым целевой ветки. При конфликте операция останавливается. Нормальный
порядок действий — сохранить работу коммитом или stash, а не использовать
принудительное переключение:

```bash
git status
git stash push -m "WIP login form"
git switch hotfix/payment
git switch feature/login
git stash pop
```

`git switch --discard-changes <branch>` отбрасывает изменения в tracked-файлах и
должен использоваться только после осознанной проверки `diff`. Untracked-файлы
тоже могут помешать, если целевая ветка создаёт путь с тем же именем.

## Граница ответственности команд

`switch` намеренно работает с ветками и ревизиями, а не с отдельными файлами.
Современное разделение команд делает намерение читаемым:

| Задача | Современная команда | Старый универсальный вариант |
|---|---|---|
| Перейти на ветку | `git switch branch` | `git checkout branch` |
| Создать ветку и перейти | `git switch -c name` | `git checkout -b name` |
| Откатить файл | `git restore file` | `git checkout -- file` |
| Убрать файл из index | `git restore --staged file` | `git reset HEAD file` |

`checkout` остаётся рабочей и поддерживаемой командой, а не «запрещённой».
Преимущество `switch` — меньше неоднозначности в повседневной работе и более
понятный интерфейс для новичков.

---

# 6. Ссылки

- [git-switch](https://git-scm.com/docs/git-switch)
- [GitHub Blog — New Git Commands](https://github.blog/2019-08-16-highlights-from-git-2-23/)
