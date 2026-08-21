# 1. Тема

**React Testing Library**

---

# 2. Главное в одну фразу

React Testing Library проверяет компонент так, как им пользуется человек: через доступный DOM (роль, подпись, текст), а не через внутренний `state` и структуру React-дерева.

---

# 3. Суть

> **React Testing Library (RTL)** — способ тестировать React-UI «глазами пользователя». Тест монтирует компонент, ищет кнопку по роли и имени, кликает, проверяет текст на экране. Ему не нужно знать, как называется класс в CSS и что лежит в `useState`.
>
> Зачем так. Рефакторинг часто меняет разметку и имена переменных, а для пользователя кнопка «Сохранить» остаётся той же. Тесты на поведение переживают такие правки; тесты на внутренности ломаются без смены UX.
>
> Как пишут. `render` → запрос (`getByRole`, `getByLabelText`, `getByText`) → действие (`userEvent`) → `expect` по видимому результату. Асинхронный UI ждут через `findBy*` / `waitFor`, не через `sleep`. Рядом обычно Jest или Vitest — RTL не заменяет runner.
>
> Ловушка: искать по CSS-классу или `data-testid` «на всякий случай», когда есть роль и подпись. `data-testid` оставляют на крайний случай. Enzyme и прямой доступ к `props`/`state` — legacy; в новом коде берут RTL.

---

# 4. Самое главное запомнить

- RTL тестирует поведение и доступный DOM, не внутреннюю реализацию.
- Приоритет запросов: `getByRole` → `getByLabelText` → `getByText`; `data-testid` — запасной вариант.
- Действия — через `userEvent`, не через ручной `fireEvent`, если нет особой причины.
- Асинхронщину ждут `findBy*` / `waitFor`, не фиксированной паузой.
- Чистую логику без UI по-прежнему можно гонять обычными unit-тестами.
- Enzyme / доступ к `state` — в основном legacy; для нового React — RTL.

---

# 5. Описание

```text
пользователь видит UI
        │
        ▼
  роль / label / текст   ← RTL ищет здесь
        │
        ▼
   клик / ввод / ожидание
        │
        ▼
   assert по экрану

  (не: state, props, имя класса в CSS)
```

## Философия

RTL намеренно ограничивает доступ к внутренностям компонента. Если тест «не может» проверить что-то без `state` — часто это сигнал, что проверка слишком низкоуровневая: пользователю важен результат на экране, а не то, как вы его посчитали.

| Делать | Избегать |
|---|---|
| `getByRole('button', { name: 'Сохранить' })` | `container.querySelector('.btn-primary')` |
| `userEvent.click` / `type` | прямой доступ к `props` / `state` |
| `findByText` / `waitFor` | `await sleep(500)` |
| assert текста, роли, disabled | assert структуры React-дерева |

## Пример

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('отправляет логин', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Email'), 'a@b.c'); // ← по подписи
  await user.click(screen.getByRole('button', { name: 'Войти' })); // ← по роли

  expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.c' });
});
```

## Асинхронный UI

Элемент, который появится после загрузки, ищут так:

```tsx
expect(await screen.findByRole('status')).toHaveTextContent('Готово');
// ← findBy* ждёт появления, не sleep
```

## Связь с соседними темами

Jest / Vitest запускают тест и дают `expect`. Пирамида и integration/e2e отвечают, *на каком срезе* проверять; RTL — *как* удобно проверять React-компонент на уровне UI без полного браузерного e2e.

---

# 6. Ссылки

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Common mistakes (Kent C. Dodds)](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Which query should I use?](https://testing-library.com/docs/queries/about/#priority)
