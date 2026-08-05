# 1. Тема

**Методы изменения содержимого в DOM-узлах**

---

# 2. Главное в одну фразу

Для обычного текста используйте `textContent`, для доверенного HTML — `innerHTML`, а состояние и внешний вид элемента меняйте через свойства, атрибуты и классы.

---

# 3. Суть

> Содержимое DOM меняют разными API в зависимости от того, нужен текст или разметка. `textContent` записывает обычный текст и не интерпретирует теги, а `innerHTML` разбирает строку как HTML и заменяет потомков элемента.
>
> Для сообщений пользователя, названий и данных с сервера безопасным выбором обычно будет `textContent`: строка `<b>` останется текстом. Передача таких данных в `innerHTML` без санитаризации открывает путь к XSS.
>
> Состояние интерфейса лучше выражать точечными изменениями: `classList` для внешнего вида, `dataset` для `data-*`, `value` для текущего значения поля и отдельные свойства для элемента. Это сохраняет существующие узлы и не требует собирать HTML-строку.
>
> `innerText` зависит от отображения и может вызвать расчёт layout, поэтому он не является прямой заменой `textContent`.

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
