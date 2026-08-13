# 1. Тема

**Бесконечные циклы функциями-генераторами**

---

# 2. Главное в одну фразу

Бесконечный генератор крутит `while (true)` с `yield`, отдавая значения лениво по запросу `.next` / `for...of`, а остановку обеспечивает потребитель через `break`, `.return()` или внешний лимит — иначе цикл потребления зависнет.

---

# 3. Суть

> Генератор с **бесконечным** циклом (`while (true) { yield ... }`) не зависает в момент создания: тело продвигается только когда потребитель просит следующий элемент. Так делают id-последовательности, циклические буферы, бесконечные потоки чисел Фибоначчи — без выделения гигантского массива.
>
> Опасность не в `function*`, а в **потреблении**: `for (const x of infinite())` без `break` или лимита крутится вечно на call stack. Корректные паттерны: взять N элементов, `break` по условию, `it.return()` для закрытия (сработает `finally` внутри генератора), обернуть в функцию `take(n, iterable)`.
>
> Ловушка: бесконечный генератор ≠ фоновый поток и ≠ async-стрим. Пока вы в `for...of` без паузы, UI блокируется так же, как обычным циклом. Для «подкачки» по времени сочетают генератор с event loop (`await` в async-генераторе или порции + `setTimeout`) — это уже другой слой; здесь фокус на ленивой синхронной бесконечности и её остановке.

---

# 4. Самое главное запомнить

- `while (true) + yield` безопасен, пока `.next` вызывают конечное число раз.
- `for...of` по бесконечному итерируемому нужен `break` / условие выхода.
- `.return()` закрывает генератор и даёт шанс `finally` освободить ресурс.
- Утилита `take(n, it)` — явный конечный префикс бесконечного потока.
- Не материализовать `[...infinite()]` — зависание или OOM.
- Бесконечный sync-цикл потребления блокирует main thread.

---

# 5. Описание

```text
function* ids() {
  let n = 1;
  while (true) yield n++;
}

ids() ──next──► 1
      ──next──► 2
      ──next──► 3  … пока просят
потребитель: break / return / take(N)
```

## Пример: id и Фибоначчи

```js
function* ids(start = 1) {
  let n = start;
  while (true) {
    yield n++;
  }
}

function* fib() {
  let a = 0;
  let b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
```

## Безопасное потребление

```js
function take(n, iterable) {
  return {
    *[Symbol.iterator]() {
      let i = 0;
      for (const x of iterable) {
        if (i++ >= n) break;
        yield x;
      }
    },
  };
}

console.log([...take(5, ids())]); // [1,2,3,4,5]
```

```js
const it = ids();
for (const id of it) {
  console.log(id);
  if (id >= 3) break; // иначе вечный цикл
}
it.return(); // закрыть, если ещё нужен finally внутри
```

## finally при закрытии

```js
function* locked() {
  console.log('open');
  try {
    while (true) yield 'tick';
  } finally {
    console.log('close');
  }
}

const g = locked();
g.next();
g.return(); // → close
```

## Ловушка

```js
// не делать:
// for (const x of ids()) process(x);
// [...fib()];
```

Без внешнего стопа это вечная синхронная работа на стеке.

---

# 6. Ссылки

- [MDN: Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
- [MDN: Generator.prototype.return()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/return)
- [MDN: for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)
- [ECMA-262: Generator abstract operations](https://tc39.es/ecma262/#sec-generator-abstract-operations)
