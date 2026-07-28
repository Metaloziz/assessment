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

## Где и когда запускаются hooks

Обычные клиентские hooks лежат в `.git/hooks/`. Git устанавливает там примеры с
суффиксом `.sample`; чтобы включить скрипт, его делают исполняемым:

```bash
chmod +x .git/hooks/pre-commit
```

Наиболее полезные события: `pre-commit` запускается перед созданием коммита,
`prepare-commit-msg` может дополнить шаблон сообщения, `commit-msg` проверяет
готовый message, `pre-push` выполняется перед отправкой refs. `post-checkout` и
`post-merge` не предназначены для блокировки, но могут обновлять зависимости или
локальные вспомогательные данные.

```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run lint
npm run test -- --changedSince=HEAD
```

Ненулевой exit code прекращает операцию. Пример проверки Conventional Commits:

```bash
#!/bin/sh
msg=$(cat "$1")
echo "$msg" | grep -qE '^(feat|fix|docs|chore)(\(.+\))?: .+' || {
  echo "Use Conventional Commits: feat: ..."
  exit 1
}
```

## Client hooks, server hooks и CI

Серверные hooks (`pre-receive`, `update`, `post-receive`) выполняются в bare
репозитории и могут запретить push или инициировать deploy. На GitHub/GitLab им
обычно соответствуют protected branches, правила merge request и обязательные
checks. Их нельзя обойти `git commit --no-verify` или `git push --no-verify`.

Локальные hooks полезны для быстрого feedback, но не являются гарантией: разработчик
может не установить их или обойти в экстренном случае. Поэтому security scan, полный
test/build и защита `main` обязаны оставаться в CI/server-side policy.

## Как хранить правила в команде

Сам `.git/hooks` не коммитится, так как относится к локальной метаинформации.
Инструменты Husky, lefthook и Python `pre-commit` хранят конфигурацию в проекте и
устанавливают реальный hook на `install`:

```yaml
# lefthook.yml
pre-commit:
  commands:
    lint:
      run: npm run lint
```

Для frontend-проекта обычно запускают eslint/prettier только на staged-файлах
через `lint-staged`, формат сообщения через commitlint, а перед push — быстрый
typecheck или unit tests. Тяжёлые интеграционные тесты лучше оставить CI, иначе
локальный цикл становится слишком медленным.

---

# 6. Ссылки

- [Git Hooks (Book)](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [githooks](https://git-scm.com/docs/githooks)
- [Husky](https://typicode.github.io/husky/)
- [lefthook](https://github.com/evilmartians/lefthook)
- [pre-commit](https://pre-commit.com/)
