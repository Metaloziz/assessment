# 1. Тема

**React Context**

---

# 2. Главное в одну фразу

Context — канал данных вниз по дереву без prop drilling: `Provider` отдаёт значение, `useContext` читает его у ближайшего провайдера.

---

# 3. Суть

> **Context** — встроенный механизм React, чтобы передать значение (тема, локаль, текущий пользователь) глубоким потомкам **без** прокидывания props через каждый промежуточный слой. Создаёте контекст (`createContext`), оборачиваете поддерево в `Provider`, внизу читаете через `useContext` (или `Consumer`).
>
> Зачем: тема UI, авторизация, i18n, флаги фич часто нужны в десятках листьев. Prop drilling раздувает сигнатуры `Layout` / `Sidebar` / `Card` ради данных, которые им самим не нужны, и усложняет рефакторинг.
>
> Как: ближайший `Provider` выше по React-дереву задаёт значение. Смена `value` у провайдера помечает **всех** потребителей этого контекста на повторный `render`. Портал и Error Boundary не рвут Context: потребитель внутри портала всё равно читает React-родителей.
>
> Ловушка: новый объект в `value={{ … }}` на каждый рендер провайдера = «всё изменилось» для потребителей. Context не заменяет локальный state и не обязан быть «глобальным Redux»: узкий контекст рядом с потребителями лучше одного гигантского.

---

# 4. Самое главное запомнить

- `createContext` → `Provider value={…}` → `useContext` у потомков.
- Читается **ближайший** Provider выше по React-дереву (не DOM).
- Смена `value` → ре-рендер всех потребителей этого контекста.
- Нестабильная ссылка в `value` (новый объект каждый раз) раздувает обновления.
- Узкий Context (тема отдельно от user) дешевле одного «мешка» на всё приложение.
- Context ≠ store: для сложного общего state часто Redux / Zustand; Context — удобный канал «сквозных» данных.

---

# 5. Описание

```text
App
 └─ ThemeProvider value={theme}     ← источник
      └─ Layout                     ← props theme не нужны
           └─ Sidebar
                └─ ThemeBadge
                     useContext(ThemeContext)  ← читает theme
```

Без Context те же данные идут так:

```text
App(theme)
 └─ Layout(theme)
      └─ Sidebar(theme)
           └─ ThemeBadge(theme)   ← drill через всех
```

## API

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<Theme>('light'); // ← default, если нет Provider

type ProviderProps = { children: ReactNode };

export const ThemeProvider = ({ children }: ProviderProps) => {
  const [theme, setTheme] = useState<Theme>('dark');
  return (
    <ThemeContext.Provider value={theme}>
      {children}
      <button type="button" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
        Toggle
      </button>
    </ThemeContext.Provider>
  );
};

export const ThemeBadge = () => {
  const theme = useContext(ThemeContext); // ← ближайший Provider
  return <span data-theme={theme}>{theme}</span>;
};
```

`defaultValue` в `createContext` срабатывает только если **нет** Provider выше. В приложении почти всегда ставят свой Provider у корня фичи.

## Когда Context уместен

| Ситуация | Подход |
| --- | --- |
| Тема, локаль, «текущий user» в листьях | Context рядом с корнем фичи |
| State нужен только родителю и ребёнку | Обычные props / локальный state |
| Много независимых полей, частые обновления | Узкие контексты или внешний store |
| Форма с десятками полей | Локальный state / form-manager, не один Context на каждое поле |

## Обновления и ре-рендеры

Потребитель подписан на контекст: при новом `value` (по `Object.is`) React снова вызывает его `render`. Промежуточные узлы **без** `useContext` сами по себе от Context не обновляются — но если провайдер в том же компоненте, что и большой layout, ре-рендер родителя всё равно спустится детям по обычным правилам React.

Типичная ошибка:

```tsx
// каждый render Provider → новый объект → все consumers
<AppContext.Provider value={{ theme, user, locale }}>
```

Лучше разнести (`ThemeContext` / `UserContext`) или мемоизировать значение (`useMemo`), если объект действительно общий и стабильный по смыслу.

## Context и соседние механизмы

- **Portal** — Context берётся от React-родителя, не от DOM вокруг `#modal-root`.
- **Error Boundary** — не мешает чтению Context ниже/выше по дереву.
- **memo** — не спасает от обновления Context: потребитель всё равно ре-рендерится при смене value, даже внутри `memo`.

---

# 6. Ссылки

- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React — `createContext`](https://react.dev/reference/react/createContext)
- [React — `useContext`](https://react.dev/reference/react/useContext)
- [React — Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
