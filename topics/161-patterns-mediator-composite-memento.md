# 1. Тема

**Mediator · Composite · Memento**

---

# 2. Главное в одну фразу

Mediator сводит общение компонентов в один хаб; Composite обрабатывает лист и группу одинаково; Memento сохраняет снимок состояния для отката без раскрытия внутренностей.

---

# 3. Суть

> Три паттерна закрывают разные оси: **кто с кем говорит**, **как обходят дерево**, **как вернуть прошлое**. **Mediator** убирает «каждый знает каждого»: коллеги шлют события в медиатор, а он решает, кого уведомить — типично для виджетов формы, чат-комнат, оркестрации UI. **Composite** даёт общий контракт листу и контейнеру (`render` / `size` / `add`): клиент обходит дерево папок, меню или сцены без `if (isFolder)`. **Memento** снимает opaque-снимок originator'а и отдаёт caretaker'у (undo-стек); восстановить можно, не открывая приватные поля наружу.
>
> В JS/TS медиатор часто — EventBus / Context / маленький store; composite — рекурсивный компонент или дерево узлов с `children`; memento — `{ ...state }` / `structuredClone` плюс стек истории, либо `immer` patches.
>
> Ловушка: Mediator раздувают до «бога-объекта», который знает всё; Composite путают с простым массивом без единого интерфейса; Memento — с публичным `getState()` наружу (это уже не защита инкапсуляции). Не тащить все три «на вырост»: нужен хаб, дерево или undo — тогда паттерн.

---

# 4. Самое главное запомнить

- Mediator: коллеги не знают друг друга; знают только медиатор (или шину событий).
- Composite: лист и композит с одним API; клиент рекурсивно обходит дерево.
- Memento: снимок opaque для caretaker; originator сам создаёт и восстанавливает.
- Mediator ≠ Observer «всем подряд»: медиатор *маршрутизирует* и знает политику связей.
- Composite ≠ просто массив детей без общего контракта с листом.
- Memento ≠ «экспорт всего state в props»: цель — откат без протекания внутренностей.

---

# 5. Описание

```text
Mediator:   A ──┐
            B ──┼──► Mediator ──► C|D  (звёзды, не полный граф)
            C ──┘

Composite:  Folder
            ├── File
            └── Folder
                └── File     ← тот же API: size() / render()

Memento:    Originator ──create──► Memento ──hold──► Caretaker (undo stack)
            Originator ◄──restore── Memento
```

## Mediator

**Проблема:** `FormField` знает `SubmitButton`, `ErrorBanner` и `Preview` — при новой связи правят все участники.

**Идея:** коллеги шлют `notify(event)` в медиатор; медиатор решает, кого дернуть.

```js
// ← MEDIATOR: хаб формы, коллеги не импортируют друг друга
function createFormMediator() {
  let values = {};
  let submitEnabled = false;
  const listeners = new Set();

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    change(name, value) {
      values = { ...values, [name]: value };
      submitEnabled = Boolean(values.email && values.password);
      for (const fn of listeners) fn({ values, submitEnabled }); // ← маршрутизация
    },
  };
}
```

В React ту же роль часто играет Context + reducer или лёгкий EventEmitter на уровне экрана. Отличие от «голого» Observer: медиатор *владеет* правилами «кто на что реагирует», а не только рассылает всем.

## Composite

**Проблема:** UI или ФС — смесь листьев и групп; клиент ветвится `if (node.type === 'folder')`.

**Идея:** и файл, и папка реализуют один контракт; папка делегирует детям.

```js
// ← COMPOSITE: лист и группа с одним size()
const file = (name, bytes) => ({
  name,
  size: () => bytes, // ← leaf
});

const folder = (name, children = []) => ({
  name,
  children,
  size: () => children.reduce((sum, c) => sum + c.size(), 0), // ← recurse
});

const root = folder('src', [
  file('a.ts', 100),
  folder('ui', [file('Button.tsx', 40)]),
]);
root.size(); // 140
```

В React дерево `<MenuItem>` / `<MenuGroup>` с общим `render()` — тот же приём. Ловушка: смешивать «просто children в props» без единого метода — клиент снова пишет `switch` по типу.

## Memento

**Проблема:** нужен Undo / черновик «как было», но наружу нельзя отдавать все приватные поля редактора.

**Идея:** originator сам делает снимок и сам восстанавливает; caretaker хранит стек, не читая содержимое.

```js
// ← MEMENTO: opaque snapshot + caretaker
function createEditor(text = '') {
  let content = text;
  return {
    type(chunk) {
      content += chunk;
    },
    getText: () => content,
    save: () => ({ content }), // ← memento (для caretaker — непрозрачный объект)
    restore(m) {
      content = m.content;
    },
  };
}

function createHistory(limit = 20) {
  const stack = [];
  return {
    push(m) {
      stack.push(m);
      if (stack.length > limit) stack.shift();
    },
    undo(editor) {
      const m = stack.pop();
      if (m) editor.restore(m); // ← caretaker не читает m.content
    },
  };
}

const editor = createEditor('Hello');
const history = createHistory();
history.push(editor.save());
editor.type('!');
history.undo(editor); // снова "Hello"
```

В UI: снимок перед каждым жестом или debounce; `structuredClone` для вложенного state. Не путать с Command: Command хранит *действие*, Memento — *состояние*.

## Как не перепутать

| | Mediator | Composite | Memento |
|---|---|---|---|
| Главный вопрос | *кто* связывает коллег? | *как* обойти часть и целое? | *как* откатить состояние? |
| Связь | звезда через хаб | дерево с общим API | originator ↔ snapshot ↔ caretaker |
| Типичный след | form bus, chat room | FS, меню, сцена | undo, draft restore |

В лабе переключателем разобраны хаб формы, дерево `size()` и undo через снимок.

---

# 6. Ссылки

- [Refactoring Guru — Mediator](https://refactoring.guru/design-patterns/mediator)
- [Refactoring Guru — Composite](https://refactoring.guru/design-patterns/composite)
- [Refactoring Guru — Memento](https://refactoring.guru/design-patterns/memento)
- [MDN — structuredClone()](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
