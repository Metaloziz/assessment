# 1. Тема

**Функции-генераторы**

---

# 2. Главное в одну фразу

`function*` — как печь, которая отдаёт булки по одной: тело встаёт на `yield`, а снаружи шаг делают через `.next()`.

---

# 3. Суть

> **Генератор** — функция с `function*` и `yield`. Вызов не прогоняет тело до конца: он отдаёт **итератор**. Каждый `.next()` двигает печь до следующего `yield` (или до `return`) и возвращает `{ value, done }`. Снаружи это ленивая очередь значений; внутри — пауза с сохранённым локальным состоянием.
>
> Зачем: большие и бесконечные последовательности без массива в памяти, свои объекты под `for...of`, и «диалог» снаружи — аргумент следующего `.next(x)` становится результатом текущего `yield`. Это синхронные паузы, не замена промисам.
>
> Ловушка: не путать с **async generator** (`async function*` / `for await...of`) — там другой протокол и промисы. Необработанный `throw` внутри и `.throw(err)` снаружи ведут себя как обычные исключения. После `done: true` генератор закрыт.

---

# 4. Самое главное запомнить

- `function*` + `yield`: вызов даёт итератор, а не готовый результат тела.
- `.next()` возвращает `{ value, done }`; `done: true` после финального `return` или конца тела.
- Генератор обычно и iterable, и iterator — его ест `for...of`.
- `.next(arg)` подставляет `arg` туда, где тело ждало на `yield`.
- `.throw` / `.return` вмешиваются в ход снаружи (закрытие, ошибка).
- Сам по себе это не async I/O; потоки промисов — у async generators.

---

# 5. Описание

```text
function* bakeTray() { yield 'булка'; yield 'багет'; return 'пусто'; }

bakeTray() → iterator
  .next() → { value: 'булка', done: false }
  .next() → { value: 'багет', done: false }
  .next() → { value: 'пусто', done: true }
```

## Базовый пример — противень

```js
function* bakeTray() {
  yield 'булка';
  yield 'круассан';
  yield 'багет';
}

for (const bun of bakeTray()) {
  console.log(bun); // булка, круассан, багет
}
```

Печь не печёт весь противень сразу: каждую булку забирают отдельным шагом итератора.

## Двусторонняя связь — заказ

```js
function* takeOrder() {
  const filling = yield 'Какая начинка?';
  return `Булка с ${filling}`;
}

const it = takeOrder();
console.log(it.next().value); // вопрос
console.log(it.next('маком').value); // Булка с маком
```

Первый `.next()` доходит до `yield` и отдаёт вопрос; второй подставляет начинку в `filling`.

## Iterator protocol

Объект с `[Symbol.iterator]()` или сам генератор участвует в `for...of`, spread `[...g()]`, `Array.from`. Ручной цикл:

```js
const it = bakeTray();
let r = it.next();
while (!r.done) {
  console.log(r.value);
  r = it.next();
}
```

## Ловушка

`yield` в обычной (не `*`) функции — SyntaxError. Вложенный `function` внутри генератора не наследует право на `yield` — нужен вложенный `function*` или делегирование `yield*`.

```js
function* morningBatch() {
  yield* bakeTray(); // делегировать другому итерируемому
}
```

---

# 6. Ссылки

- [MDN: function*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
- [MDN: yield](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield)
- [MDN: Iterators and generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators)
- [ECMA-262: Generator Objects](https://tc39.es/ecma262/#sec-generator-objects)
