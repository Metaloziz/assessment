# 1. Тема

**Живые коллекции, методы обработки и преобразования в массив**

---

# 2. Главное в одну фразу

DOM-коллекции похожи на массивы, но живой `HTMLCollection` меняется вместе с DOM, а для `map` и `filter` коллекцию сначала переводят в обычный массив.

---

# 3. Суть

> DOM-коллекция выглядит как массив: у неё есть индексы и `length`, по ней можно пройтись циклом. Но это не `Array`, а специальные типы браузера вроде `HTMLCollection` и `NodeList`, поэтому набор методов у них другой.
>
> Главное различие в том, живая коллекция или нет. Живой `HTMLCollection` сразу отражает текущее состояние DOM: добавили или удалили элемент, и та же переменная уже показывает новую длину. Это удобно для чтения текущего дерева, но опасно при изменении DOM во время обхода.
>
> `querySelectorAll()` возвращает статический `NodeList`: это снимок на момент запроса. Такой список предсказуемее для прохода, а если нужны `map`, `filter` или `reduce`, коллекцию обычно превращают в массив через `Array.from()` или spread. После этого связь с DOM теряется: массив остаётся обычной копией, которую DOM больше не обновляет.

---

# 4. Самое главное запомнить

- `getElementsByClassName()`, `getElementsByTagName()` и `children` обычно дают живую `HTMLCollection`.
- `querySelectorAll()` возвращает статический `NodeList`, который не меняется после новых вставок и удалений.
- `NodeList` может поддерживать `forEach()`, но это всё равно не полноценный массив с `map()`, `filter()` и `reduce()`.
- Для цепочек методов обработки делайте `Array.from(collection)` или `[...collection]`.
- Если собираетесь удалять или переставлять узлы, безопаснее сначала получить массив, а не мутировать DOM по живой коллекции слева направо.

---

# 5. Описание

```text
DOM
├─ getElementsByClassName('.item') -> live HTMLCollection
├─ querySelectorAll('.item')       -> static NodeList
└─ Array.from(collection)          -> Array snapshot
```

## Живая коллекция

Живая коллекция удобна, когда нужно узнать текущее состояние контейнера без нового запроса. Один раз взяли `children` или `getElementsByClassName()`, потом добавили узел, и `length` уже другой.

```js
const live = list.getElementsByClassName('item');

list.append(document.createElement('li'));
console.log(live.length); // стало больше
```

## Почему обход с мутацией опасен

Если идти по живой коллекции слева направо и одновременно удалять элементы, индексы сдвигаются. В итоге часть узлов можно случайно пропустить. Поэтому для мутаций часто либо идут с конца, либо сначала делают снимок в массив.

```js
const live = list.getElementsByClassName('item');

Array.from(live).forEach((element) => {
  if (element.dataset.done === 'true') {
    element.remove();
  }
});
```

## Когда нужен массив

У DOM-коллекций ограниченный набор методов. Если нужно собрать тексты, отфильтровать скрытые элементы или посчитать статистику, удобнее перейти к обычному массиву и уже на нём делать `map()`, `filter()` и `reduce()`.

```js
const labels = Array.from(document.querySelectorAll('.item'))
  .map((element) => element.textContent?.trim() ?? '')
  .filter(Boolean);
```

| Источник | Тип | Живая | Что удобно делать |
| --- | --- | --- | --- |
| `getElementsByClassName()` | `HTMLCollection` | Да | читать текущее состояние DOM |
| `children` | `HTMLCollection` | Да | смотреть прямых детей контейнера |
| `querySelectorAll()` | `NodeList` | Нет | получить стабильный снимок |
| `Array.from(...)` | `Array` | Нет | `map`, `filter`, `reduce`, безопасные мутации |

---

# 6. Ссылки

- [MDN: HTMLCollection](https://developer.mozilla.org/ru/docs/Web/API/HTMLCollection)
- [MDN: NodeList](https://developer.mozilla.org/ru/docs/Web/API/NodeList)
- [MDN: Array.from](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/from)
- [MDN: Document.querySelectorAll](https://developer.mozilla.org/ru/docs/Web/API/Document/querySelectorAll)
