# 1. Тема

**MutationObserver**

---

# 2. Главное в одну фразу

`MutationObserver` асинхронно получает пачки изменений DOM и позволяет реагировать на них без устаревших mutation events.

---

# 3. Суть

> `MutationObserver` следит за изменениями DOM: добавлением узлов, атрибутов или текста. Это не обработчик клика, а способ узнать, что разметку поменял код или сторонняя библиотека.
>
> Он полезен, когда нельзя контролировать источник изменений: например, нужно обработать новые карточки в виджете. Вместо постоянной проверки DOM браузер сообщает о накопившихся изменениях.
>
> Наблюдатель подключают к узлу через `observe()` и указывают нужные типы изменений. После текущей JavaScript-задачи callback получает пачку `MutationRecord`. Область наблюдения стоит сужать, а при удалении компонента вызывать `disconnect()`: иначе останутся лишняя работа и удерживаемые ссылки.

---

# 4. Самое главное запомнить

- `childList` отслеживает добавление и удаление дочерних узлов; `attributes` — атрибуты; `characterData` — текстовый узел.
- `subtree: true` распространяет наблюдение на потомков.
- В callback приходят записи `MutationRecord`, а не одно событие на каждое изменение.
- `takeRecords()` забирает накопленные записи синхронно, `disconnect()` прекращает наблюдение.
- Наблюдатель не заменяет обработчики пользовательских событий и не видит изменение значения `input.value`, если DOM-атрибут не менялся.

---

# 5. Описание

```js
const list = document.querySelector('.list');

const observer = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === 'childList') {
      console.log('Добавлено:', record.addedNodes);
      console.log('Удалено:', record.removedNodes);
    }
  }
});

observer.observe(list, { childList: true, subtree: true });
```

Для отслеживания одного атрибута полезен `attributeFilter`: это уменьшает объём работы.

```js
observer.observe(button, {
  attributes: true,
  attributeFilter: ['disabled'],
  attributeOldValue: true,
});
```

Изменения, сделанные подряд в одном синхронном участке кода, группируются перед вызовом callback. Не меняйте бесконтрольно тот же DOM в callback: можно запустить повторные наблюдения и создать цикл. Для жизненного цикла компонента очистка обязательна:

```js
return () => observer.disconnect();
```

---

# 6. Ссылки

- [MDN: MutationObserver](https://developer.mozilla.org/ru/docs/Web/API/MutationObserver)
- [javascript.info: MutationObserver](https://javascript.info/mutation-observer)
