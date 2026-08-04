# 1. Тема

**Комбинирование State и store в компоненте, по какому принципу надо разделять данные**

---

# 2. Главное в одну фразу

Локальный React state — для UI с коротким жизненным циклом и узкой областью; Redux — для shared, долгоживущих и кэшируемых данных; в одном компоненте оба слоя нормальны, по умолчанию держат локально и поднимают в store только при реальной необходимости.

---

# 3. Суть

> Разделение не «или Redux, или useState», а **по области видимости и жизненному циклу**. Локальный state: черновики форм, открыт ли модал, активная вкладка, hover, анимация — данные, которые **не нужны** соседним экранам и **можно выбросить** при размонтировании.
>
> Redux store: авторизация, тема, корзина, список сущностей с сервера, нормализованный кэш — всё **общее**, **переживает навигацию**, **читается из нескольких веток дерева** или **синхронизируется с SSR/API**.
>
> Один компонент спокойно комбинирует оба: из store — `user`, `cartItems`; локально — `isDropdownOpen`, `inputValue` до submit. Практичное правило: **default local → lift up → Context/useReducer → Redux**, когда prop drilling и дублирование кэша становятся проблемой.

---

# 4. Самое главное запомнить

- **Локально:** UI-only, ephemeral, один компонент / малая ветка.
- **Redux:** shared, global, long-lived, server cache, нужен DevTools/time-travel.
- **Один компонент** может использовать и `useState`, и `useSelector`.
- **Default — local**; в store только когда есть веская причина.
- Не класть в Redux то, что можно вычислить (derived state) из уже имеющегося.

---

# 5. Описание

## Критерии выбора

| Критерий | Локальный state | Redux store |
| --- | --- | --- |
| Кто читает | Один компонент / ближайшие дети | Много несвязанных компонентов |
| Жизненный цикл | Сброс при unmount OK | Нужно сохранить между маршрутами |
| Источник | Ввод пользователя, UI-флаги | API, auth, бизнес-сущности |
| Отладка | Достаточно React DevTools | Нужен action log, time-travel |
| SSR | Обычно не гидрируется | Preloaded state с сервера |

## Что держать локально

- Текст в `<input>` до отправки формы (controlled input).
- `isModalOpen`, `activeTab`, `isMenuExpanded`.
- Состояние анимации, drag-and-drop в процессе.
- Ошибки валидации поля до submit (если не нужны глобально).

## Что держать в Redux

- Текущий пользователь / токен / роли.
- Списки и сущности с бэкенда (users, products), особенно с нормализацией.
- UI preferences, общие для приложения (язык, тема — или Context, если просто).
- Optimistic updates и сложные cross-feature updates.

## Комбинирование в одном компоненте

```tsx
function ProductPage({ productId }: { productId: string }) {
  // Redux — shared, с сервера, нужен и здесь, и в header/cart
  const product = useAppSelector((s) => selectProductById(s, productId));
  const dispatch = useAppDispatch();

  // Local — только UI этой страницы
  const [quantity, setQuantity] = useState(1);
  const [showReviews, setShowReviews] = useState(false);

  const handleAddToCart = () => {
    dispatch(addToCart({ productId, quantity }));
    setQuantity(1); // сброс локального UI после действия
  };

  return (
    <section>
      <h1>{product.name}</h1>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
      <button onClick={handleAddToCart}>В корзину</button>
      <button onClick={() => setShowReviews((v) => !v)}>
        {showReviews ? 'Скрыть' : 'Показать'} отзывы
      </button>
    </section>
  );
}
```

`quantity` не обязан жить в store до нажатия «В корзину» — это черновик UI. `cart` — уже global concern.

## Алгоритм решения

```
1. Данные нужны только здесь?
   → useState / useReducer

2. Нужны родителю и 1–2 детям?
   → поднять state (lifting state up) или Context

3. Нужны далеко в дереве, переживают route, кэш API?
   → Redux (или React Query для server state + минимальный client slice)

4. Можно вычислить из store?
   → селектор, не дублировать в state
```

## Антипatterns

| Антиpattern | Проблема |
| --- | --- |
| Весь UI в Redux | Шум actions, медленнее разработка |
| Дублировать server data в local state | Рассинхрон с store |
| Хранить derived data (`fullName` из `firstName` + `lastName`) | Лишний источник правды |
| Redux для формы на одной странице | Boilerplate без выигрыша |

## Server state vs client state

Современная практика: **серверные данные** (fetch, cache, invalidation) — React Query / RTK Query; **клиентское UI и cross-cutting state** — Redux slice или Context. Не обязательно всё в один store.

```tsx
// RTK Query — server cache
const { data: posts } = useGetPostsQuery();

// Redux slice — UI client state
const filter = useAppSelector((s) => s.ui.postsFilter);
```

## Связь с React docs

React рекомендует поднимать state к ближайшему общему предку; Redux — когда общий предок слишком высоко или state должен жить вне React-дерева (middleware, persistence, SSR preload).

---

# 6. Ссылки

- [Redux FAQ: Organizing State](https://redux.js.org/faq/organizing-state)
- [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
