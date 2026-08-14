# 1. Тема

**render-props**

---

# 2. Главное в одну фразу

Render-props — компонент держит логику и состояние, а UI отдаёт вызывающему через функцию `(api) => JSX`, а не через фиксированную разметку внутри.

---

# 3. Суть

> **Render-props** — паттерн инверсии контроля: компонент-«движок» (`Mouse`, `DataFetcher`, `Toggle`) знает, *как* подписаться на событие или загрузить данные, но не решает, *как* это нарисовать. Он вызывает prop-функцию `render(state)` или `children(state)` и отдаёт снимок API — координаты, `loading` / `data` / `error`, `on` / `toggle`.
>
> Зачем: одну и ту же поведенческую оболочку можно переиспользовать с разным UI — курсор-метка, тултип в углу, таблица вместо списка — без копирования `useEffect` и без HOC, который меняет тип оборачиваемого компонента. Вызывающий видит контракт прямо в JSX: «вот зона, вот функция, которая рисует по её state».
>
> Как: внутри `render()` компонента — state + side effects; в return — `render({ x, y })` или `typeof children === 'function' ? children(api) : children`. Имена prop могут быть `render`, `children`, `component` — смысл один: колбэк возвращает React-элемент.
>
> Ловушка: несколько render-props вложены друг в друга — «пирамида» колбэков; для переиспользования *логики* без кастомного UI сегодня чаще пишут **custom hook** (`usePointer`, `useFetch`). Render-props остаются уместны, когда библиотека должна отдать и поведение, и слот под разметку в одном компоненте. Не путать с compound components (именованные дети) и с HOC (новый тип компонента с props).

---

# 4. Самое главное запомнить

- Движок держит state/effects; UI строит вызывающий через `(api) => JSX`.
- Работает и через prop `render`, и через `children` как функцию — контракт один.
- Инверсия контроля: поведение внутри, представление снаружи.
- Несколько вложенных render-props дают «лесенку» колбэков — больно читать и рефакторить.
- Для деления только логики без слота под UI предпочтительнее custom hook.
- HOC оборачивает тип компонента; render-prop оставляет дерево явным в JSX.
- Inline-колбэк на каждый render — новая функция; для горячих путей выносят `useCallback` или hook.

---

# 5. Описание

```text
render-prop:
  <PointerZone render={({ x, y }) => <Badge x={x} y={y} />} />
       ↑ движок: listeners + state          ↑ UI решает вызывающий

children-as-function:
  <Toggle>{(on, toggle) => <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>}</Toggle>

vs hook (та же логика, UI в теле родителя):
  const { x, y } = usePointer(ref);
  return <Badge x={x} y={y} />;
```

## Минимальный пример

```tsx
type PointerApi = { x: number; y: number; inside: boolean };

type Props = {
  children: (api: PointerApi) => React.ReactNode;
};

export const PointerZone = ({ children }: Props) => {
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false });

  return (
    <div
      className="zone"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setApi({
          x: Math.round(e.clientX - rect.left),
          y: Math.round(e.clientY - rect.top),
          inside: true,
        });
      }}
      onMouseLeave={() => setApi((prev) => ({ ...prev, inside: false }))}
    >
      {children(api)} {/* ← render-prop / children-as-function */}
    </div>
  );
};
```

```tsx
export const Heatmap = () => (
  <PointerZone>
    {(api) =>
      api.inside ? (
        <span className="chip" style={{ left: api.x, top: api.y }}>
          {api.x},{api.y}
        </span>
      ) : (
        <p>Наведите на зону</p>
      )
    }
  </PointerZone>
);
```

`PointerZone` не знает, будет ли метка кружком, таблицей или текстом в углу — только передаёт координаты.

## `render` vs `children`

| Prop | Пример | Заметка |
| --- | --- | --- |
| `render` | `<Route render={({ match }) => …} />` | явное имя; не смешивается с обычными `children` |
| `children` fn | `<Data>{(data) => …}</Data>` | один слот; если нужны и текст, и fn — путаница |
| `component` | `<Route component={Page} />` | не render-prop: React создаёт элемент сам |

Оба первых варианта — render-props: функция получает API и **возвращает** элемент.

## Зачем не HOC и не compound

| Подход | Что отдаёт | UI |
| --- | --- | --- |
| Render-props | колбэк `(api) => JSX` | полностью у вызывающего |
| HOC | новый компонент + props | разметка внутри оборачиваемого или HOC |
| Compound | именованные дети + Context | композиция готовых частей виджета |

HOC удобен, когда нужно «надеть» поведение на чужой компонент. Render-prop — когда библиотека продаёт *поведение + слот*, а не новый тип `EnhancedPage`.

## Custom hook как наследник идеи

```tsx
export const usePointer = (ref: RefObject<HTMLElement | null>) => {
  const [api, setApi] = useState<PointerApi>({ x: 0, y: 0, inside: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => { /* те же расчёты */ };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [ref]);
  return api;
};

export const Heatmap = () => {
  const ref = useRef<HTMLDivElement>(null);
  const api = usePointer(ref);
  return (
    <div ref={ref} className="zone">
      {api.inside ? <Badge {...api} /> : <p>Наведите</p>}
    </div>
  );
};
```

Та же логика координат, но без обёртки-компонента и без вложенного колбэка. Для своего кода hook обычно проще; render-prop остаётся в API библиотек, где потребитель не хочет сам вешать listeners.

## Вложенность и производительность

```tsx
<Auth render={(user) => (
  <Theme render={(theme) => (
    <Layout render={(nav) => <Page user={user} theme={theme} nav={nav} />} />
  )} />
)} />
```

Читаемость падает — отсюда миграция экосистемы к hooks + context. Inline `render={() => …}` создаёт новую функцию каждый render; если дочерний компонент мемоизирован по prop — лишний re-render. Лечится `useCallback` или выносом дочернего компонента.

## Рядом с hooks и Context

Hooks вытаскивают *логику*; render-props делят и логику, и *место* в дереве, где UI подключается к state. `React.cloneElement` и compound components решают другие задачи (см. соседние темы). На новом коде: hook для переиспользования поведения, render-prop — когда публичный API библиотеки уже построен вокруг колбэка или нужен один компонент «из коробки» с гибким слотом.

---

# 6. Ссылки

- [React (legacy) — Render Props](https://legacy.reactjs.org/docs/render-props.html)
- [React — Passing JSX as children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Kent C. Dodds — How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) (контраст с render-props / provider)
- [React Router — Route render prop (v5 docs)](https://v5.reactrouter.com/web/api/Route/render-renderprops-function)
