# 1. Тема

**Как работают таски и микротаски**

---

# 2. Главное в одну фразу

После каждой macrotask движок полностью опустошает очередь microtasks (`Promise`, `queueMicrotask`), поэтому микротаски всегда обгоняют следующий `setTimeout`, даже с нулевой задержкой.

---

# 3. Суть

> **Task (macrotask)** — единица работы из «большой» очереди: колбэк таймера, событие клика, сообщение с сети в модели браузера и т.п. **Microtask** — более приоритетная очередь: реакции промисов (`then`/`catch`/`finally`), `queueMicrotask`, в браузере ещё MutationObserver.
>
> Правило порядка: взяли одну task → выполнили её синхронный код → **пока microtask-очередь не пуста**, выполняем все microtasks (включая те, что породили новые) → только потом можно render и следующая task. Отсюда классика: `Promise.resolve().then(...)` печатается раньше `setTimeout(..., 0)`.
>
> Ловушка: бесконечная цепочка microtasks (каждый `then` ставит ещё один) не отдаёт управление следующей task и может заморозить UI так же жёстко, как долгий цикл. В Node отдельно стоит `process.nextTick` — ещё раньше обычных microtasks промисов; не смешивать с браузерной моделью без оглядки.

---

# 4. Самое главное запомнить

- Одна macrotask за раз; microtasks — «дочистить всё» после неё.
- `setTimeout` / `setInterval` / UI-события → tasks; `Promise.then` / `queueMicrotask` → microtasks.
- `setTimeout(fn, 0)` не быстрее промиса: ноль — минимальная задержка task, не обход microtasks.
- Новые microtasks, поставленные во время drain, тоже выполняются в этом же раунде.
- Переполнение microtasks блокирует следующую task и отрисовку.
- Node: `process.nextTick` → затем Promise microtasks → фазы loop (уточнять по доке версии).

---

# 5. Описание

```text
task (macrotask) #1
  └─ sync code
  └─ enqueue microtasks…
drain microtasks (все, включая вновь добавленные)
  └─ [browser] render opportunity
task (macrotask) #2
  └─ …
```

## Классический порядок

```js
console.log('1 sync');

setTimeout(() => console.log('4 timeout'), 0);

Promise.resolve().then(() => console.log('3 microtask'));

console.log('2 sync');
// 1 sync → 2 sync → 3 microtask → 4 timeout
```

## queueMicrotask

```js
queueMicrotask(() => console.log('micro'));
// тот же уровень приоритета, что и then (в браузере), без создания Promise
```

Удобно, когда нужен microtask без семантики промиса.

## Вложенные microtasks

```js
Promise.resolve().then(() => {
  console.log('a');
  Promise.resolve().then(() => console.log('b'));
});
setTimeout(() => console.log('c'), 0);
// a, b, затем c
```

Пока drain не закончен, `c` не стартует.

## Ловушка

Не строить «рекурсию» через бесконечный `then`/`queueMicrotask` для анимации или опроса — используйте `requestAnimationFrame` или tasks с паузой, чтобы loop и render дышали.

---

# 6. Ссылки

- [HTML: Performing a microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint)
- [MDN: queueMicrotask()](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
- [MDN: Using microtasks in JavaScript](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [Node.js: process.nextTick](https://nodejs.org/en/learn/asynchronous-work/understanding-processnexttick)
