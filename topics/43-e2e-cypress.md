# 1. Тема
**E2E-тесты и Cypress**
---
# 2. Главное в одну фразу
E2E-тест проверяет критичный пользовательский путь через работающее приложение, а Cypress управляет браузером и ждёт состояние интерфейса автоматически.
---
# 3. Ответ для собеседования
> «E2E проверяет систему целиком: UI, клиентский код, API и интеграции в пределах сценария. Cypress открывает приложение в браузере и даёт цепочки команд `cy.visit`, `cy.get`, `type`, `click`, `should`. Такие тесты дороже и медленнее unit-тестов, поэтому покрываю ими критические пути: вход, оформление заказа, платёж. Для устойчивости использую изолированные тестовые данные, не завишу от порядка тестов и выбираю селекторы `data-testid`.»
---
# 4. Самое главное запомнить
- E2E — проверка потока от действия пользователя до результата.
- Cypress автоматически повторяет ожидание элементов и assertions.
- `data-testid` — стабильный селектор, если роль/label не подходят.
- E2E дополняет, а не заменяет unit/integration.
---
# 5. Описание
```javascript
describe('вход пользователя', () => {
  it('открывает личный кабинет с валидными данными', () => {
    cy.visit('/login');
    cy.get('[data-testid=email]').type('user@example.com');
    cy.get('[data-testid=password]').type('correct-password');
    cy.get('[data-testid=submit]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid=welcome]').should('contain', 'Добро пожаловать');
  });
});
```

```javascript
describe('покупка', () => {
  it('оформляет заказ', () => {
    cy.visit('/products');
    cy.get('[data-testid=product-1]').click();
    cy.get('[data-testid=cart]').should('contain', '1');
    cy.get('[data-testid=checkout]').click();
    cy.get('[data-testid=order-confirmation]').should('be.visible');
  });
});
```

| Практика | Зачем |
|---|---|
| `data-testid` | Не ломать тест от смены CSS или текста |
| API seed / fixtures | Быстро подготовить предсказуемые данные |
| Независимые тесты | Запускать параллельно и в любом порядке |
| Проверка видимого результата | Не привязываться к реализации |
| Минимум сценариев | Держать suite быстрым и менее flaky |

Не используйте фиксированный `cy.wait(5000)`: Cypress умеет ждать элемент, запрос или assertion. Внешние нестабильные сервисы на тестовой среде обычно контролируют через intercept или dedicated test environment.
---
# 6. Ссылки
- [Cypress — документация](https://docs.cypress.io/)
- [Cypress — best practices](https://docs.cypress.io/app/core-concepts/best-practices)
