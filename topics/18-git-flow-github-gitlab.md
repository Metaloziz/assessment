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

## Git Flow

В классическом Git Flow есть две долгоживущие ветки: `main` хранит код,
поставленный в production, а `develop` — следующую интеграционную версию.
Работа ведётся в `feature/*`; к релизу создают `release/*`, а срочные исправления
в production — в `hotfix/*`.

```text
feature/* ──► develop ──► release/2.1 ──► main (tag v2.1.0)
                   ▲              │
hotfix/* ──────────┴──────────────┘
```

Модель полезна, когда одновременно поддерживаются версии продукта, есть release
freeze и долгий цикл поставки. Цена — много merge, необходимость поддерживать
`develop` и риск расхождения долгоживущих веток. Для сервисов с непрерывной
доставкой такая сложность часто неоправданна.

## GitHub Flow

У GitHub Flow один источник правды — `main`, который должен быть готов к деплою.
Каждая задача получает короткоживущую ветку от `main`; затем открывается PR,
проходят review и CI, изменение мержится и деплоится.

```text
main ◄── Pull Request ◄── feature/login
main ◄── Pull Request ◄── fix/payment-timeout
```

Правила просты: часто подтягивать `main`, называть ветки и PR понятно, не держать
незавершённую работу неделями, а рискованные функции закрывать feature flags.
Подход хорошо работает для SaaS и одной активной production-версии. Hotfix здесь
обычно просто приоритетный короткий PR в `main`.

## GitLab Flow

GitLab Flow сохраняет `main` основной веткой, но вводит явный промоут к
окружениям или release-веткам:

```text
feature/* → main → pre-production → production
```

Либо от `main` создают `release/2.1` и принимают в неё только необходимые патчи.
Это удобно, когда staging/pre-prod и production требуют контролируемого перехода,
но без тяжёлой схемы Git Flow. Важно явно определить направление merge и
back-merge: иначе environment-ветки начинают расходиться.

## Как выбрать

| Условие | Практичный выбор |
|---|---|
| Daily deploy, одна версия в production | GitHub Flow / trunk-based |
| Versioned desktop/mobile продукт, релизные freeze | Git Flow или release-ветки |
| Несколько окружений с ручным промоутом | GitLab Flow |
| Маленькая команда без особых требований | GitHub Flow по умолчанию |

На практике модели часто комбинируют: короткие PR-ветки как базу, release-ветку
только во время freeze, а окружения выражают CI pipeline, а не постоянными Git
ветками. Выбор должен следовать частоте деплоя, стратегии поддержки версий и
дисциплине CI, а не названию платформы.

---

# 6. Ссылки

- [Git Flow (nvie)](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)
- [Trunk Based Development](https://trunkbaseddevelopment.com/)
