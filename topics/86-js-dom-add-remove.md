# 1. Тема

**Методы добавления и удаления DOM-узлов**

---

# 2. Главное в одну фразу

Новый DOM-узел создают через `createElement`, вставляют методами `append`/`prepend`/`before`/`after`, а удаляют `remove` или через родителя.

---

# 3. Суть

> DOM-узел создают как объект через `document.createElement`, настраивают его свойства и вставляют в нужное место дерева. Для этого используют `append`, `prepend`, `before`, `after` или `replaceWith`; удалить узел можно методом `remove`.
>
> Такой подход удобен для списков, уведомлений и результатов запроса: содержимое собирается из данных без конкатенации HTML-строк. Через свойства и `textContent` проще не допустить вставку непроверенной разметки.
>
> У узла может быть только один родитель. Повторный `append` не копирует его, а перемещает. Для большой пачки элементов их сначала кладут в `DocumentFragment`, затем добавляют фрагмент в DOM одной операцией.
>
> `cloneNode(true)` копирует потомков, но не слушатели событий. Если нужен новый интерактивный элемент, обработчик надо подписать заново или использовать делегирование.

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
