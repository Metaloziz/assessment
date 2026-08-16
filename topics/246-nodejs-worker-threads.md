# 1. Тема

**Параллелизация через worker_threads**

---

# 2. Главное в одну фразу

CPU-bound работу в Node выносят в `worker_threads`, чтобы основной поток продолжал обрабатывать HTTP и таймеры, а результат приходит через сообщения.

---

# 3. Суть

> В Node ваш JS на основном потоке идёт по одному call stack: долгий синхронный цикл в handler блокирует event loop — параллельные запросы, таймеры и I/O-колбэки ждут, пока стек не опустеет. `async`/`await` тут не помогают: они откладывают продолжение, но не считают на втором ядре.
>
> Модуль `worker_threads` поднимает отдельный поток V8 со своим стеком. Туда передают задачу (`workerData` или `postMessage`), worker считает, затем шлёт результат в `parentPort`. Пока Worker занят, main остаётся свободен принимать `GET`/`POST` и отвечать на лёгкие ping.
>
> Типичный сценарий — тяжёлый разбор, хеш, трансформ картинки внутри HTTP-сервиса: handler создаёт `Worker` (или берёт из пула), ждёт сообщение и отдаёт JSON клиенту.
>
> Ловушка: путать workers с `cluster`/процессами и с Web Workers в браузере — другой API и другая среда. Ещё риск — плодить поток на каждый запрос без лимита и передавать огромные объекты копированием вместо `SharedArrayBuffer`/трансфера, когда это критично.

---

# 4. Самое главное запомнить

- `async` не параллелит CPU на одном потоке; блокирует только sync-работа на call stack.
- `worker_threads` = отдельный поток JS + обмен сообщениями (`postMessage` / `parentPort`).
- Пока Worker считает, **main** может отвечать на другие HTTP-запросы.
- Данные в worker: `workerData` при старте или сообщения после; по умолчанию — structured clone.
- Не путать с `child_process` / `cluster` (отдельные процессы) и с браузерными Web Workers.
- Потоки дороже колбэка: для коротких задач overhead может съесть выигрыш; для длинных CPU — окупается.

---

# 5. Описание

```text
клиент: POST /job (CPU)     +     GET /ping
              │                         │
              ▼                         ▼
         ┌─────────────────────────────────────┐
         │  main thread (event loop)           │
         │                                     │
         │  mode=main:  burn() sync  ──────────┼──► ping ждёт
         │  mode=worker: new Worker ──► thread │
         │       ▲                    считает  │
         │       └──── message ←──────┘        ├──► ping сразу
         └─────────────────────────────────────┘
```

## Зачем не хватает async

Сетевой I/O и таймеры Node отдаёт libuv; колбэк всё равно выполняется на main. Синхронный `for` на миллионы итераций в handler держит стек — другие сокеты не обслуживаются, пока цикл не закончится. `await` между кусками можно нарезать вручную, но сам алгоритм на одном ядре быстрее не станет.

## worker_threads

Минимальный контракт:

```js
import { Worker } from 'node:worker_threads';

const worker = new Worker(new URL('./heavy.js', import.meta.url), {
  workerData: { durationMs: 350 }, // ← вход при старте
});

worker.on('message', (msg) => {
  // ← результат с parentPort
  console.log(msg);
});
```

В файле worker:

```js
import { parentPort, workerData } from 'node:worker_threads';

function burn(ms) {
  const end = performance.now() + ms;
  let x = 0;
  while (performance.now() < end) x = (x + 1) % 1e9;
  return x;
}

parentPort.postMessage({
  checksum: burn(workerData.durationMs), // ← CPU вне main
});
```

Handler HTTP `await`ит Promise вокруг `message`/`error`/`exit` и только потом шлёт ответ. Пока Promise висит, event loop свободен — параллельный `GET /ping` отвечает за миллисекунды.

## Main vs Worker под нагрузкой

| Режим | Где burn | Параллельный ping |
| --- | --- | --- |
| main | sync в handler | ждёт конца job |
| worker | другой поток | отвечает сразу |

В лабе оба режима ходят в учебный API: один и тот же объём CPU, разница видна в latency ping рядом с job.

## Пул и границы

На каждый запрос `new Worker` — просто для демо; в проде чаще пул с очередью и лимитом потоков (число ядер − запас на main). Не всё стоит выносить: короткая работа + сериализация сообщений может быть медленнее sync на main. I/O-bound задачи обычно закрывают async API без workers.

---

# 6. Ссылки

- [Worker threads \| Node.js](https://nodejs.org/api/worker_threads.html)
- [Worker class \| Node.js](https://nodejs.org/api/worker_threads.html#class-worker)
- [workerData / parentPort \| Node.js](https://nodejs.org/api/worker_threads.html#workerworkerdata)
- [Don't Block the Event Loop \| Node.js](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
