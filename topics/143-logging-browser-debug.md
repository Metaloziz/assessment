# 1. Тема

**Дебаг клиентского кода через браузер**

---

# 2. Главное в одну фразу

В DevTools отладка идёт через breakpoints, пошаговое выполнение и инспекцию scope/call stack — без угадывания по одним только `console.log`.

---

# 3. Суть

> Браузерные **DevTools** (Chrome, Firefox, Edge) дают точку остановки в JS: открываете **Sources** (или Отладчик), находите файл, ставите **breakpoint** на строке. Когда выполнение доходит до неё, страница «замирает»: можно смотреть переменные в **Scope**, цепочку вызовов в **Call Stack**, значение выражений в **Watch**, и идти дальше пошагово (**Step over / into / out**). Условный breakpoint срабатывает только если выражение истинно — удобно в циклах.
>
> Зачем это сильнее россыпи `console.log`: видите реальное состояние в момент бага, не меняя код ради отладки и не пропуская тик, который уже прошёл. Для событий DOM — breakpoint на **Event Listener**; для сети — вкладка **Network** (статус, тело, timing); для вёрстки — **Elements** + computed styles. Source maps в dev связывают бандл со исходниками `.tsx` / `.ts`.
>
> Типичный цикл: воспроизвести баг → поставить breakpoint (или `debugger;` в коде) → посмотреть scope и стек → Step → гипотеза → правка. **Pause on exceptions** останавливает на throw (полезно с `try/catch`). В Console можно выполнять код в контексте паузы (`$0` — выбранный DOM-узел).
>
> Ловушка: отлаживать минифицированный prod без source maps — почти бессмысленно; включите maps в dev. Другая — ставить breakpoint «где-то рядом» и не проверять Call Stack: смотрите не тот вызов. Логи в Console дополняют дебаг, но не заменяют остановку на строке.

---

# 4. Самое главное запомнить

- Sources → breakpoint → Scope + Call Stack.
- Step over / into / out; условный breakpoint в циклах.
- `debugger;` — программная точка остановки.
- Pause on exceptions — ловить throw.
- Network / Elements — рядом с JS-отладкой.
- Dev + source maps; prod minify без maps — тяжело.

---

# 5. Описание

## Минимальный сценарий

```text
1. F12 → Sources
2. Ctrl+P → открыть файл
3. Клик по номеру строки → breakpoint (синяя метка)
4. Воспроизвести действие на странице
5. Смотреть Scope / Call Stack
6. F10 Step over · F11 Step into · Shift+F11 Step out
7. Resume (F8) или снять breakpoint
```

## Точки остановки

| Тип | Зачем |
|-----|--------|
| Line breakpoint | Остановка на строке |
| Conditional | Только если `i === 5` |
| `debugger;` | Остановка из кода (убрать перед релизом) |
| DOM breakpoint | На изменение узла / атрибута |
| Event listener | На `click`, `submit`, … |
| XHR/fetch breakpoint | На уход запроса (Chrome) |

```javascript
function checkout(cart) {
  debugger; // пауза, если DevTools открыты
  return pay(cart);
}
```

## Что смотреть на паузе

- **Scope** — local / closure / global.
- **Call Stack** — кто вызвал текущую функцию; клик по кадру = другой scope.
- **Watch** — выражения (`user.id`, `items.length`).
- Console — выполнить `cart`, `this` в контексте паузы.

## Частые связки

```text
UI баг        → Elements + computed + event listeners
«Не тот JSON» → Network → Response / Preview
«Где упало»   → Pause on exceptions + stack
«Почему NaN»  → breakpoint + Watch на выражение
```

## Source maps

В dev-сборке (Vite/Webpack) maps обычно включены: в Sources видны исходники, не `bundle.js`. Без maps стек указывает в склеенный файл — сначала проверьте `devtool` / `build.sourcemap`.

---

# 6. Ссылки

- [Chrome DevTools — Debug JavaScript](https://developer.chrome.com/docs/devtools/javascript/)
- [Chrome — Breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints/)
- [MDN: debugger](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger)
- [Firefox — Debugger](https://firefox-source-docs.mozilla.org/devtools-user/debugger/)
