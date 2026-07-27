# 1. Тема

**Git hooks**

---

# 2. Главное в одну фразу

Git hooks — скрипты, которые Git запускает до/после действий (commit, push, merge…), чтобы проверять код, формат сообщений или блокировать опасные операции.

---

# 3. Ответ для собеседования

> «Клиентские: `pre-commit`, `commit-msg`, `pre-push`. Серверные: `pre-receive`, `update`, `post-receive`.
>
> Ненулевой exit code блокирует операцию. `.git/hooks` не в репозитории → шарят через Husky/lefthook/pre-commit.
> `--no-verify` обходит локальные hooks, не серверные/CI.
> Критичные правила дублируют в CI.»

---

# 4. Самое главное запомнить

- Hook = скрипт на событие Git.
- Exit ≠ 0 → блок.
- Шаринг: Husky / lefthook / pre-commit.
- `--no-verify` только локально.
- Важное — ещё и в CI.

---

# 5. Описание

Типичный frontend-набор:
- pre-commit → eslint/prettier (lint-staged)
- commit-msg → commitlint
- pre-push → tests/typecheck
- CI → полный pipeline

---

# 6. Ссылки

- [Git Hooks (Book)](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [githooks](https://git-scm.com/docs/githooks)
- [Husky](https://typicode.github.io/husky/)
- [lefthook](https://github.com/evilmartians/lefthook)
- [pre-commit](https://pre-commit.com/)
