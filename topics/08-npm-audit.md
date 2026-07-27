# 1. Тема

**npm audit**

---

# 2. Главное в одну фразу

`npm audit` проверяет зависимости на известные уязвимости по базе npm Security Advisory и показывает, что можно обновить или исправить.

---

# 3. Ответ для собеседования

> «`npm audit` сравнивает дерево зависимостей с advisory DB: уровни low/moderate/high/critical, путь через direct/transitive, рекомендации.
>
> `npm audit fix` — в рамках semver; `--force` может поднять major и сломать проект.
>
> Ограничения: только известные CVE, не анализ вашего кода. В CI часто `--audit-level=high`. Для транзитивных — `overrides`. Дополняют Dependabot/Snyk.»

---

# 4. Самое главное запомнить

- Проверка зависимостей на известные CVE.
- `fix` безопаснее, чем `fix --force`.
- Не каждая уязвимость в devDeps критична для prod.
- Transitive → `overrides` / ждать upstream.
- CI: `--audit-level=high`.

---

# 5. Описание

```bash
npm audit
npm audit fix
npm audit fix --force
npm audit --production
npm audit --audit-level=high
```

Workflow: отчёт → разделить prod/dev → fix → overrides при необходимости → CI gate.

---

# 6. Ссылки

- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [npm overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- [GitHub Advisory Database](https://github.com/advisories)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
