# 1. Тема

**Command · Facade · Observer**

---

# 2. Главное в одну фразу

Command упаковывает действие в объект; Facade прячет сложную подсистему за простым API; Observer оповещает подписчиков об изменении без жёсткой связи.

---

# 3. Суть

> Три поведенческо-структурных приёма закрывают частые боли UI и сервисов. **Command** превращает запрос («сохранить», «отменить», «повторить») в объект с методом вроде `execute` — его можно ставить в очередь, логировать, откатывать. **Facade** даёт тонкий «вход» в запутанную подсистему: клиент зовёт один-два метода, а фасад внутри дергает модули в нужном порядке. **Observer** развязывает источник события и слушателей: субъект хранит список подписок и при изменении зовёт их; подписчики не знают друг о друге.
>
> В браузере Observer уже вшит в `addEventListener` / `removeEventListener`. Facade часто выглядит как `checkout.placeOrder()` над корзиной, оплатой и уведомлениями. Command — как объекты undo/redo в редакторе или задачи в очереди воркера.
>
> Ловушка: фасад, который разрастается до God Object; Observer с забытыми отписками и утечками; Command ради Command, когда хватило бы обычной функции без истории и очереди.

---

# 4. Самое главное запомнить

- Command: действие = объект (`execute` / при необходимости `undo`); удобно для истории, очереди, макросов.
- Facade: упрощённый API над несколькими модулями; клиент не знает внутренний порядок вызовов.
- Observer: субъект → список подписчиков → `notify`; подписка и отписка симметричны.
- Observer ≠ прямые вызовы всех UI из модели: связь односторонняя «событие → слушатели».
- Facade не добавляет новую бизнес-логику «ради красоты» — он оркестрирует уже существующую.
- В DOM: `target.addEventListener` — практический Observer; забытый `removeEventListener` / abort — утечка.

---

# 5. Описание

```text
Command:   Invoker  →  Command.execute()  →  Receiver
Facade:    Client   →  Facade.doWork()    →  A, B, C (внутри)
Observer:  Subject  →  notify()           →  Observer1, Observer2, …
```

## Command

**Проблема:** вызов размазан по UI (`if (btn === 'save') …`), нет единого способа отложить, отменить или записать действие в историю.

**Идея:** каждое действие — объект с контрактом выполнения. Invoker (кнопка, очередь) не знает деталей Receiver'а.

```js
// ← COMMAND: действие как объект
function createSaveCommand(doc) {
  let snapshot = null;
  return {
    execute() {
      snapshot = doc.text;
      doc.persist();
    },
    undo() {
      if (snapshot != null) doc.text = snapshot;
    },
  };
}

const history = [];
function run(cmd) {
  cmd.execute();
  history.push(cmd); // ← можно undo позже
}
```

Когда достаточно обычной функции: нет undo, очереди и единого журнала — не усложняйте классами Command.

## Facade

**Проблема:** чтобы оформить заказ, клиент должен знать пять модулей и порядок вызовов; ошибки копируют во все call-site.

**Идея:** один модуль-фасад с понятными методами; внутри — оркестрация.

```js
// подсистема
const cart = { items: () => […] };
const payments = { charge: (sum) => ({ ok: true, sum }) };
const mail = { send: (to, body) => { /* … */ } };

// ← FACADE
export function createCheckoutFacade({ cart, payments, mail }) {
  return {
    placeOrder(user) {
      const items = cart.items();
      const sum = items.reduce((s, i) => s + i.price, 0);
      const pay = payments.charge(sum);
      if (!pay.ok) throw new Error('payment failed');
      mail.send(user.email, `order ${sum}`);
      return { ok: true, sum };
    },
  };
}
```

Фасад **не** заменяет знание домена: он снижает связность клиента с деталями. Если фасад начинает содержать всю бизнес-логику приложения — это уже God Object.

## Observer

**Проблема:** при изменении данных нужно обновить список, бейдж и лог, но модель не должна импортировать каждый виджет.

**Идея:** субъект хранит подписчиков; при изменении вызывает их. Подписчики регистрируются сами.

```js
function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn); // ← отписка
    },
    setState(next) {
      state = next;
      for (const fn of listeners) fn(state); // ← notify
    },
  };
}

const store = createStore({ count: 0 });
const off = store.subscribe((s) => console.log(s.count));
store.setState({ count: 1 });
off();
```

В DOM тот же смысл:

```js
button.addEventListener('click', onClick);
// позже: button.removeEventListener('click', onClick)
// или AbortController.signal
```

## Как не перепутать

| | Command | Facade | Observer |
|---|---|---|---|
| Главный вопрос | *что* выполнить (и откатить)? | *как* упростить вход в подсистему? | *кого* оповестить об изменении? |
| Связь | invoker ↔ command ↔ receiver | client ↔ один фасад | 1 subject → N observers |
| Типичный след в коде | очередь / undo stack | `placeOrder`, `initApp` | `subscribe` / `addEventListener` |

Command упаковывает **действие**; Facade упаковывает **доступ к подсистеме**; Observer упаковывает **рассылку изменений**.

---

# 6. Ссылки

- [Refactoring Guru — Command](https://refactoring.guru/design-patterns/command)
- [Refactoring Guru — Facade](https://refactoring.guru/design-patterns/facade)
- [Refactoring Guru — Observer](https://refactoring.guru/design-patterns/observer)
- [MDN — EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [MDN — AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
