# 1. Тема

**try-catch**

---

# 2. Главное в одну фразу

`try` / `catch` / `finally` ловят синхронные исключения в блоке кода: ошибка не роняет весь поток выполнения, а передаётся в обработчик с объектом `Error`.

---

# 3. Суть

> Когда в JavaScript происходит **throw** (или падение встроенной операции вроде чтения свойства у `null`), движок ищет ближайший обработчик. Конструкция **`try { … } catch (e) { … }`** оборачивает опасный участок: если внутри `try` выброшено исключение, управление прыгает в `catch`, в `e` попадает объект ошибки (`message`, `name`, `stack`). Блок **`finally`** выполняется всегда — и при успехе, и после `catch` — удобен для очистки (закрыть поток, снять лоадер).
>
> Зачем это нужно: без обработки необработанный exception рвёт текущий вызов и может оставить UI или данные в полусломанном состоянии. С `try/catch` можно показать сообщение пользователю, залогировать, откатить локальное состояние и продолжить работу приложения.
>
> Как устроено на практике. В `try` кладут только то, что реально может упасть и что вы готовы обработать. В `catch` различают типы (`e instanceof TypeError`) или хотя бы логируют `e` целиком. Для **async**: `await` внутри `try` ловит rejected promise; без `await` — только `.catch()` у промиса или глобальный `unhandledrejection`. Синхронный `try/catch` вокруг `fetch().then(…)` **не** поймает ошибку сети — промис уйдёт мимо.
>
> Ловушка: глотать ошибки пустым `catch (e) {}` — баг исчезает из виду. Другая — оборачивать «на всякий случай» весь модуль: маскируются реальные поломки. `finally` с `return` перекрывает `return` из `try`/`catch` — легко запутаться в возвращаемом значении.

---

# 4. Самое главное запомнить

- `try` → при throw → `catch(e)`; `finally` — всегда.
- Ловит **синхронные** throw и `await` внутри `try`.
- Промис без `await` / `.catch` — мимо `try/catch`.
- Не глотать: логируйте `e`, решайте UX (тост, fallback).
- `throw new Error('…')` — свой сбой с понятным сообщением.

---

# 5. Описание

## Базовый каркас

```javascript
try {
  const data = JSON.parse(raw); // может бросить SyntaxError
  render(data);
} catch (e) {
  console.error('parse failed', e);
  showToast('Некорректные данные');
} finally {
  hideSpinner();
}
```

```text
throw / ошибка в try
        │
        ▼
   есть catch? ──нет──► вверх по стеку / uncaught
        │да
        ▼
      catch(e) → finally → дальше по коду
```

## async / await

```javascript
async function loadUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}
```

## Когда throw самому

```javascript
function parseAge(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError(`Invalid age: ${value}`);
  }
  return n;
}
```

Так вызывающий код решает: показать форму или упасть выше.

## Чего `try/catch` не делает

- Не заменяет проверки входных данных (`if`).
- Не ловит ошибки в другом тике (`setTimeout` колбэк — свой стек; нужен свой `try` внутри).
- Не заменяет мониторинг (Sentry и т.п.) на проде.

---

# 6. Ссылки

- [MDN: try…catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- [MDN: Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [MDN: Promise — rejection](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
