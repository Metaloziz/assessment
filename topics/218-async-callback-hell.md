# 1. Тема

**Callback hell и методы борьбы с ним**

---

# 2. Главное в одну фразу

Callback hell — пирамида вложенных колбэков с запутанным `err`-потоком; лечат именованными функциями, ранним выходом, Promise-цепочками и библиотеками/утилитами без ухода сразу в синтаксис `await`.

---

# 3. Суть

> **Callback hell** (pyramid of doom) — когда каждый следующий шаг асинхронности вкладывается в колбэк предыдущего: отступы растут, общие переменные текут через замыкания, обработка ошибок копипастится в каждой клетке. Читать и тестировать такой поток трудно, легко пропустить ветку `err`.
>
> Бороться можно ещё на уровне колбэков: **именовать** функции вместо анонимов, делать **early return** при ошибке, выносить шаги в модули, использовать `async`-утилиты в стиле Node (`async.waterfall` и аналоги) или сразу **промисифицировать** API и писать плоскую `.then`-цепь.
>
> Ловушка: «переписать на промисы» само по себе не лечит, если внутри снова вкладывать `then` в `then` без возврата промиса. Плоская цепочка = каждый `then` возвращает следующий промис или значение. Синтаксический сахар `async`/`await` — следующий слой удобства, не единственный способ разгрузить пирамиду.

---

# 4. Самое главное запомнить

- Симптом: вложенность 3+ уровней колбэков + размазанный `if (err)`.
- Именованные функции и early return уже уменьшают ад без смены модели.
- Промисификация: один раз обернуть callback-API, дальше цепочка.
- В `.then` возвращайте промис следующего шага — не открывайте новую пирамиду.
- Общую обработку ошибок — в один хвостовой `catch` у цепи.
- Не смешивать в одном потоке «голые» колбэки и промисы без явной границы.

---

# 5. Описание

```text
плохо:  step1(cb1(step2(cb2(step3(cb3(...))))))   ← пирамида

лучше:  step1
          → step2
          → step3
        (имена / Promise chain / утилита потока)
```

## Пирамида

```js
loadUser(id, (err, user) => {
  if (err) return fail(err);
  loadOrders(user.id, (err, orders) => {
    if (err) return fail(err);
    loadInvoice(orders[0], (err, invoice) => {
      if (err) return fail(err);
      render(invoice);
    });
  });
});
```

## Именованные шаги

```js
function onUser(err, user) {
  if (err) return fail(err);
  loadOrders(user.id, onOrders);
}
function onOrders(err, orders) {
  if (err) return fail(err);
  loadInvoice(orders[0], onInvoice);
}
function onInvoice(err, invoice) {
  if (err) return fail(err);
  render(invoice);
}
loadUser(id, onUser);
```

Стек в отладчике читается яснее, проще тестировать куски.

## Плоская Promise-цепь

```js
loadUser(id)
  .then((user) => loadOrders(user.id))
  .then((orders) => loadInvoice(orders[0]))
  .then((invoice) => render(invoice))
  .catch(fail);
```

Каждый шаг — функция, возвращающая промис. Ошибки стекаются в `catch`.

## Практические приёмы

- `util.promisify` (Node) для `(err, value)`-API.
- Не передавать «сырой» колбэк в середину `.then` без обёртки.
- Ограничить фан-аут: параллель через `Promise.all`, не через вложенные тройные колбэки.

`async`/`await` разберём отдельно: это читаемый синтаксис **над** промисами, а не замена понимания колбэков и цепочек.

---

# 6. Ссылки

- [MDN: Promise (chaining)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#chaining)
- [Node.js: util.promisify](https://nodejs.org/api/util.html#utilpromisifyoriginal)
- [MDN: Callback function](https://developer.mozilla.org/en-US/docs/Glossary/Callback_function)
- [Node.js: Asynchronous flow control](https://nodejs.org/en/learn/asynchronous-work/asynchronous-flow-control)
