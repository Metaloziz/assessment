# 1. Тема

**Методы изменения содержимого в DOM-узлах**

---

# 2. Главное в одну фразу

Для обычного текста используйте `textContent`, для доверенного HTML — `innerHTML`, а состояние и внешний вид элемента меняйте через свойства, атрибуты и классы.

---

# 3. Суть

> «`textContent` заменяет содержимое текстом и не интерпретирует теги — это безопасный стандартный выбор. `innerHTML` парсит строку как разметку и полностью заменяет потомков, поэтому пользовательский ввод через него может создать XSS.
>
> Для интерфейса чаще меняю `classList`, `dataset`, `value` и конкретные свойства элемента. Это точнее и проще поддерживать, чем собирать HTML-строки.»

---

# 4. Самое главное запомнить

- `textContent` безопасно выводит текст, включая символы `<` и `>`.
- `innerHTML` допускается только для доверенной или санитизированной разметки.
- `innerText` зависит от визуального представления и может вызвать перерасчёт layout.
- `classList` лучше прямых inline-стилей для обычного UI-состояния.
- Атрибут и DOM-свойство иногда отличаются: у формы текущее значение — `input.value`.

---

# 5. Описание

| API | Назначение | Риск |
|---|---|---|
| `textContent` | текст | безопасно |
| `innerHTML` | HTML-разметка | XSS с недоверенными данными |
| `classList` | CSS-классы | безопасно |
| `dataset` | `data-*` | безопасно |
| `setAttribute` | атрибут | зависит от атрибута |

```js
const message = document.querySelector('.message');
message.textContent = userInput;

const button = document.querySelector('button');
button.classList.toggle('is-loading', true);
button.dataset.requestId = '42';
```

Если нужен шаблон из данных, создайте элементы через DOM API или используйте шаблонизатор с экранированием. Не передавайте непроверенный ввод напрямую в `innerHTML` или `insertAdjacentHTML`.

---

# 6. Ссылки

- [MDN: Node.textContent](https://developer.mozilla.org/ru/docs/Web/API/Node/textContent)
- [MDN: Element.innerHTML](https://developer.mozilla.org/ru/docs/Web/API/Element/innerHTML)
- [MDN: Element.classList](https://developer.mozilla.org/ru/docs/Web/API/Element/classList)
