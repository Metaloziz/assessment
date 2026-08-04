# 1. Тема

**Методы добавления и удаления DOM-узлов**

---

# 2. Главное в одну фразу

Новый DOM-узел создают через `createElement`, вставляют методами `append`/`prepend`/`before`/`after`, а удаляют `remove` или через родителя.

---

# 3. Суть

> «Для безопасного создания элемента я вызываю `document.createElement`, задаю свойства и добавляю в нужное место. `append` и `prepend` принимают несколько узлов и строк, а `appendChild` — один узел и возвращает его.
>
> Узел нельзя одновременно разместить в двух местах: повторный `append` переместит тот же объект. Для множества вставок собираю `DocumentFragment`, чтобы выполнить одну вставку в DOM.»

---

# 4. Самое главное запомнить

- `append` вставляет в конец, `prepend` — в начало.
- `before` и `after` вставляют рядом с текущим элементом.
- `remove()` удаляет сам элемент, `removeChild()` вызывается у родителя.
- `cloneNode(true)` копирует потомков, но не слушатели событий.
- Не вставляйте пользовательский ввод через HTML-строку без санитаризации.

---

# 5. Описание

| Задача | Метод |
|---|---|
| создать элемент | `document.createElement()` |
| добавить в конец | `parent.append(node)` |
| добавить в начало | `parent.prepend(node)` |
| вставить перед узлом | `node.before(newNode)` |
| заменить | `node.replaceWith(newNode)` |
| удалить | `node.remove()` |

```js
const item = document.createElement('li');
item.textContent = 'Купить молоко';
item.classList.add('todo-item');

document.querySelector('.todo-list').append(item);
item.remove();
```

```js
const fragment = document.createDocumentFragment();
for (const name of ['Анна', 'Илья']) {
  const option = document.createElement('option');
  option.textContent = name;
  fragment.append(option);
}
select.append(fragment);
```

---

# 6. Ссылки

- [MDN: Document.createElement](https://developer.mozilla.org/ru/docs/Web/API/Document/createElement)
- [MDN: Element.remove](https://developer.mozilla.org/ru/docs/Web/API/Element/remove)
- [JavaScript.info: Изменение документа](https://javascript.info/modifying-document)
