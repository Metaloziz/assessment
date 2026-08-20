# 1. Тема

**Compound components**

---

# 2. Главное в одну фразу

Compound components — виджет из родителя и «своих» детей: общее состояние внутри, а разметку раскладывает вызывающий.

---

# 3. Суть

> **Compound components** — как нативный `<select>` с `<option>`: родитель держит выбранное значение, а дети описывают куски UI. В React это `Tabs` + `Tab` + `Panel` или `Menu` + `Menu.Item`. Вызывающий пишет обычный JSX и сам решает порядок, обёртки и что поставить между частями.
>
> Зачем так: закрытый API вроде `items={[{ label, content }]}` рисует список и панель сам — между ними нельзя вставить бейдж, подсказку или свою сетку. Compound отдаёт layout наружу, а связь «какая вкладка активна» оставляет внутри виджета.
>
> Как: современный канал — узкий `Context` внутри родителя. `Tabs` кладёт в `Provider` `active` / `setActive`; `Tab` и `Panel` читают их через `useContext`. Исторический путь — `Children.map` + `cloneElement` (хрупко: только прямые дети).
>
> Ловушка: `items[]` проще, но закрывает layout. `cloneElement` ломается на обёртке вокруг `Tab`. `Context` через промежуточные узлы проходит. Один `{children}` без общего канала — просто композиция разметки, не compound-виджет.

---

# 4. Самое главное запомнить

- Родитель и дети — один виджет; общее состояние у родителя, не у вызывающего на каждом `Tab`.
- Вызывающий компонует JSX: между списком вкладок и панелью можно вставить свою разметку.
- Современный канал связи — внутренний `Context`, не прокидывание `active` снаружи.
- `cloneElement` ломается на обёртке; `Context` — нет.
- `items={[]}` проще, но закрывает layout: слота «между» частями нет.
- Без родителя-провайдера `Tab` не знает, выбран ли он.
- Не путать с HOC и render-props: здесь именованные дети и неявное состояние, не фабрика и не колбэк `(api) => UI`.

---

# 5. Описание

```text
HTML-аналог:
  <select value>              ← родитель держит value
    <option>A</option>        ← дети без своего store
    <option>B</option>

Context (устойчиво):
  Tabs                        ← Provider: active, setActive
   ├─ Tabs.List
   │    ├─ Tabs.Tab id=a      ← useContext → выбран?
   │    └─ Tabs.Tab id=b
   ├─ (своя разметка)         ← слот вызывающего
   └─ Tabs.Panel id=a         ← useContext → виден?

cloneElement (хрупко):
  Tabs
   └─ <div>                   ← clone впрыскивает props сюда
        └─ Tab                ← active / onSelect не дошли
```

## Идея и HTML-аналог

Нативный `<select>` уже составной: родитель знает значение, `<option>` только описывают варианты. Сколько опций и в каком порядке — решает разметка снаружи. Compound components переносят ту же идею в React: `Tabs` + `Tabs.Tab` + `Tabs.Panel`, `Menu` + `Menu.Item`, `Accordion` + `Accordion.Panel`.

Снаружи это обычный JSX, не один компонент с огромным конфигом. Внутри дети договариваются через общий канал, который вызывающему не показывают.

## Context внутри виджета

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type TabsValue = { active: string; setActive: (id: string) => void };

const TabsContext = createContext<TabsValue | null>(null);

type TabsProps = { defaultId: string; children: ReactNode };

export const Tabs = ({ defaultId, children }: TabsProps) => {
  const [active, setActive] = useState(defaultId);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
};

type TabProps = { id: string; children: ReactNode };

export const Tab = ({ id, children }: TabProps) => {
  const ctx = useContext(TabsContext);
  if (!ctx) return <button type="button" disabled>{children}</button>;
  return (
    <button
      type="button"
      aria-selected={ctx.active === id}
      onClick={() => ctx.setActive(id)}
    >
      {children}
    </button>
  );
};
```

`Tabs.List` / `Tabs.Panel` подключают так же. Статичные поля (`Tabs.Tab = Tab`) — удобный namespace, не отдельный механизм.

Промежуточный `<div>` вокруг `Tab` не мешает: `useContext` читает ближайший `Provider` выше по дереву React.

## `cloneElement` — хрупкий путь

Старый приём: родитель обходит `children` и впрыскивает `active` / `onSelect`:

```tsx
import { Children, cloneElement, isValidElement } from 'react';

export const Tabs = ({ children }: { children: React.ReactNode }) => {
  const [active, setActive] = useState('a');
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, { active, onSelect: setActive }); // ← только прямые дети
  });
};
```

Если вкладки обернули в layout-`<div>`, `cloneElement` отдаст props обёртке. `Tab` останется без `onSelect` — клик ничего не переключает. Тот же контракт ломают `Fragment` и чужой HOC вокруг ребёнка.

## Закрытый `items[]` vs композиция

```tsx
type Item = { id: string; label: string; panel: React.ReactNode };

export const Tabs = ({ items }: { items: Item[] }) => {
  // список и панели рисует сам Tabs — вставить бейдж между ними нельзя
};
```

| API | Layout | Состояние |
| --- | --- | --- |
| Compound + `Context` | вызывающий решает JSX | общее, внутри родителя |
| `cloneElement` | как children, но без обёрток | впрыск прямым детям |
| `items={[]}` | фиксированные слоты | внутри, без композиции |

`items[]` удобен для однотипного списка. Compound нужен, когда layout — часть публичного API: «положите сюда что угодно, виджет всё равно свяжет Tab и Panel».

## Рядом с HOC и render-props

| Подход | Что отдаёт наружу |
| --- | --- |
| Compound | набор детей + неявное состояние |
| Render-props | колбэк `(api) => UI` |
| HOC | новый тип компонента с лишними props |

Один `{children}` без общего канала — просто композиция разметки (`Layout`), не compound-виджет.

---

# 6. Ссылки

- [React — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React — Passing JSX as children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [React — Composition vs Inheritance](https://legacy.reactjs.org/docs/composition-vs-inheritance.html)
- [MDN — `<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select)
- [Radix — Composition](https://www.radix-ui.com/primitives/docs/guides/composition)
