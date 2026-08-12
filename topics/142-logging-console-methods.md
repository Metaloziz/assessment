# 1. Тема

**Методы console (log, error, warn и др.)**

---

# 2. Главное в одну фразу

`console` в DevTools выводит сообщения разных уровней и форматов: отладка (`log`/`debug`), предупреждения (`warn`), ошибки (`error`), плюс таблицы, группы и замер времени.

---

# 3. Суть

> Объект **`console`** — API браузера (и Node) для вывода в панель Console. Это не «логирование сервиса» и не замена бэкенд-логгеру: сообщения видны разработчику в DevTools, их легко отфильтровать по уровню и найти по тексту. Базовые методы: **`log`** (нейтральный вывод), **`info`**, **`debug`** (часто скрыт фильтром Verbose), **`warn`** (жёлтый, потенциальная проблема), **`error`** (красный, часто со стеком) — уровень влияет на иконку и фильтры в UI.
>
> Зачем разделять уровни: при разборе бага включают нужный фильтр и не тонут в шуме. `warn` для устаревшего API или подозрительных данных; `error` — когда операция реально провалилась. Рядом полезны **`table`** (массив/объект таблицей), **`group` / `groupEnd`** (вложенные блоки), **`time` / `timeEnd`** (замер), **`assert`** (лог только если условие ложно), **`count`** (сколько раз вызывали).
>
> Как пользоваться в коде. Первый аргумент — сообщение или значение; дальше — доп. аргументы (объекты раскрываются). Строки с `%c` и CSS стилизуют вывод; `%o` / `%s` — подстановки. В React/SPA не оставляйте шумные `console.log` в каждом рендере на проде — либо вырезать бандлером, либо обернуть в `if (import.meta.env.DEV)`.
>
> Ловушка: `console.log(obj)` печатает **ссылку** на объект — к моменту раскрытия в DevTools поля могут уже измениться; для снимка — `log(structuredClone(obj))` или `JSON.stringify`. Путать `error` с `throw`: `console.error` только пишет в консоль, выполнение не прерывает.

---

# 4. Самое главное запомнить

| Метод | Когда |
|-------|--------|
| `log` / `info` / `debug` | Отладка, ход выполнения |
| `warn` | Подозрительно, но ещё живём |
| `error` | Операция провалилась (без throw) |
| `table` | Массив объектов удобнее смотреть |
| `group` / `time` | Структура и замеры |

- Фильтры Console в DevTools режут по уровню.
- `console.error` ≠ `throw`.
- На проде не засорять: уровни + вырезание в build.

---

# 5. Описание

## Уровни

```javascript
console.log('step', { id: 1 });
console.info('loaded');
console.debug('verbose detail'); // часто за фильтром «Verbose»
console.warn('deprecated prop `name`');
console.error('save failed', err);
```

## Структура и замеры

```javascript
console.group('checkout');
console.log('cart', cart);
console.time('pay');
await pay(cart);
console.timeEnd('pay');
console.groupEnd();

console.table(users.map((u) => ({ id: u.id, name: u.name })));
console.assert(total >= 0, 'total must be ≥ 0', total);
console.count('render');
```

## Стили и снимок объекта

```javascript
console.log('%c OK ', 'background:#4db784;color:#000;padding:2px 4px', payload);

// снимок на момент вызова, а не «живой» объект
console.log('user@t0', structuredClone(user));
```

## Связь с ошибками

```javascript
try {
  doWork();
} catch (e) {
  console.error('doWork failed', e); // видно в Console + stack
  // при необходимости: throw e; // пробросить выше
}
```

---

# 6. Ссылки

- [MDN: console](https://developer.mozilla.org/en-US/docs/Web/API/console)
- [Chrome DevTools — Console](https://developer.chrome.com/docs/devtools/console/)
- [MDN: console.table](https://developer.mozilla.org/en-US/docs/Web/API/console/table_static)
