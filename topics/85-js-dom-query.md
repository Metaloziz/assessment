# 1. Тема

**Методы поиска DOM-узлов**

---

# 2. Главное в одну фразу

DOM-узлы обычно ищут через CSS-селекторы `querySelector` и `querySelectorAll`, а для навигации по дереву используют `closest`, `matches` и свойства соседей.

---

# 3. Суть

> Поиск DOM начинается с выбора области и CSS-селектора. `querySelector` возвращает первый подходящий элемент или `null`, а `querySelectorAll` — статичный список всех совпадений.
>
> Это нужно, чтобы работать именно с нужной частью страницы и не обращаться к несуществующему узлу. В больших компонентах поиск от известного контейнера делает код понятнее и снижает риск захватить чужой элемент.
>
> Обычно ищут через `container.querySelector(...)` и проверяют результат на `null`. В обработчике события исходным узлом может быть иконка внутри кнопки, поэтому `event.target.closest(...)` поднимается к нужному предку, а `matches(...)` проверяет сам элемент.
>
> Старые `getElementsBy*` возвращают живую коллекцию, которая меняется вместе с DOM. Не путайте её со статичным `NodeList` от `querySelectorAll`.

---

# 4. Самое главное запомнить

- Проверяйте результат `querySelector` на `null`.
- `querySelectorAll` возвращает статичный `NodeList`, по нему можно итерироваться через `forEach`.
- `HTMLCollection` от `getElementsBy*` — живая коллекция.
- Ищите внутри известного контейнера, а не всегда от `document`.
- `closest` ищет подходящий элемент вверх, включая исходный.

---

# 5. Описание

| API | Результат | Коллекция |
|---|---|---|
| `querySelector('.item')` | первый `Element` или `null` | — |
| `querySelectorAll('.item')` | все совпадения | статичный `NodeList` |
| `getElementById('id')` | элемент или `null` | — |
| `getElementsByClassName('item')` | совпадения | живой `HTMLCollection` |

```js
const list = document.querySelector('.todo-list');
const items = list.querySelectorAll('.todo-item');

list.addEventListener('click', (event) => {
  const item = event.target.closest('.todo-item');
  if (!item || !list.contains(item)) return;
  item.classList.toggle('done');
});
```

`event.target` может быть вложенной иконкой, поэтому проверка через `closest` надёжнее, чем сравнение только с целевым элементом.

---

# 6. Ссылки

- [MDN: querySelector](https://developer.mozilla.org/ru/docs/Web/API/Document/querySelector)
- [MDN: closest](https://developer.mozilla.org/ru/docs/Web/API/Element/closest)
- [JavaScript.info: Поиск DOM-элементов](https://javascript.info/searching-elements-dom)
