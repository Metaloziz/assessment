# 1. Тема

**Механизм Event loop**

---

# 2. Главное в одну фразу

Event loop — цикл хоста, который при пустом call stack забирает задачи из очередей и отдаёт их на стек, связывая синхронный JS с таймерами, I/O, microtasks, `requestAnimationFrame` и отрисовкой.

---

# 3. Суть

> **Event loop** — не часть синтаксиса JavaScript, а механизм **среды** (браузер по HTML, Node со своим циклом): пока call stack пуст, цикл смотрит очереди задач и запускает следующий колбэк.
>
> Без цикла страница «застыла» бы после первого синхронного скрипта: клики, `setTimeout`, ответы сети, кадры анимации попадают в JS **между** синхронными кусками, когда стек опустел — не параллельно текущей функции.
>
> Один оборот: проверить, пуст ли стек → взять готовую task из очереди → выполнить callback → **дочистить** microtasks (`Promise.then`, `queueMicrotask`) → при необходимости кадр (`requestAnimationFrame` + paint) → следующая task. Таймеры и I/O регистрируются в Web APIs / libuv; по готовности callback попадает в очередь, а не на стек сразу.
>
> Ловушка: event loop **не** ускоряет CPU и **не** создаёт потоки для вашего кода. Бесконечная цепочка microtasks или долгий sync **голодают** следующие tasks и отрисовку. Reject без `catch` / обработчика даёт **unhandled rejection**. Приоритеты task vs microtask подробнее — соседняя тема; цепочка после `catch` — отдельная.

---

# 4. Самое главное запомнить

- Event loop работает, когда call stack пуст; занятый стек = цикл ждёт.
- После каждой task — полный drain microtasks; потом возможен render / `requestAnimationFrame`.
- Голодание: бесконечные microtasks или длинный sync не дают дойти до следующей task и paint.
- `queueMicrotask(fn)` — тот же приоритет, что реакции промиса, без создания Promise.
- Reject без обработчика → unhandled rejection (событие / предупреждение среды).
- После `catch`, вернувшего значение, цепочка снова fulfilled; чтобы ошибка жила — `throw` / `reject`.
- Node: свой цикл (`libuv` + phases); идея «очередь → колбэк на стек» та же, фазы другие.

---

# 5. Описание

```text
┌─ call stack (синхронный JS) ─┐
│         ↑ run callback         │
└─────────┼──────────────────────┘
          │ stack empty?
          ▼
   event loop ──► task queue ──► взять одну task
          │
          └──► microtask queue → drain (все, включая новые)
          └──► (браузер) rAF callbacks → style/layout/paint
          └──► следующая task …
```

## Связка с Web APIs

```js
console.log('A');
setTimeout(() => console.log('C'), 0);
console.log('B');
// A, B, затем C — когда стек пуст и дошла task таймера
```

`setTimeout` не кладёт `C` на стек сразу: таймер в хосте, по истечении — task в очередь, loop подхватит.

## Голодание (starvation)

**Голодание** — когда один тип работы так плотно занимает цикл, что другой почти не выполняется.

1. **Microtasks голодают tasks и UI.** Пока drain не закончен, следующая macrotask и кадр не стартуют. Цепочка `then` → новый `then` → ещё `then` без паузы — UI «замёрз», таймеры стоят.

```js
function flood() {
  Promise.resolve().then(flood); // никогда не отдаёт управление task/render
}
flood();
```

2. **Долгий sync голодает всё.** `while` на секунды или тяжёлый расчёт на стеке: очереди копятся, loop ждёт пустого стека.

3. **Частые тяжёлые tasks** тоже душат render: каждая task короткая, но между ними мало «воздуха» для кадра.

Лечение: дробить работу (`setTimeout` / `scheduler`, порции), для анимации — `requestAnimationFrame`, не крутить опрос через бесконечный `queueMicrotask`.

## requestAnimationFrame

В браузере колбэк `requestAnimationFrame` привязан к **кадру отрисовки**, а не к таймерной task-очереди как `setTimeout`.

Типичный порядок после task: drain microtasks → (если пора рисовать) колбэки rAF → стиль / layout / paint. Поэтому:

- `Promise.then` / `queueMicrotask` обычно успевают **до** rAF в том же «обороте»;
- `setTimeout(0)` — отдельная task, может уехать **после** кадра;
- rAF удобен для синхронизации с монитором (~60 Hz), не для «выполнить как можно раньше любой ценой».

```js
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('micro'));
requestAnimationFrame(() => console.log('raf'));
// часто: micro → raf → timeout (точное место timeout зависит от нагрузки и браузера)
```

Практика — плавное смещение элемента на один кадр за раз. В колбэк приходит timestamp; шаг считают от него, а не «магические 16 ms». Пока вкладка в фоне, браузер реже вызывает rAF — в отличие от `setInterval`, который может тикать впустую.

