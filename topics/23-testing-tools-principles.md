# 1. Тема
**Принципы работы инструмента тестирования**
---
# 2. Главное в одну фразу
Тестовый инструмент находит тесты, запускает их в нужном окружении, изолирует зависимости, сверяет результат с assertions и формирует отчёт.
---
# 3. Ответ для собеседования
> «Под инструментом тестирования обычно понимаю связку runner, assertions, mocking и environment. Runner находит файлы, подготавливает код и запускает `test`/`it`; matcher из `expect` бросает ошибку при несовпадении; mock подменяет I/O; environment задаёт Node, jsdom или реальный браузер. Jest и Vitest подходят для unit/integration, Testing Library задаёт подход к UI через поведение пользователя, Playwright и Cypress — для e2e. Выбор зависит от уровня проверки, стека и необходимости настоящего браузера.»
---
# 4. Самое главное запомнить
- Цикл: discovery → isolation → execution → assertions → report.
- Упавший `expect` делает тест failed.
- `node`, `jsdom` и browser дают разный runtime.
- UI ищем по роли, label и тексту; `data-testid` добавляем в разметку, когда доступного селектора нет.
- Инструмент выбирают под риск и уровень проверки, не по популярности.
---
# 5. Описание
| Часть | Роль | Примеры |
|---|---|---|
| Runner | Находит и запускает тесты | Jest, Vitest, Mocha |
| Assertions | Сверяет ожидание с фактом | `expect`, matchers |
| Mocking | Подменяет зависимости | `jest.fn`, `vi.mock` |
| Environment | Определяет runtime | Node, jsdom, browser |
| UI utilities | Работают с DOM как пользователь | Testing Library |
| E2E runner | Управляет реальным браузером | Playwright, Cypress |

### Как проходит запуск
1. CLI читает конфигурацию и setup-файлы.
2. Runner трансформирует TS/JSX при необходимости и находит `*.test.*`/`*.spec.*`.
3. Выполняет хуки `beforeEach` → `test` → `afterEach` в изолированном контексте.
4. `expect` при несовпадении выбрасывает ошибку; runner сохраняет stack trace и продолжает отчёт.
5. При включённом coverage инструментирует код и показывает неисполненные ветки/строки.

```javascript
describe('calcDiscount', () => {
  test('применяет 10%', () => {
    // Arrange
    const price = 1000;
    // Act
    const result = calcDiscount(price, 10);
    // Assert
    expect(result).toBe(900);
  });
});
```

### Изоляция и окружение
| Environment | Когда нужен |
|---|---|
| Node | Чистая логика, серверный код, utils |
| jsdom / happy-dom | DOM-компоненты без настоящего браузера |
| Real browser | E2E, layout, browser APIs, реальная навигация |

Моки, фейковые таймеры и reset состояния не дают тестам влиять друг на друга. Параллельный запуск файлов возможен, только если тестовые данные и ресурсы независимы.

### UI и Testing Library
```javascript
render(<Login />);
await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
expect(await screen.findByText('Добро пожаловать')).toBeInTheDocument();
```

При вёрстке заранее добавляйте семантику — `label`, доступное имя, роль — и при необходимости стабильный `data-testid`. Не делайте CSS-классы главным контрактом теста: они описывают реализацию, а не UX.

### Выбор инструмента
| Задача | Подходящий выбор |
|---|---|
| Unit/integration в Vite/ESM | Vitest |
| Большая Jest-экосистема | Jest |
| React/Vue DOM-поведение | Testing Library + Jest/Vitest |
| E2E | Playwright или Cypress |

Антипаттерны: зависимость тестов от порядка, моки всего подряд, огромные snapshots вместо assertions, e2e для каждой мелкой функции и гонка за 100% coverage.
---
# 6. Ссылки
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library — guiding principles](https://testing-library.com/docs/guiding-principles)
- [Playwright](https://playwright.dev/docs/intro)
- [Martin Fowler — Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
