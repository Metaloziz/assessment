# 1. Тема
**Enzyme и React Testing Library**
---
# 2. Главное в одну фразу
Enzyme тестирует внутренности React-компонента, а React Testing Library — доступное пользователю поведение; для новых проектов обычно выбирают RTL.
---
# 3. Ответ для собеседования
> «Enzyme давал удобный доступ к `props`, `state` и shallow-rendering, поэтому тесты часто знали детали реализации. React Testing Library намеренно ведёт тест через DOM: ищем элемент по роли, подписи или тексту и действуем как пользователь. Это делает тесты устойчивее к рефакторингу и одновременно поддерживает доступность. В новом React-коде предпочитаю RTL с Jest/Vitest; Enzyme встречаю в legacy-проектах.»
---
# 4. Самое главное запомнить
- RTL: поведение и accessibility-first queries.
- Enzyme: структура и внутренние детали компонента.
- `getByRole` обычно лучше CSS-селектора.
- RTL не запрещает unit-тесты чистой логики.
---
# 5. Описание
| Аспект | React Testing Library | Enzyme |
|---|---|---|
| Философия | Как пользователь видит UI | Как компонент реализован |
| Поиск | Роль, label, текст | Селекторы, типы компонентов |
| State/props | Нет прямого доступа | Прямой доступ |
| Рефакторинг | Обычно устойчивее | Может ломать тесты без изменения UX |
| Новый код | Предпочтительный выбор | Обычно legacy |

```javascript
// RTL: пользовательский сценарий
render(<Button onClick={onClick}>Сохранить</Button>);
await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
expect(onClick).toHaveBeenCalledTimes(1);
```

```javascript
// Enzyme: обращение к внутренней структуре
const wrapper = shallow(<Button onClick={onClick} />);
wrapper.find('button').simulate('click');
expect(onClick).toHaveBeenCalled();
```

RTL-запросы отражают приоритет: `getByRole` → `getByLabelText` → `getByText`; `data-testid` оставляют для случаев, когда доступного пользовательского идентификатора нет. Асинхронное появление UI проверяют через `findBy*` или `waitFor`, не через ручные задержки.
---
# 6. Ссылки
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Kent C. Dodds — common RTL mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Видео из Notion](https://youtu.be/y2emL1fMRyY?si=8gnxRYysKfWV6UQB&t=2232)
