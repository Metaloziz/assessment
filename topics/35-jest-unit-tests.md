# 1. Тема
**Jest**
---
# 2. Главное в одну фразу
Jest — тестовый фреймворк для JavaScript/TypeScript: он запускает тесты, даёт matchers и mocks, умеет snapshots и считает coverage почти без начальной настройки.
---
# 3. Ответ для собеседования
> «Jest использую для unit- и небольших integration-тестов. В нём из коробки есть runner, `expect` с matchers, mock-функции, snapshots и отчёт о покрытии. Обычно добавляю скрипты `test`, `test:watch` и при необходимости `test:coverage`. Тест строю по AAA: подготовил данные, вызвал код, проверил наблюдаемое поведение. Внешние зависимости — API, БД, таймеры — подменяю, чтобы тест был быстрым и детерминированным.»
---
# 4. Самое главное запомнить
- Jest: runner + assertions + mocks + snapshots + coverage.
- `toBe` — для примитивов; `toEqual` — для структур данных.
- `jest.fn()` создаёт контролируемую mock-функцию.
- Snapshot полезен для небольшого стабильного вывода, но не заменяет осмысленные assertions.
---
# 5. Описание
Jest исторически позиционируется как framework с минимальной конфигурацией: тесты находятся по соглашениям (`*.test.*`, `*.spec.*`), запускаются командой `jest`, а результат выводится в консоль.

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

```javascript
describe('calcDiscount', () => {
  test('применяет скидку 10%', () => {
    expect(calcDiscount(1000, 10)).toBe(900);
    expect(['card', 'cash']).toContain('card');
    expect({ id: 1 }).toEqual({ id: 1 });
  });
});
```

### Моки и snapshots
```javascript
const fetchUser = jest.fn().mockResolvedValue({ id: 1, name: 'Анна' });
await expect(fetchUser()).resolves.toEqual({ id: 1, name: 'Анна' });
expect(fetchUser).toHaveBeenCalledTimes(1);

expect(renderReceipt(order)).toMatchSnapshot();
```

| Возможность | Для чего |
|---|---|
| Matchers | Проверить значение, ошибку, массив, объект, вызов |
| Mocks | Изолировать зависимость и проверить взаимодействие |
| Snapshots | Зафиксировать небольшой стабильный вывод |
| Coverage | Увидеть неисполненные строки и ветки |

Покрытие — индикатор, а не цель: тест может исполнить строку и не проверять её корректность.
---
# 6. Ссылки
- [Jest — документация](https://jestjs.io/docs/getting-started)
- [Jest — mock functions](https://jestjs.io/docs/mock-functions)
- [Jest — snapshot testing](https://jestjs.io/docs/snapshot-testing)
