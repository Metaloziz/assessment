# 1. Тема

**Особенности синтаксиса JSX**

---

# 2. Главное в одну фразу

JSX — синтаксический сахар над вызовами `jsx` / `createElement`: выглядит как разметка, но это выражения JavaScript со своими правилами атрибутов, детей и условий.

---

# 3. Суть

> **JSX** позволяет писать описание UI в виде тегов внутри JS/TS-файла: `<Button label="Ок" />`. Сборщик (Babel, SWC, TypeScript) превращает это в обычные вызовы функций, которые создают React-элементы — объекты-описания, а не DOM-узлы в момент «написания тега».
>
> Зачем: читать дерево компонентов проще, чем вложенные `createElement`. При этом сохраняется сила JS: в `{}` можно вставить выражение, результат `map`, условие. JSX — не отдельный язык шаблонов с директивами вроде `v-if`; ветвление и циклы — обычный JavaScript.
>
> Важные отличия от HTML: атрибуты в camelCase (`className`, `htmlFor`, `onClick`), почти всё — выражения, один корень у return (или Fragment), булевы и `null`/`undefined`/`false` влияют на то, что попадёт в дерево. Списким нужен стабильный `key`.
>
> Ловушка: думать, что JSX «вставляется как HTML-строка». XSS через сырой HTML возможен только осознанно (`dangerouslySetInnerHTML`); обычный `{userText}` экранируется как текст. И наоборот: `{condition && <X />}` при `condition === 0` покажет `0` на экране — классическая ловушка `&&`.

---

# 4. Самое главное запомнить

- JSX → `jsx` / `createElement` → объект-элемент, не сразу DOM.
- В `{}` — JS-выражения; циклы/условия — через JS, не через особые теги.
- `class` → `className`, `for` → `htmlFor`; обработчики — `onClick` и т.п.
- Return одного корня или `<>…</>` / `<Fragment>`.
- В списках — стабильный `key` у элементов массива.
- `{userInput}` безопасен как текст; сырой HTML — только через `dangerouslySetInnerHTML`.

---

# 5. Описание

```text
<button className="ok">{label}</button>
        ↓  трансформация
jsx('button', { className: 'ok', children: label })
        ↓  runtime
{ type: 'button', props: { className: 'ok', children: label } }
```

## Базовый синтаксис

```jsx
const label = 'Сохранить';

return (
  <button type="button" className="primary" disabled={isBusy}>
    {isBusy ? '…' : label}
  </button>
);
```

Имена тегов с маленькой буквы — DOM (`div`, `span`). С большой — компонент (`UserMenu`).

## Выражения и дети

| Запись | Смысл |
| --- | --- |
| `{user.name}` | вставить значение |
| `{items.map(…)}` | список элементов |
| `{ok ? <A /> : <B />}` | ветка |
| `{ok && <A />}` | показать `A`, если `ok` истинно |
| `{null}` / `{false}` / `{undefined}` | ничего не рендерить |

Число `0` — валидный React-ребёнок, поэтому `count && <Badge />` при `count === 0` выведет `0`. Надёжнее: `count > 0 && <Badge />` или тернарный оператор.

## Атрибуты vs HTML

```jsx
<label htmlFor="email" className="field">
  <input id="email" autoFocus tabIndex={0} />
</label>
```

Стиль-объект: `style={{ marginTop: 8 }}` (camelCase CSS-свойств). `data-*` и `aria-*` пишут как в HTML.

## Fragment

```jsx
return (
  <>
    <dt>{term}</dt>
    <dd>{definition}</dd>
  </>
);
```

Нужен, когда соседние узлы должны попасть в родителя без лишней обёртки `div` (важно для таблиц, flex/grid, семантики).

## Списки и `key`

```jsx
<ul>
  {todos.map((t) => (
    <li key={t.id}>{t.title}</li>
  ))}
</ul>
```

`key` помогает React сопоставить элементы между рендерами. Индекс массива как `key` допустим только для статичного списка без вставки/перестановки — иначе легко перепутать state полей ввода.

## JSX и компоненты

```jsx
function Panel({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Panel title="Фильтр">
  <SearchForm />
</Panel>
```

`children` — обычный prop. Самозакрывающиеся теги: `<Icon />`.

## Чего нет в JSX «из коробки»

- Директив шаблонизатора (`*ngIf`, `v-for`) — только JS.
- Комментариев `{/* … */}` внутри разметки; `//` снаружи ok.
- Нескольких корневых узлов без Fragment в старых правилах (в современном JSX transform иногда допускается массив — лучше явно Fragment).

---

# 6. Ссылки

- [React — Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React — JavaScript in JSX with Curly Braces](https://react.dev/learn/javascript-in-jsx-with-curly-braces)
- [React — Rendering Lists](https://react.dev/learn/rendering-lists)
- [React — JSX in Depth (legacy docs)](https://legacy.reactjs.org/docs/jsx-in-depth.html)
