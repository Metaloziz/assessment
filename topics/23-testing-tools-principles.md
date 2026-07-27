# 1. Тема

**Принципы работы подходящего инструмента тестирования**

---

# 2. Главное в одну фразу

Инструмент тестирования находит тесты, выполняет их в изолированном окружении (часто с моками и jsdom), сравнивает результат через assertions и отдаёт отчёт.

---

# 3. Ответ для собеседования

> «Связка: **runner + assertions + mocking + environment**.
>
> Цикл: discovery → isolation → execution → expect → report (+ coverage).
> Jest/Vitest — unit/integration; Testing Library — UI как пользователь (`getByRole`); Playwright — e2e в реальном браузере.
>
> Assertion падает exception’ом; mock убирает I/O; environment (`node`/`jsdom`/browser) задаёт runtime.
> Выбор по задаче: скорость feedback, стек (Vite/ESM), нужен ли настоящий браузер.»

---

# 4. Самое главное запомнить

- Найти → запустить → сравнить → отчитаться.
- expect fail = throw.
- Mock изолирует.
- Environment задаёт runtime.
- UI: поведение, не private state.

---

# 5. Описание

| Часть | Примеры |
|-------|---------|
| Runner | Jest, Vitest, Mocha |
| Assertions | expect / matchers |
| Mocks | `jest.fn`, `vi.mock` |
| Environment | node, jsdom, browser |
| DOM utils | Testing Library |
| E2E | Playwright, Cypress |

```javascript
test('applies 10%', () => {
  expect(calcDiscount(1000, 10)).toBe(900);
});
```

---

# 6. Ссылки

- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [Playwright](https://playwright.dev/docs/intro)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
