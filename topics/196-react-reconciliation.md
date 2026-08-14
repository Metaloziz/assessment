# 1. Тема

**Механизм Reconciliation**

---

# 2. Главное в одну фразу

Reconciliation сравнивает новый снимок UI с прошлым, составляет план (UPDATE, MOVE, PLACE, DELETE) и отдаёт его на commit — в **настоящий DOM** попадают только нужные правки, а не пересборка всего блока.

---

# 3. Суть

> **Reconciliation** — этап **после** `render`: React уже построил **новое** дерево элементов (JS-описание UI) и теперь сопоставляет его с **прошлым** снимком. Сам reconciliation **не пишет в браузерный DOM** и не «обновляет виртуальный DOM по частям» — он только решает, *что сделать* с Real DOM на следующем шаге — **commit**.
>
> Цепочка: `setState` → **render** (новый снимок) → **reconcile** (сравнение, план) → **commit** (запись в Real DOM). Render в обоих «мирах» — с React и без — всё равно происходит; reconciliation экономит не JSX, а **дорогие операции с настоящим DOM**.
>
> **Без** автоматического согласования типичен наивный путь: `innerHTML` или замена поддерева — для браузера это почти всегда «снести старое, создать новое». Отдельно **переставить тот же узел** (MOVE) или **обновить текст на месте** (UPDATE) такой подход не выделяет. Reconciliation умеет **UPDATE** (тот же узел, другие props/текст), **MOVE** (тот же узел, другой порядок), **PLACE/DELETE** (mount/unmount) и **REPLACE** (другой `type` или `key` → unmount + mount).
>
> Правила на одном уровне дерева: совпали **тип** и **`key`** → переиспользование узла; в списках стабильный `key={id}` переживает reorder, `key={index}` после сортировки часто даёт REPLACE — React сравнивает **слоты**, а не сущности. Fiber — отдельный слой (очередь работы); reconciliation — **правила сопоставления** двух снимков внутри этого процесса.

---

# 4. Самое главное запомнить

- **Render** после `setState` идёт всегда; reconciliation **не отменяет** пересчёт компонентов.
- Reconciliation **не трогает Real DOM** — только сравнивает снимки; **commit** пишет в браузер.
- «Virtual DOM» в учебниках = **описание** после render; reconciliation **не мутирует** его — сравнивает prev и next.
- Наивный UI без diff ≈ пересоздать блок; reconciliation даёт **UPDATE** и **MOVE**, не только mount/unmount.
- **Тот же type + тот же `key`** → UPDATE или MOVE; **другой type/key** → REPLACE (unmount + mount).
- В списках **`key` = идентичность строки**; `key={index}` при reorder → лишний REPLACE и баги с фокусом/state.
- Reconciliation ≠ Virtual DOM (снимок) и ≠ Fiber (планировщик).

---

# 5. Описание

```text
setState / новые props
        ↓
   render()  →  новое дерево элементов (JS-снимок)
        ↓
reconcile()  →  сравнить с прошлым снимком → план
        ↓
   commit()  →  запись в Real DOM
```

## Куда попадают изменения: снимок, план, Real DOM

Частый вопрос: reconciliation меняет **настоящий** DOM или сначала **виртуальный**?

| Этап | Где работа | Что происходит |
| --- | --- | --- |
| **render** | JS, в памяти | Компоненты возвращают **новый снимок** — объекты React element (`type`, `props`, `children`). Это не `HTMLElement` в браузере. |
| **reconciliation** | JS, внутри React | Сравнение **прошлого** и **нового** снимка. Результат — **план**: UPDATE, MOVE, PLACE, DELETE, REPLACE. |
| **commit** | Real DOM | План **применяется** к браузеру: `textContent`, атрибуты, `insertBefore`, удаление узлов. |

Reconciliation **не** «сначала правит виртуальный DOM, потом копирует в настоящий». Virtual DOM — удобное название для **снимка-описания** после `render`. Алгоритм **сопоставляет два описания** и решает, что записать в Real DOM на commit. Если снимки совпали — commit может **ничего не писать**.

```text
  render              reconcile                 commit
─────────────       ───────────────       ─────────────────
новый снимок   →    prev ↔ next        →    правки Real DOM
(объекты в JS)      (только план)          (браузерный DOM)
```

Подробнее про роль снимка — тема **Virtual DOM**; здесь — что React делает **между** render и DOM.

## Только mount/unmount или ещё UPDATE и MOVE?

Второй частый вопрос: без reconciliation можно **только** монтировать и размонтировать, а с reconciliation — **двигать** и **менять содержимое**?

