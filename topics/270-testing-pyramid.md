# 1. Тема
**Пирамида тестирования, какие инструменты подходят для каждого уровня**
---
# 2. Главное в одну фразу
Пирамида тестирования — модель покрытия: много быстрых unit, меньше integration и немного критичных e2e; инструмент выбирают под уровень проверки, а не наоборот.
---
# 3. Ответ для собеседования
> «Пирамида описывает баланс тестов по стоимости и скорости feedback. В основании — unit: много мелких проверок чистой логики и модулей в изоляции, обычно Jest или Vitest. Середина — integration: связки модулей, API, БД, React-компоненты с реальным DOM через Testing Library; моки только у внешних границ. Наверху — e2e: мало сценариев критичных пользовательских путей в реальном браузере — Playwright или Cypress. Чем выше уровень, тем медленнее и flakier тесты, поэтому объём сверху держат минимальным. Антипаттерн — «перевёрнутая пирамида», когда почти всё закрывают только e2e.»
---
# 4. Самое главное запомнить
- Unit много и дёшево; e2e мало и дорого.
- Инструмент следует за уровнем: runner/assert → UI-utils → browser E2E.
- Integration проверяет контракты между частями, не «всё приложение».
- E2E — только критичные пути (вход, оплата, ключевой flow).
- Перевёрнутая пирамида = медленный suite и хрупкие падения.
---
# 5. Описание

```
        /\
       /e2e\          мало, медленно, дорого
      /------\
     / integ. \       среднее количество
    /----------\
   /   unit     \     много, быстро, дёшево
  /--------------\
```

| Уровень | Что проверяет | Скорость | Типичные инструменты (JS/TS) |
|---|---|---|---|
| Unit | Функция, класс, reducer, утилита в изоляции | Высокая | Jest, Vitest, Node assert |
| Integration | Связку модулей, API + сервис, UI-компонент с DOM | Средняя | Jest/Vitest + Testing Library, Supertest, MSW |
| E2E | Полный пользовательский путь в браузере | Низкая | Playwright, Cypress |

### Unit
- Среда: Node (чистая логика) или jsdom/happy-dom (DOM без браузера).
- Зависимости I/O подменяют моками/стабами.
- Примеры: расчёт скидки, валидация формы, reducer.

```javascript
test('применяет скидку 10%', () => {
  expect(calcDiscount(1000, 10)).toBe(900);
});
```

### Integration
- Реальные соседние модули, подмена только внешней границы (сеть, БД, сторонний API).
- UI: Testing Library + userEvent — поведение пользователя, не внутренности компонента.
- API: Supertest к Express/Fastify; HTTP-мок через MSW.

```javascript
render(<LoginForm />);
await userEvent.type(screen.getByLabelText('Email'), 'a@b.c');
await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
expect(await screen.findByText('Добро пожаловать')).toBeInTheDocument();
```

### E2E
- Реальный браузер, приложение как у пользователя.
- Покрывают риски регрессии в критичных flow, не каждую кнопку.
- Стабильные селекторы: роль, label, при необходимости `data-testid`.

```javascript
test('оформляет заказ', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByTestId('pay').click();
  await expect(page.getByText('Заказ оформлен')).toBeVisible();
});
```

### Как выбирать инструмент
| Задача | Уровень | Выбор |
|---|---|---|
| Чистая бизнес-логика | Unit | Vitest / Jest |
| React-компонент без полного приложения | Integration (UI) | Testing Library + Vitest/Jest |
| HTTP-контракт сервиса | Integration (API) | Supertest / MSW |
| Сценарий «пользователь купил» | E2E | Playwright или Cypress |

Не смешивать уровни в одном тесте без нужды: e2e не должен заменять проверку формулы, а unit не доказывает, что кнопка в проде реально открывает оплату.
---
# 6. Ссылки
- [Martin Fowler — The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/guiding-principles)
- [Playwright](https://playwright.dev/docs/intro)
- [Cypress](https://docs.cypress.io/)
