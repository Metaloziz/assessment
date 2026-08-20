# 1. Тема

**Механизм Reconciliation**

---

# 2. Главное в одну фразу

Reconciliation сравнивает новый снимок UI с прошлым, составляет план (UPDATE, MOVE, PLACE, DELETE) и отдаёт его на commit — в **настоящий DOM** попадают только нужные правки, а не пересборка всего блока.

---

# 3. Суть

> После `setState` компонент снова рисует описание экрана — это **render**. **Reconciliation** — следующий шаг: React сравнивает **новый** снимок с **прошлым** и решает, что менять в браузере. Сам он **не пишет** в Real DOM и не «подправляет виртуальный DOM по частям» — только составляет план; запись делает **commit**.
>
> Зачем: render идёт и с React, и без него. Без согласования обычно сносят кусок разметки (`innerHTML`) и собирают заново — даже если изменилась одна цифра. Reconciliation экономит не JSX, а **дорогие операции с настоящим DOM**: оставить тот же узел, сдвинуть его или обновить текст на месте.
>
> Как: совпали **тип** и **`key`** — узел переиспользуют (обновить props/текст или переставить). Другой тип или key — старый снять, новый поставить. В списке стабильный `key={id}` переживает сортировку; `key={index}` после reorder часто «ломает» строки: React смотрит на **места**, а не на задачи. Включается это не флагом, а тем, что UI идёт через React (`createRoot` + state) и вы не переписываете DOM вручную.
>
> Ловушка: Fiber — про очередь и приоритеты работы; reconciliation — про **правила сопоставления** двух снимков внутри этого процесса. «Virtual DOM» в учебниках — снимок после render, а не отдельный слой, который reconciliation «мутирует».

---

# 4. Самое главное запомнить

- **Render** после `setState` идёт всегда; reconciliation **не отменяет** пересчёт компонентов.
- Reconciliation **не трогает Real DOM** — только сравнивает снимки; **commit** пишет в браузер.
- «Virtual DOM» в учебниках = **описание** после render; reconciliation **не мутирует** его — сравнивает prev и next.
- Наивный UI без diff ≈ пересоздать блок; reconciliation умеет обновить текст на месте и переставить тот же узел.
- **Тот же type + тот же `key`** → обновить или сдвинуть; **другой type/key** → снять старое и поставить новое.
- В списках **`key` = кто эта строка**; `key={index}` при reorder → лишние пересоздания и баги с фокусом/state.
- Флага «включить reconciliation» нет: он внутри React (`createRoot` + state); качество — стабильные `type`/`key`, без `innerHTML` в обход.

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

Путаница: reconciliation меняет **настоящий** DOM или сначала **виртуальный**?

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

Ещё одна путаница: без reconciliation можно **только** монтировать и размонтировать, а с reconciliation — **двигать** и **менять содержимое**?

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

Проверить на лабе: кейс **«Витрина · 0→1»** — слева вся карточка витрины новая, справа UPDATE только цифры.

## Как включается механизм

Отдельной кнопки или флага `enableReconciliation` **нет**. Согласование — часть React: оно уже работает, как только UI идёт через React, а не через ручную пересборку DOM.

**Что нужно, чтобы механизм вообще заработал**

1. Собрать дерево через React: `createRoot(...).render(<App />)` (или эквивалент).
2. Менять экран через состояние / props: `setState`, `useState`, обновление родителя — снова `render` → React сам вызовет reconcile → commit.
3. Описывать UI декларативно (JSX / `createElement`), а не переписывать `innerHTML` того же узла вручную.

```jsx
import { createRoot } from 'react-dom/client';
import { useState } from 'react';

const Display = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="display">
      <h1>Булочки на витрине</h1>
      <span>{count}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        ещё
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')).render(<Display />);
```

Здесь после клика React сам сравнит прошлый и новый снимок и в DOM, как правило, попадёт только новая цифра — это и есть включённый reconciliation.

**Что сделать, чтобы он работал «по делу» (не ломал узлы)**

| Действие | Зачем |
| --- | --- |
| В списках `key={order.id}` (стабильный id) | React узнаёт ту же строку при reorder → MOVE |
| Не менять `type` без нужды (`div` ↔ `p`, разные компоненты) | Иначе REPLACE и сброс state/фокуса |
| Не крутить `key` на каждом рендере | Новый key = «это другой узел» → unmount + mount |
| Не дублировать ту же разметку через `innerHTML` / ручной DOM рядом с React | Обходите план React — эффект согласования пропадает |

**Как «выключить» эффект (чего избегать)**

```js
// снова наивный путь — reconciliation React здесь не участвует
root.innerHTML = `<div>...${count}...</div>`;
```

Или в React-коде:

```jsx
// плохой key: при каждом render React считает узел новым
<li key={Math.random()}>{title}</li>
```

Итого: механизм **включается выбором React как способа обновлять UI**; качество работы — стабильной идентичностью (`type` + `key`) и тем, что вы не переписываете DOM в обход.

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
