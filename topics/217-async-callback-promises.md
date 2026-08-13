# 1. Тема

**Callback и Promises**

---

# 2. Главное в одну фразу

Callback — функция «вызови позже»; Promise — объект с состояниями pending/fulfilled/rejected и композицией через `then`/`catch`, который ставит продолжения в microtasks.

---

# 3. Суть

> **Callback** — договор «передай функцию, её вызовут, когда результат готов» (`fs.readFile`, `addEventListener`, старый XHR). Это просто паттерн передачи управления, без единого стандарта ошибок и композиции: легко получить «ад вложенности» и потерянный `err`.
>
> **Promise** — контейнер будущего значения: `pending` → `fulfilled` или `rejected`, состояние меняется один раз. Подписчики через `then` / `catch` / `finally` получают результат асинхронно (как microtasks). Цепочки возвращают новые промисы, поэтому шаги можно склеивать плоско и прокидывать ошибки вниз по цепи.
>
> Ловушка: конструктор `new Promise(executor)` исполняет `executor` **синхронно**; асинхронность — в resolve/reject и в реакциях. «Thenables» (объект с `then`) промисы умеют разворачивать. Не путать колбэк стиля Node `(err, data)` с `reject` — это разные конвенции.

---

# 4. Самое главное запомнить

- Callback = «продолжи этим вызовом»; Promise = значение + состояние + подписки.
- Состояния промиса: `pending` | `fulfilled` | `rejected`; переход однократный.
- `then` всегда возвращает новый промис; можно вернуть значение или другой промис.
- Ошибка в async-колбэке без передачи дальше «глохнет»; у промиса — в `catch` / rejection.
- `Promise.resolve` / `reject` / `all` / `race` / `allSettled` / `any` — инструменты композиции.
- Обернуть callback-API: `new Promise((resolve, reject) => api(cb))`.

---

# 5. Описание

```text
callback style:  doWork(args, (err, value) => { ... })

promise style:   doWork(args) → Promise
                    ├─ fulfilled(value) → then
                    └─ rejected(err)    → catch
```

## Callback

```js
function loadUser(id, cb) {
  setTimeout(() => {
    if (!id) cb(new Error('no id'));
    else cb(null, { id, name: 'Ada' });
  }, 10);
}

loadUser(1, (err, user) => {
  if (err) return console.error(err);
  console.log(user);
});
```

Конвенция Node: первый аргумент — ошибка. Забыли проверить `err` — логическая дыра.

## Promise

```js
function loadUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!id) reject(new Error('no id'));
      else resolve({ id, name: 'Ada' });
    }, 10);
  });
}

loadUser(1)
  .then((user) => user.name)
  .then((name) => console.log(name))
  .catch((err) => console.error(err));
```

## Состояния и синхронный executor

```js
console.log('A');
new Promise((resolve) => {
  console.log('B'); // сразу
  resolve('C');
}).then((v) => console.log(v));
console.log('D');
// A, B, D, C
```

## Композиция (кратко)

- `Promise.all` — все успешны, иначе первая ошибка.
- `Promise.allSettled` — дождаться всех, статусы по каждому.
- `Promise.race` — первый settled.
- `Promise.any` — первый fulfilled (AggregateError, если все reject).

Глубина вложенных колбэков и борьба с ней — тема callback hell; синтаксис `async`/`await` — отдельная тема поверх промисов.

---

# 6. Ссылки

- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [ECMA-262: Promise Objects](https://tc39.es/ecma262/#sec-promise-objects)
- [MDN: Callback function](https://developer.mozilla.org/en-US/docs/Glossary/Callback_function)