**Почти так**, если речь о **наивном UI** (как в таблице ниже): при `innerHTML` или полной замене поддерева браузер видит в основном **удаление старых узлов и создание новых**. Отдельной операции «переставить **тот же** `li`» или «обновить **только** текст `span`» такой код не выделяет.

| Что нужно | Наивно (без diff) | С reconciliation |
| --- | --- | --- |
| Поменять текст в одном `span` | Часто пересобрать весь `div` / список | **UPDATE** — тот же DOM-узел |
| Переставить строки списка | Пересоздать все `li` | **MOVE** — те же узлы, другой порядок |
| Новый элемент в списке | Пересборка | **PLACE** (mount) |
| Элемент исчез | Пересборка | **DELETE** (unmount) |
| `div` → `p` или другой `key` | Старый удалён, новый создан | **REPLACE** — осознанно, только эта ветка |

Уточнение: **вручную** без React можно вызвать `textContent = …` или `insertBefore` — это patch/move «в лоб». Reconciliation — **автоматический** выбор операции после каждого `render`, чтобы не переписывать DOM целиком и **сохранить идентичность узла**, где элемент «тот же» (`type` + `key`).

## Без reconciliation и с ним

**Без** механизма согласования — типичный путь при любом изменении **снести кусок разметки и собрать заново**:

```js
// любой setCount → весь блок новый
root.innerHTML = `
  <div class="card">
    <h1>Счётчик</h1>
    <span>${count}</span>
    <button type="button">+1</button>
  </div>
`;
```

Меняется одна цифра — пересоздаются `div`, `h1`, `span`, `button`. Теряются фокус, выделение текста, обработчики на кнопке; браузер чаще делает лишний layout/paint.

**С** reconciliation после того же `render` в Real DOM уходит **короткий список** — например, одна запись текста в `span`.

```text
БЕЗ reconciliation          С reconciliation
──────────────────          ──────────────────
state изменился             state изменился
     ↓                           ↓
render (новое описание)     render (новое описание)
     ↓                           ↓
innerHTML / замена…         reconcile(prev, next)
     ↓                           ↓
Real DOM пересоздан         commit: UPDATE / MOVE / …
целиком или большим куском
```

Проверить на лабе: кейс **«Счётчик · 0→1»** — слева все узлы новые, справа UPDATE только `span`.

## Правила на одном уровне

React не ищет «лучшее» соответствие между любыми ветками — только между **детьми одного родителя**, слева направо.

| Ситуация | Решение |
| --- | --- |
| Тип и `key` совпали | **Update** — тот же fiber/DOM-узел, diff props, сверить детей |
| Тип или `key` другие | **Replace** — delete + place (unmount + mount) |
| Только порядок при тех же `key` | **Move** — переупорядочить без пересоздания |

```js
function reconcileSingle(prev, next) {
  if (prev == null) return 'PLACE';
  if (next == null) return 'DELETE';
  if (prev.type !== next.type) return 'REPLACE';
  if (prev.key !== next.key) return 'REPLACE';
  return 'UPDATE';
}
```

## `key` в списках

```jsx
items.map((item) => <Row key={item.id} item={item} />);
items.map((item, i) => <Row key={i} item={item} />); // опасно при reorder
```

С `key={item.id}` узел **B** остаётся узлом **B** — **MOVE**. С `key={i}` React сопоставляет слот 0 со слотом 0: было A, стало B → **REPLACE**.

## Смена типа = новый узел

```jsx
{done ? <p className="ok">Готово</p> : <div className="draft">Черновик</div>}
```

`div` ↔ `p` — не «обновить tag», а **REPLACE** поддерева: state, ref, фокус сбрасываются.

## Связь с Virtual DOM и Fiber

| Слой | Роль |
| --- | --- |
| Virtual DOM / elements | JS-описание UI после `render` |
| **Reconciliation** | Сопоставление prev/next → **план** |
| **Commit** | Применение плана к **Real DOM** |
| Fiber | Единица работы, очередь, приоритеты |

## Что проверить в коде

- DevTools: после reorder — DOM-узлы **пересоздались** (мигает subtree) или только **сменился порядок**.
- Условный рендер разных тегов — ожидать сброс state; при необходимости `key` на границе состояния.
- Список с `key={index}` и вставкой в начало — «ломаются» input/checkbox внутри строк.

---

# 6. Ссылки

- [React — Render and Commit](https://react.dev/learn/render-and-commit)
- [React — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React — Rendering Lists](https://react.dev/learn/rendering-lists) — `key` и идентичность
- [React — Understanding Your UI as a Tree](https://react.dev/learn/understanding-your-ui-as-a-tree)
- [React (legacy) — Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) — эвристики diff
