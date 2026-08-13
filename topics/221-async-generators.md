# 1. Тема

**Функции-генераторы**

---

# 2. Главное в одну фразу

`function*` возвращает итератор: выполнение идёт кусками до каждого `yield`, а снаружи шагают через `.next(value)`, связывая generator с протоколом iterable/iterator.

---

# 3. Суть

> **Генератор** — функция с `function*` и оператором `yield`: при вызове она **не** выполняет тело сразу, а отдаёт объект-итератор. Каждый `.next()` продвигает тело до следующего `yield` (или до `return`) и возвращает `{ value, done }`. Снаружи это ленивая последовательность значений; внутри — пауза с сохранением локального состояния.
>
> Зачем: итерация больших/бесконечных последовательностей без массива в памяти, кастомные итерируемые объекты (`for...of` зовёт итератор), сопрограммы в пользовательском коде (передача значения *внутрь* через `.next(x)` после `yield`). Это синхронный механизм пауз, не замена промисам.
>
> Ловушка: не путать с **async generator** (`async function*` / `for await...of`) — там `yield` промисов и другой протокол. Обычный генератор при необработанном `throw` внутри и при `.throw(err)` снаружи подчиняется обычным правилам исключений. После `done: true` генератор завершён.

---

# 4. Самое главное запомнить

- `function*` + `yield`; вызов → iterator, не результат тела.
- `.next()` → `{ value, done }`; `done: true` после финального `return` / конца.
- Генератор — и iterable, и iterator (обычно); работает с `for...of`.
- `.next(arg)` передаёт `arg` как результат текущего `yield`.
- `.throw` / `.return` — вмешательство снаружи в ход генератора.
- Это не async I/O само по себе; для потоков промисов — async generators / промисы.

---

# 5. Описание

```text
function* g() { yield 1; yield 2; return 3; }

g() → iterator
  .next() → { value: 1, done: false }
  .next() → { value: 2, done: false }
  .next() → { value: 3, done: true }
```

## Базовый пример

```js
function* range(from, to) {
  for (let i = from; i <= to; i++) {
    yield i;
  }
}

for (const n of range(1, 3)) {
  console.log(n); // 1, 2, 3
}
```

## Двусторонняя связь

```js
function* dialog() {
  const name = yield 'как тебя зовут?';
  return `привет, ${name}`;
}

const it = dialog();
console.log(it.next().value); // вопрос
console.log(it.next('Ada').value); // привет, Ada
```

Первый `.next()` доходит до `yield` и отдаёт вопрос; второй подставляет аргумент в `name`.

## Iterator protocol

Объект с `[Symbol.iterator]()` или сам генератор участвует в `for...of`, spread `[...g()]`, `Array.from`. Ручной цикл:

```js
const it = range(1, 2);
let r = it.next();
while (!r.done) {
  console.log(r.value);
  r = it.next();
}
```

## Ловушка

`yield` в обычной (не `*`) функции — SyntaxError. Вложенный `function` внутри генератора не наследует право на `yield` — нужен вложенный `function*` или `yield*` делегирование.

```js
function* outer() {
  yield* range(1, 2); // делегировать другому итерируемому
}
```

---

# 6. Ссылки

- [MDN: function*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
- [MDN: yield](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield)
- [MDN: Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
- [ECMA-262: Generator Objects](https://tc39.es/ecma262/#sec-generator-objects)
