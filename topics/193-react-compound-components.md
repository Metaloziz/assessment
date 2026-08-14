# 1. Тема

**Compound components**

---

# 2. Главное в одну фразу

Compound components — виджет из родителя и специализированных детей, которые делят состояние неявно (обычно через `Context`), а разметку оставляет вызывающему.

---

# 3. Суть

> **Compound components** — паттерн композиции: родитель и набор дочерних компонентов вместе образуют один виджет, как `<select>` и `<option>`. Родитель держит общее состояние (активная вкладка, выбранное значение); дети читают его сами и не требуют, чтобы вызывающий прокидывал `active` в каждый `Tab`.
>
> Зачем: вызывающий сам раскладывает JSX — бейдж между списком вкладок и панелью, другой порядок, обёртка для сетки. Закрытый API `items={[{ label, content }]}` этого не даёт: слота «между» нет.
>
> Как: современный канал — узкий `Context` внутри виджета. `Tabs` — `Provider` с `active` / `setActive`; `Tabs.Tab` и `Tabs.Panel` читают его через `useContext`. Исторический путь — `Children.map` + `cloneElement`, чтобы впрыснуть props прямым детям.
>
> Ловушка: `cloneElement` видит только прямых детей. Обернули `Tab` в `<div>` — props ушли в обёртку, вкладки разъехались. `Context` не зависит от промежуточных узлов. Compound — не любой `{children}`: без родителя-провайдера дети не разделяют состояние.

---

# 4. Самое главное запомнить

- API как у HTML: родитель (`Tabs` / `Select`) + дети (`Tab` / `Option`); общее состояние у родителя.
- Вызывающий компонует JSX: между `Tabs.List` и `Tabs.Panel` можно вставить свою разметку.
- Современный канал — внутренний `Context`, не props каждого ребёнка снаружи.
- `cloneElement` по прямым детям ломается на обёртке; `Context` — нет.
- `items={[]}` закрывает layout: нет слота «между» списком и панелью.
- Без родителя-провайдера `Tab` не знает, выбран ли он.
- Не путать с HOC и render-props: здесь композиция детей, не фабрика и не колбэк `(api) => UI`.

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
   │    ├─ Tabs.Tab id=a      ← useContext → selected?
   │    └─ Tabs.Tab id=b
   ├─ (своя разметка)         ← слот вызывающего
   └─ Tabs.Panel id=a         ← useContext → visible?

cloneElement (хрупко):
  Tabs
   └─ <div>                   ← clone впрыскивает props сюда
        └─ Tab                ← active / onSelect не дошли
```

## Идея и HTML-аналог

Нативный `<select>` — составной контрол: родитель знает значение, `<option>` описывают варианты. Вызывающий сам решает, сколько опций и в каком порядке. Compound components переносят ту же идею в React: `Tabs` + `Tabs.Tab` + `Tabs.Panel`, `Menu` + `Menu.Item`, `Accordion` + `Accordion.Panel`.

Снаружи виджет выглядит как обычный JSX, а не как один компонент с огромным конфигом. Внутри дети договариваются через общий канал, который вызывающему не показывают.

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

Промежуточный `<div>` вокруг `Tab` **не** мешает: `useContext` читает ближайший `Provider` выше по React-дереву.

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

Если вызывающий обернул вкладки в layout-`<div>`, `cloneElement` отдаст props обёртке. `Tab` останется без `onSelect` — клик ничего не переключает. `Fragment` и чужой HOC вокруг ребёнка ломают тот же контракт.

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

`items[]` проще для однотипного списка. Compound нужен, когда layout — часть публичного API: «положите сюда что угодно, виджет всё равно свяжет Tab и Panel».

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
