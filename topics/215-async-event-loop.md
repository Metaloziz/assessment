# 1. Тема

**Механизм Event loop**

---

# 2. Главное в одну фразу

Event loop — цикл хоста, который при пустом call stack забирает задачи из очередей и отдаёт их на выполнение, связывая синхронный JS с таймерами, I/O и отрисовкой.

---

# 3. Суть

> **Event loop** — не часть синтаксиса JavaScript, а механизм **среды** (браузер по HTML, Node со своим циклом): пока call stack пуст, цикл смотрит очереди задач и запускает следующий колбэк.
>
> Без цикла страница «застыла» бы после первого синхронного скрипта: клики, `setTimeout`, ответы сети попадают в JS **между** синхронными кусками, когда стек опустел — не параллельно текущей функции.
>
> Один оборот: проверить, пуст ли стек → взять готовую task из очереди → выполнить callback на стеке → повторить. Таймеры и I/O регистрируются в Web APIs / libuv; по готовности callback попадает в очередь, а не на стек сразу.
>
> Ловушка: event loop **не** ускоряет CPU и **не** создаёт потоки для вашего кода. Он только планирует, *когда* снова войти в JS. Приоритеты task vs microtask — соседняя тема; здесь — роль цикла как оркестратора stack ↔ queues ↔ APIs.

---

# 4. Самое главное запомнить

- Event loop работает, когда call stack пуст; занятый стек = цикл ждёт.
- Источники задач: таймеры, I/O, UI-события, парсинг скриптов и т.д. (зависит от среды).
- После task цикл переходит к другим очередям (microtasks — в соседней теме); затем возможен render.
- Node: свой цикл (`libuv` + phases); идея «очередь → колбэк на стек» та же, фазы другие.
- «Асинхронный API» = зарегистрировать работу снаружи + поставить колбэк в очередь.
- Долгая task задерживает следующие задачи из очереди и отрисовку.

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
          └──► (после task) microtask queue → drain
          └──► (браузер) render / paint при необходимости
```

## Связка с Web APIs

```js
console.log('A');
setTimeout(() => console.log('C'), 0);
console.log('B');
// A, B, затем C — когда стек пуст и дошла task таймера
```

`setTimeout` не кладёт `C` на стек сразу: таймер в хосте, по истечении — task в очередь, loop подхватит.

## Браузер vs Node (граница темы)

В браузере спецификация завязана на HTML event loops и rendering. В Node цикл фазовый (`timers` → `poll` → `check` …). Не переносить дословно «как в Chrome» на `process.nextTick` / `setImmediate` без проверки доки Node.

## Что смотреть в практике

- Long tasks на Performance: одна огромная task блокирует loop.
- Готовый `setTimeout(0)` не стартует, пока синхронный код держит стек — типичный симптом занятого loop.
- Не путать event loop с многопоточностью Workers.

## Ловушка

`while(true) {}` убивает loop навсегда на этом потоке: очередь растёт, колбэки не стартуют. Медленный синхронный код — та же болезнь в мягкой форме.

---

# 6. Ссылки

- [MDN: Concurrency model and the event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [HTML: Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Node.js: The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Jake Archibald: In the loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0)
