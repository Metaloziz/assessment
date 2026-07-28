# 1. Тема
**Паттерны AAA и AAS**
---
# 2. Главное в одну фразу
AAA делает тест читаемым через подготовку, действие и проверку, а AAS заменяет явную проверку сравнением со snapshot.
---
# 3. Ответ для собеседования
> «Обычно структурирую тесты по AAA: Arrange — создаю данные и зависимости, Act — выполняю одно тестируемое действие, Assert — проверяю результат. Это отделяет setup от сути теста. AAS — Arrange, Act, Snapshot — применяю для небольшого стабильного вывода, например сериализуемого UI или ответа. Для бизнес-логики предпочитаю AAA: точечные assertions лучше объясняют контракт и дают понятнее падение.»
---
# 4. Самое главное запомнить
- Один тест — один понятный Act.
- Arrange не должен скрывать смысл теста.
- AAA проверяет конкретный контракт.
- AAS удобен для вывода, но snapshot нужно осмысленно ревьюить.
---
# 5. Описание
| Паттерн | Последний шаг | Лучше подходит | Риск |
|---|---|---|---|
| AAA | Assert | Логика, ошибки, взаимодействия | Слишком много assertions в одном тесте |
| AAS | Snapshot | Небольшой UI/JSON-вывод | «Обновить всё» без понимания diff |

### AAA в Jest
```javascript
test('возвращает пользователя по id', () => {
  // Arrange
  const repository = { findById: jest.fn().mockReturnValue({ id: 7, name: 'Анна' }) };
  const service = new UserService(repository);

  // Act
  const result = service.getUser(7);

  // Assert
  expect(result).toEqual({ id: 7, name: 'Анна' });
  expect(repository.findById).toHaveBeenCalledWith(7);
});
```

### AAS в Jest
```javascript
test('формирует карточку заказа', () => {
  // Arrange
  const order = { id: 12, total: 500 };

  // Act
  const view = renderOrder(order);

  // Snapshot
  expect(view).toMatchSnapshot();
});
```

Snapshot хранится рядом с тестом и сравнивается при следующем запуске. Он не доказывает пользовательскую ценность сам по себе: важные текст, роль, ошибка и действие лучше дополнительно проверять явным matcher.
---
# 6. Ссылки
- [Jest — snapshot testing](https://jestjs.io/docs/snapshot-testing)
- [Martin Fowler — Unit Test](https://martinfowler.com/bliki/UnitTest.html)
