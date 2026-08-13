# 1. Тема

**async/await**

---

# 2. Главное в одну фразу

`async` делает функцию возвращающей Promise, `await` внутри неё приостанавливает выполнение до settled промиса, а ошибки ловят `try/catch` или `.catch` у возвращённого промиса.

---

# 3. Суть

> **`async`/`await`** — синтаксис над промисами: `async function` всегда возвращает `Promise` (обычное `return` становится fulfill, `throw` — reject). **`await expr`** ждёт, пока промис (или thenable) settled, и отдаёт значение или бросает ошибку в окружающий `try/catch`. Снаружи это всё те же microtasks, не новый runtime.
>
> Пишут линейно: шаг за шагом как синхронный код, без пирамиды колбэков и без длинной `.then`-цепи. Параллель не забывают: несколько независимых запросов — `Promise.all([a(), b()])` или стартовать промисы до `await`, иначе `await` подряд сериализует работу зря.
>
> Ловушка: `await` **только** внутри `async` (или top-level await в модулях). Забыли `await` — получили промис вместо данных. «Проглоченный» reject без `try/catch` / `.catch` на вызове `async`-функции даёт unhandled rejection. `await` в цикле — осознанная последовательность; для карты независимых задач — `map` + `Promise.all`.

---

# 4. Самое главное запомнить

- `async` → всегда Promise; даже `return 1` → fulfilled `1`.
- `await` разворачивает fulfilled / бросает при rejected.
- Ошибки: `try/catch` внутри или `.catch` на вызове `asyncFn()`.
- Последовательный `await a(); await b();` — если нужен параллелизм, поднимайте промисы раньше.
- Top-level `await` — в ES-модулях, не в обычном скрипте без обёртки.
- `for await...of` — для async-итерируемых потоков (не путать с обычным генератором).

---

# 5. Описание

```text
async f() {
  const x = await promiseA;  // пауза до settled
  const y = await promiseB;
  return x + y;              // → Promise fulfilled
}
f() → Promise
```

## Базовый вид

```js
async function loadPage(id) {
  const user = await fetch(`/api/users/${id}`).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
  return user.name;
}

loadPage(1).catch(console.error);
```

## try/catch

```js
async function run() {
  try {
    const data = await loadPage(1);
    console.log(data);
  } catch (e) {
    console.error('failed', e);
  }
}
```

Эквивалент по смыслу хвостовому `.catch` на промисе `run()`.

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
- [MDN: async function* / for await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- [TC39: Promise / async](https://tc39.es/ecma262/#sec-async-function-definitions)