```js
const box = document.querySelector('.box');
let x = 0;
let rafId = 0;

function tick(now) {
  x += 2; // или: скорость * (now - prev) / 1000
  box.style.transform = `translateX(${x}px)`;
  if (x < 200) rafId = requestAnimationFrame(tick);
}

rafId = requestAnimationFrame(tick);
// остановить: cancelAnimationFrame(rafId);
```

Так правки DOM совпадают с готовящимся кадром: меньше лишних layout между отрисовками. Для «просто подождать чуть-чуть» без анимации обычно хватает `setTimeout` / microtask — rAF здесь ни к чему.

В Node классического rAF нет — там другие фазы цикла.

## queueMicrotask

```js
queueMicrotask(() => console.log('micro'));
// тот же уровень, что then, без объекта Promise
```

Ставит функцию в microtask-очередь напрямую. Удобно, когда нужен «после текущего sync, до следующей task», но семантика промиса не нужна. Новые microtasks, поставленные во время drain, выполняются в **этом же** раунде — отсюда риск голодания. Подробный порядок task/microtask — тема «таски и микротаски».

## Unhandled rejection

Если промис перешёл в `rejected`, а к моменту microtask checkpoint **нет** обработчика отклонения (`catch` / второй аргумент `then` / `await` в `try`), среда считает rejection **необработанным**.

В браузере: событие `unhandledrejection` на `window` (можно залогировать; `preventDefault` — подавить дефолтный шум консоли). Позже повесили `catch` — может прийти `rejectionhandled`. В Node — похожие события на `process`, плюс политика «падение / предупреждение» зависит от версии и флагов.

```js
Promise.reject(new Error('boom')); // нет catch → unhandled rejection

window.addEventListener('unhandledrejection', (e) => {
  console.warn('unhandled', e.reason);
});
```

`async`-функция без `await`/`catch` на вызове — тот же класс проблем: наружу уходит rejected Promise.

## Особенности цепочек callback-ов

Вложенные колбэки и промис-цепочка попадают в loop **по-разному**.

```js
// каждый setTimeout — своя macrotask; между ними возможны другие tasks и render
setTimeout(() => {
  setTimeout(() => {
    setTimeout(() => console.log('deep'), 0);
  }, 0);
}, 0);
```

```js
// каждый then — microtask; вся «глубина» часто в одном drain после текущей task
Promise.resolve()
  .then(() => Promise.resolve())
  .then(() => Promise.resolve())
  .then(() => console.log('flat chain'));
```

Смесь: колбэк таймера (task) внутри ставит `then` — microtasks отработают **сразу после этой** task, до следующего таймера. Порядок «сначала весь sync колбэка, потом его microtasks, потом чужие tasks» важен при отладке гонок и логов.

Конструктор `new Promise(executor)` выполняет `executor` **синхронно**; в очередь уходят только реакции (`then`/`catch`) и явный `queueMicrotask`.

## Promise после отлавливания ошибки

Reject «скатывается» по цепочке, пока не встретит `catch` (или `onRejected`). Обработчик по умолчанию **восстанавливает** поток: вернули значение → дальше снова fulfilled.

```js
Promise.reject(new Error('fail'))
  .catch((err) => {
    console.warn(err.message);
    return { ok: false }; // recovery
  })
  .then((data) => {
    console.log(data); // { ok: false } — это уже не reject
  });
```

Чтобы ошибка осталась ошибкой для хвоста: `throw err` или `return Promise.reject(err)` внутри `catch`. Пустой `catch (() => {})` глотает сбой и маскирует unhandled rejection — цепочка «успешна», UI может пойти по неверной ветке. Глубина recovery/rethrow — тема «цепочка Promise после catch».

## Браузер vs Node (граница темы)

В браузере спецификация завязана на HTML event loops и rendering (`rAF`, paint). В Node цикл фазовый (`timers` → `poll` → `check` …), плюс `process.nextTick` ещё до обычных Promise microtasks. Не переносить дословно «как в Chrome» на `setImmediate` / `nextTick` без проверки доки Node.

## Что смотреть в практике

- Long tasks на Performance: одна огромная task блокирует loop.
- Готовый `setTimeout(0)` не стартует, пока синхронный код держит стек — типичный симптом занятого loop.
- В консоли: unhandled rejection при «потерянном» `catch`.
- Не путать event loop с многопоточностью Workers.

## Ловушка

`while(true) {}` убивает loop навсегда на этом потоке: очередь растёт, колбэки не стартуют. Медленный синхронный код и бесконечный microtask-flood — та же болезнь в разных обличьях.

---

# 6. Ссылки

- [MDN: Concurrency model and the event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [HTML: Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [MDN: Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: Promise rejection events](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#promise_rejection_events)
- [MDN: queueMicrotask()](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
- [Jake Archibald: In the loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0)
