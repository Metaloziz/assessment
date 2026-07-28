# 1. Тема
**Coverage — покрытие кода**
---
# 2. Главное в одну фразу
Coverage показывает, какую часть исполняемого кода затронули тесты, но не доказывает, что тесты проверяют правильное поведение.
---
# 3. Ответ для собеседования
> «Coverage помогает увидеть слепые зоны: неисполненные строки, функции и особенно ветки ошибок. В Jest запускаю `jest --coverage`, смотрю HTML-отчёт и не покрытые строки. При этом 100% coverage не является целью: можно выполнить код без meaningful assertion. Я задаю реалистичные thresholds, отдельно слежу за branch coverage критичной логики и добавляю тесты на рисковые сценарии, а не ради цифры.»
---
# 4. Самое главное запомнить
- Statement — исполнены ли операторы.
- Branch — пройдены ли оба исхода условий.
- Function — вызывалась ли функция.
- Высокое покрытие ≠ качественные тесты.
---
# 5. Описание
| Метрика | Что считает | Что может упустить |
|---|---|---|
| Statements | Исполненные операторы | Ложную проверку результата |
| Branches | Исходы `if`, `switch`, `?:` | Пограничные значения внутри ветки |
| Functions | Вызванные функции | Качество assertions |
| Lines | Исполненные строки | Логику без обеих веток |

```json
{
  "scripts": { "test:coverage": "jest --coverage" },
  "jest": {
    "coverageThreshold": {
      "global": { "branches": 70, "functions": 80, "lines": 80 }
    }
  }
}
```

```javascript
function shipping(total) {
  return total >= 1000 ? 0 : 200;
}

test.each([[999, 200], [1000, 0]])(
  'доставка для %i равна %i',
  (total, expected) => expect(shipping(total)).toBe(expected)
);
```

Здесь один тест дал бы 100% statements, но только пара значений покрывает обе ветки. Исключайте из отчёта generated-код и типы; не скрывайте важную бизнес-логику в исключениях. В CI полезнее контролировать падение покрытия на изменённых файлах, чем требовать произвольные 100% глобально.
---
# 6. Ссылки
- [Atlassian — Code Coverage](https://www.atlassian.com/continuous-delivery/software-testing/code-coverage)
- [Martin Fowler — Test Coverage](https://martinfowler.com/bliki/TestCoverage.html)
- [Jest — CLI coverage](https://jestjs.io/docs/cli#--coverageboolean)
