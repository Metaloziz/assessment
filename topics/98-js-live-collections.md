# 1. Тема

**Живые коллекции DOM**

---

# 2. Главное в одну фразу

`HTMLCollection` обычно отражает текущий DOM, а `querySelectorAll` возвращает статический `NodeList`.

---

# 3. Суть

> Коллекция DOM похожа на массив: у неё есть индексы и `length`, но это отдельный тип. Некоторые коллекции живые — они сами отражают изменения DOM, а другие хранят снимок на момент запроса.
>
> Разница важна при добавлении и удалении элементов. Живой список может поменять длину прямо во время цикла и привести к пропуску элементов, тогда как статический список останется предсказуемым.
>
> `getElementsByClassName` возвращает живой `HTMLCollection`, а `querySelectorAll` — статический `NodeList`. Когда нужны `map` или `filter`, коллекцию преобразуют через `Array.from()` или `[...collection]`; полученный массив больше не обновляется вслед за DOM.

---

# 4. Самое главное запомнить

- `getElementsByClassName` и `getElementsByTagName` возвращают живой `HTMLCollection`.
- `querySelectorAll` возвращает статический `NodeList` — распространённое исключение из правила «NodeList живой».
- Преобразуйте коллекцию через `Array.from()` или `[...collection]`, когда нужны `map`, `filter`, `reduce`.
- Массив — снимок списка на момент преобразования, DOM дальше его не обновляет.
- Не удаляйте элементы, проходя живую коллекцию слева направо: индексы сдвигаются.

---

# 5. Описание

```js
const live = document.getElementsByClassName('item');
const staticList = document.querySelectorAll('.item');

document.body.insertAdjacentHTML('beforeend', '<div class="item"></div>');

console.log(live.length); // увеличилось
console.log(staticList.length); // прежнее значение
```

`NodeList` поддерживает `forEach` в современных браузерах, но это не делает его полноценным массивом. Для цепочек методов используйте явное преобразование.

```js
const names = [...document.querySelectorAll('.item')]
  .map((element) => element.textContent.trim())
  .filter(Boolean);
```

| Источник | Тип | Обновляется после изменений DOM |
| --- | --- | --- |
| `querySelectorAll()` | `NodeList` | Нет |
| `getElementsByClassName()` | `HTMLCollection` | Да |
| `children` | `HTMLCollection` | Да |
| `childNodes` | `NodeList` | Да |

Для удаления из живой коллекции идите с конца или сначала создайте массив: `[...live].forEach(el => el.remove())`.

---

# 6. Ссылки

- [MDN: HTMLCollection](https://developer.mozilla.org/ru/docs/Web/API/HTMLCollection)
- [MDN: NodeList](https://developer.mozilla.org/ru/docs/Web/API/NodeList)
