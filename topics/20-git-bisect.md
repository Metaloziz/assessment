# 1. Тема

**git bisect**

---

# 2. Главное в одну фразу

`git bisect` — бинарный поиск по истории коммитов, чтобы найти коммит, в котором появился баг.

---

# 3. Ответ для собеседования

> «Помечаем текущий как `bad`, старый рабочий как `good`. Git checkout’ит середину; говорим good/bad; сужаем диапазон за ~log₂(N) шагов.
>
> Автоматизация: `git bisect run ./test.sh` (exit 0 = good, 1 = bad, 125 = skip).
> В конце — `git bisect reset`. Нужен воспроизводимый способ проверить баг.»

---

# 4. Самое главное запомнить

- Бинарный поиск первого bad-коммита.
- Нужны границы good/bad.
- ≈ log₂(N) проверок.
- `bisect run` для автопоиска.
- Всегда `bisect reset`.

---

# 5. Описание

```bash
git bisect start
git bisect bad
git bisect good v1.2.0
# проверяем...
git bisect good   # или bad / skip
git bisect run npm test
git bisect reset
```

Бесполезен, если баг от данных/окружения, а не от коммита.

---

# 6. Ссылки

- [git-bisect](https://git-scm.com/docs/git-bisect)
- [Git Book — Debugging](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git)
