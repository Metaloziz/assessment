# 1. Тема

**breakpoints**

---

# 2. Главное в одну фразу

Breakpoint останавливает JS в нужный момент: на строке, по условию, на DOM/событии, на XHR/fetch или на исключении — чтобы увидеть стек и состояние.

---

# 3. Суть

> В **Sources** брейкпоинт — точка паузы отладчика. Базовый вид — клик по номеру строки. Сильнее: **conditional** (пауза только если выражение истинно), **logpoint** (лог без паузы), **DOM breakpoints** (subtree/attribute/removal), **Event listener breakpoints**, **XHR/fetch breakpoints**, остановка на **uncaught/caught exceptions**.
>
> На паузе доступны Call Stack, Scope, Watch. Это быстрее `console.log`-спама для ветвлений и гонок. Не путать с breakpoint’ами в IDE: браузерные работают на уже исполняемом коде страницы (с source maps — на исходниках).

---

# 4. Самое главное запомнить

- Line breakpoint — стоп на строке; conditional — стоп по условию.
- DOM / Event / XHR breakpoints — когда проблема не в «этой строке», а в реакции на изменение/событие/запрос.
- Exception breakpoints ловят throw.
- Source maps критичны для TS/bundled кода.
- Панель Breakpoints: вкл/выкл/удаление без потери места.

| Тип | Когда |
|---|---|
| Line / Conditional | Логика функции |
| DOM | Кто меняет узел |
| Event listener | Клик, scroll, submit… |
| XHR/fetch | Кто дергает сеть |
| Exception | Неожиданный throw |

---

# 5. Описание

### Line и conditional

```typescript
function calculateTotal(items: { price: number; quantity: number }[]) {
  // breakpoint здесь или условие: items.length > 100
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
```

Условный брейкпоинт: ПКМ по номеру строки → Add conditional breakpoint → например `user.id === 42`.

### DOM breakpoints

В Elements → ПКМ по узлу → Break on → subtree / attribute / node removal. Полезно, когда «кто-то внезапно снёс блок».

### Event listener breakpoints

Sources → Event Listener Breakpoints: mouse, keyboard, control и т.д. Пауза во входящем обработчике.

### XHR/fetch

Срабатывает при уходе запроса (можно фильтровать по URL). Удобно поймать лишний refetch.

### Exception

Pause on exceptions — особенно uncaught; иногда включают и caught, чтобы увидеть проглоченные ошибки.

---

# 6. Ссылки

- [Chrome DevTools — Breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints/)
- [Chrome DevTools — Debug JavaScript](https://developer.chrome.com/docs/devtools/javascript/)
