# 1. Тема

**Подходы к организации веток: Git Flow, GitHub Flow, GitLab Flow**

---

# 2. Главное в одну фразу

Git Flow — сложный релизный процесс с несколькими долгоживущими ветками; GitHub Flow — «ветка → PR → main → деплой»; GitLab Flow — баланс через environment/release-ветки и CD.

---

# 3. Ответ для собеседования

> «**Git Flow**: `main` + `develop` + feature/release/hotfix — для версионных редких релизов.
> **GitHub Flow**: одна `main`, короткие PR-ветки, частый деплой — для SaaS/CD.
> **GitLab Flow**: простота GitHub Flow + промоут по окружениям (`main` → pre-prod → production) или release-ветки.
>
> Чем чаще деплой — тем проще модель. Часто гибрид: trunk-based + release-ветки при freeze.»

---

# 4. Самое главное запомнить

- Git Flow = main + develop + feature/release/hotfix.
- GitHub Flow = main + short-lived PRs.
- GitLab Flow = main + env/release promotion.
- Выбор от частоты релизов и числа версий в проде.

---

# 5. Описание

| | Git Flow | GitHub Flow | GitLab Flow |
|---|----------|-------------|-------------|
| Сложность | Высокая | Низкая | Средняя |
| Релизы | Редкие/версионные | Очень частые | По окружениям |
| CD | Слабо | Отлично | Хорошо |

---

# 6. Ссылки

- [Git Flow (nvie)](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
