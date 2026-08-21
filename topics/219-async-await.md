# 1. Тема

**async/await**

---

# 2. Главное в одну фразу

`async`/`await` — тот же Promise, но шаги пишутся линейно: `await` ждёт settled, ошибки ловят `try/catch` (или `.catch` у вызова).

---

# 3. Суть

> Когда нужно дождаться ответа сети, можно клеить цепочку `.then`. **`async`/`await`** делает то же самое поверх промисов, но код читается сверху вниз: «подожди ответ → разбери JSON → верни имя», без пирамиды колбэков и без длинной цепочки обработчиков.
>
> Функция с `async` снаружи всегда отдаёт `Promise`: обычный `return` становится fulfill, `throw` — reject. **`await`** внутри ставит паузу до settled и либо отдаёт значение, либо бросает ошибку в окружающий `try/catch`. Runtime тот же: продолжения всё равно уходят в microtasks.
>
> Ловушка: забыли `await` — в руках промис, а не данные. Несколько независимых запросов нельзя просто писать `await` подряд — так они ждут друг друга; для параллели — `Promise.all` или стартовать промисы до ожидания. Reject без `try/catch` / `.catch` на вызове `async`-функции даёт unhandled rejection.

---

# 4. Самое главное запомнить

- `async` → всегда Promise; даже `return 1` → fulfilled `1`.
- `await` разворачивает fulfilled / бросает при rejected.
- Тот же запрос можно писать цепочкой `.then` или линейно через `await` — смысл один.
- Ошибки: `try/catch` внутри или `.catch` на вызове `asyncFn()`.
- Последовательный `await a(); await b();` складывает время; независимые — поднимайте промисы раньше или `Promise.all`.
- Top-level `await` — в ES-модулях, не в обычном скрипте без обёртки.

---

# 5. Описание

```text
.then-цепочка:   fetch → then(json) → then(use) → catch
async/await:     await fetch → await json → return   (+ try/catch)
оба пути → Promise наружу
```

## Один запрос: `.then` и `async/await`

Один и тот же `fetch` можно оформить двумя стилями. Результат снаружи — промис; меняется только читаемость шагов.

```js
// стиль .then
function loadName(id) {
  return fetch(`/api/users/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then((user) => user.name);
}

loadName(1).catch(console.error);
```

```js
// стиль async/await
async function loadName(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(String(res.status));
  const user = await res.json();
  return user.name;
}

loadName(1).catch(console.error);
```

## try/catch

```js
async function run() {
  try {
    const name = await loadName(1);
    console.log(name);
  } catch (e) {
    console.error('failed', e);
  }
}
```

По смыслу это то же, что хвостовой `.catch` на промисе `run()`.

## Параллель vs последовательность

```js
// медленно: второй fetch ждёт первый
const a = await fetchA();
const b = await fetchB();

// быстрее, если независимы
const [a2, b2] = await Promise.all([fetchA(), fetchB()]);
```

Или:

```js
const pa = fetchA();
const pb = fetchB();
const a3 = await pa;
const b3 = await pb;
```

## Ловушка без await

```js
async function broken() {
  const p = fetch('/api'); // забыли await
  return p.ok; // p — Promise, .ok === undefined
}
```

---

# 6. Ссылки

- [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN: await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [MDN: Promise.then](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)
- [TC39: Promise / async](https://tc39.es/ecma262/#sec-async-function-definitions)
