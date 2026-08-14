# 1. Тема

**Жизненный цикл компонента**

---

# 2. Главное в одну фразу

Жизненный цикл — этапы появления, обновления и исчезновения компонента на экране: от первого render/mount через обновления по props/state до unmount и очистки.

---

# 3. Суть

> У каждого экземпляра компонента на дереве есть **жизненный цикл**: его создали и вставили в DOM (**mount**), он получил новые props или state и перерисовался (**update**), его убрали с дерева (**unmount**). В классовых компонентах эти фазы отражены методами вроде `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`. В функциях те же смыслы выражают render-тело и `useEffect` (и реже `useLayoutEffect`).
>
> Зачем модель цикла: внешние ресурсы нужно подключать *после* появления на экране и обязательно отпускать при уходе — таймеры, WebSocket, подписки на store, фокус. Иначе будут утечки и «setState на размонтированном» компоненте. Обновления — место синхронизировать документ / сторонний виджет с новыми props.
>
> Упрощённо для функции: каждый render — чистый расчёт UI; эффекты с зависимостями бегут *после* отрисовки и могут вернуть cleanup, который сработает перед следующим таким эффектом или при unmount. Смена `key` у элемента сбрасывает state и запускает цикл «как с нуля».
>
> Ловушка: устаревшие методы `componentWillMount` / `UNSAFE_*` и логика «загрузки» прямо в конструкторе. В Strict Mode в разработке React намеренно монтирует → размонтирует → монтирует снова, чтобы поймать отсутствующий cleanup — эффект с пустым `[]` может вызваться дважды, это не баг продакшена сам по себе.

---

# 4. Самое главное запомнить

- Фазы: mount → update(ы) → unmount; у каждой своя работа с внешним миром.
- Render должен быть чистым; побочные эффекты — в `useEffect` / lifecycle-методах после commit.
- Cleanup при unmount (и перед повтором эффекта) обязателен для подписок и таймеров.
- Классы: `DidMount` / `DidUpdate` / `WillUnmount`; функции: эффекты + зависимости.
- Смена `key` = новый экземпляр (новый state, новый mount).
- Strict Mode в dev дважды вызывает mount/effect — проверяй идемпотентность и cleanup.

---

# 5. Описание

```text
создание → render → commit (DOM) → mount-эффекты
                ↑                      │
                └── update ← props/state изменились
                                      │
                                 unmount → cleanup
```

## Классовый компонент (классическая карта)

| Фаза | Методы (современный минимум) |
| --- | --- |
| Mount | `constructor` → `render` → `componentDidMount` |
| Update | `render` → `componentDidUpdate` |
| Unmount | `componentWillUnmount` |

```jsx
class Watch extends React.Component {
  componentDidMount() {
    this.id = setInterval(() => this.tick(), 1000);
  }
  componentWillUnmount() {
    clearInterval(this.id);
  }
  // …
}
```

`getDerivedStateFromProps` / `shouldComponentUpdate` / `getSnapshotBeforeUpdate` — узкие случаи; для нового кода чаще достаточно функций и мемоизации.

## Функциональный компонент

```jsx
function Watch() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <time>{new Date(now).toLocaleTimeString()}</time>;
}
```

| Класс | Близкий смысл на хуках |
| --- | --- |
| `componentDidMount` | `useEffect(() => { … }, [])` |
| `componentDidUpdate` | `useEffect(() => { … }, [dep])` |
| `componentWillUnmount` | функция cleanup из `useEffect` |

Точное совпадение не всегда один-в-один: один эффект с deps закрывает и mount, и последующие обновления при смене deps.

## Что делать на фазах

| Фаза | Типичные задачи |
| --- | --- |
| Mount | fetch, подписка, измерение DOM, фокус |
| Update | реакция на смену `id`, синхрон с плагином jQuery/карты |
| Unmount | `clearInterval`, `removeEventListener`, abort `fetch` |

## Render ≠ «момент в DOM»

1. **Render** — вызвать компонент, получить дерево элементов (может быть прерван/повторён планировщиком).
2. **Commit** — применить изменения к DOM.
3. **Effects** — `useEffect` после paint; `useLayoutEffect` после DOM, до paint.

Не читать layout и не трогать внешние системы прямо в теле функции во время render (кроме безопасных вычислений).

## Сброс через `key`

```jsx
<Editor key={documentId} documentId={documentId} />
```

При смене `documentId` React уничтожит старый `Editor` (unmount + cleanup) и смонтирует новый с чистым state — часто проще, чем вручную сбрасывать поля в `useEffect`.

## Strict Mode и двойной mount

В разработке React 18+ для выявления небезопасных эффектов может выполнить mount → unmount → mount. Если подписка без cleanup — увидишь дубли. Пиши эффекты так, чтобы cleanup всегда отменял работу setup.

---

# 6. Ссылки

- [React — Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React — `Component` reference](https://react.dev/reference/react/Component)
- [React — Strict Mode](https://react.dev/reference/react/StrictMode)
