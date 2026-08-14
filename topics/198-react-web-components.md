# 1. Тема

**Web Components в React**

---

# 2. Главное в одну фразу

Custom element в React — чужой DOM-контракт: атрибуты строковые, объекты и события часто нужно прокидывать через свойства и `ref`, а не как обычные JSX-пропы.

---

# 3. Суть

> React монтирует `<my-widget>` как обычный узел, но внутри — Shadow DOM и lifecycle браузера, не virtual DOM. Строковые атрибуты (`sku`, `variant`) React пишет в разметку; сложные значения (объекты, массивы, функции) живут в **свойствах** элемента — иначе в HTML останется `"[object Object]"`.
>
> Зачем: дизайн-система на Web Components, виджеты из другой команды, legacy без React — один тег работает в любом фреймворке. В React это мост между двумя мирами: reconciler обновляет узел, а поведение и стили — у custom element.
>
> Как: тег с дефисом в JSX; для TS — расширить `IntrinsicElements`. Объекты — `ref` + `el.config = data` или обёртка (`@lit/react`). Кастомные события — `addEventListener('rating-change', …)` на ref или согласованное имя handler (React 19 лучше понимает CE). Глобальный CSS не пробивает shadow — только `:host`, CSS variables, `::part`.
>
> Ловушка: ждать, что `onClick` поймает `CustomEvent` из тени; забыть `customElements.define` до первого рендера; смешать SSR (на сервере элемента ещё нет) с клиентским upgrade.

---

# 4. Самое главное запомнить

- Имя в JSX — как в HTML: `<product-chip>`, не `<ProductChip>`.
- Атрибут ≠ свойство: React по умолчанию пишет атрибуты; объекты — через property на DOM-узле.
- Кастомное событие из shadow — native listener на host или обёртка-компонент.
- Shadow DOM изолирует стили; проброс — variables, `::part`, slots.
- `customElements.define` — до mount; динамический import / `useEffect` на SSR.
- TypeScript: declare module для JSX и типов свойств элемента.
- React 19: property/event mapping для CE улучшен, контракт элемента всё равно ваш.

---

# 5. Описание

```text
React-дерево                    Custom element (Shadow DOM)

App                             <product-chip>  ← host в React-дереве
 └─ ProductPage                      │
      └─ <product-chip sku="…">      ├─ shadow root
           ref → .meta = {…}         │    ├─ разметка / стили
           addEventListener          │    └─ dispatch CustomEvent
                                     └─ light DOM → <slot>
```

## JSX и типизация

```tsx
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'product-chip': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          sku?: string;
          // meta — property, не атрибут в контракте
        },
        HTMLElement
      >;
    }
  }
}

export const ProductRow = () => (
  <product-chip sku="SKU-42" />
);
```

Без declare TS ругается на неизвестный тег. Свойства вроде `meta` в типах JSX — подсказка; реальная запись объекта — на DOM-узле.

## Атрибут vs свойство

| | Атрибут | Свойство |
| --- | --- | --- |
| В HTML | виден (`sku="42"`) | нет |
| Тип | строка | любой JS |
| React | `sku="42"` / `sku={id}` → атрибут | `ref` → `el.meta = { title, price }` |
| Когда | строки, числа как текст | объекты, массивы, колбэки |

```tsx
type ChipMeta = { title: string; price: number };

type ProductChipEl = HTMLElement & { meta?: ChipMeta };

export const ChipWithMeta = () => {
  const ref = useRef<ProductChipEl>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // PROPERTY ← объект на host, не атрибут meta="[object Object]"
    el.meta = { title: 'Наушники', price: 4290 };
  }, []);

  return <product-chip ref={ref} sku="SKU-42" />;
};
```

## События

Custom element диспатчит с host:

```js
this.dispatchEvent(
  new CustomEvent('chip-action', { bubbles: true, detail: { sku } }),
);
```

В React — listener на host (надёжно на любой версии):

```tsx
useEffect(() => {
  const el = ref.current;
  if (!el) return;
  const onAction = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    console.log(detail.sku);
  };
  el.addEventListener('chip-action', onAction);
  return () => el.removeEventListener('chip-action', onAction);
}, []);
```

React 19 может мапить некоторые handlers на custom events, но контракт имени (`chip-action` vs `onChipAction`) нужно сверять с документацией виджета.

## Стили и слоты

- Глобальные классы React **не** попадают в shadow — только `:host`, `:host-context`, CSS variables с `:root`.
- Контент между тегами — light DOM, проецируется через `<slot>` внутри CE.
- `::part(name)` — если элемент экспортирует `part="title"` наружу.

## Обёртки

Если API сложный — тонкий React-комponent:

```tsx
type Props = { sku: string; meta: ChipMeta; onAction: (sku: string) => void };

export const ProductChip = ({ sku, meta, onAction }: Props) => {
  const ref = useRef<ProductChipEl>(null);

  useEffect(() => {
    if (ref.current) ref.current.meta = meta;
  }, [meta]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = (e: Event) => onAction((e as CustomEvent).detail.sku);
    el.addEventListener('chip-action', h);
    return () => el.removeEventListener('chip-action', h);
  }, [onAction]);

  return <product-chip ref={ref} sku={sku} />;
};
```

Библиотеки (`@lit/react`, `react-to-webcomponent`) делают то же — мапинг props ↔ properties/events.

## SSR и hydration

На сервере `customElements` нет — тег рендерится как неизвестный HTML. Обычно:

- регистрировать CE только в `useEffect` / client bundle;
- не рендерить CE на SSR или показывать fallback до `define`;
- избегать mismatch: атрибуты на сервере и свойства на клиенте должны совпадать по смыслу.

## Когда CE, когда React-комponent

| Ситуация | Выбор |
| --- | --- |
| Виджет нужен в React, Vue, статике | Custom element |
| Только React, нужен context/hooks | React-кomponent |
| Старый jQuery-виджет с CE-обёрткой | CE + тонкий bridge |
| Полная изоляция CSS между командами | Shadow DOM + CE |

---

# 6. Ссылки

- [React — Using Web Components](https://react.dev/reference/react-dom/components#custom-elements)
- [MDN — Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN — Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [Lit — `@lit/react`](https://lit.dev/docs/frameworks/react/)
- [web.dev — Custom elements v1](https://web.dev/articles/custom-elements-v1)
