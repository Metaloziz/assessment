# 1. Тема

**Цепочка Promise после отлавливания ошибки**

---

# 2. Главное в одну фразу

После `catch` цепочка снова идёт как fulfilled с возвращённым значением, если ошибку не пробросить повторно — `catch` и восстанавливает поток, и может снова его оборвать через `throw` / `return Promise.reject`.

---

# 3. Суть

> У промис-цепочки ошибка «скатывается» вниз, пока не встретит `catch` (или второй аргумент `then`). Обработчик в `catch` **по умолчанию восстанавливает** цепочку: если вернуть обычное значение (или fulfilled-промис), следующие `then` снова получат данные. Это не «конец света», а ветка recovery.
>
> Чтобы ошибка осталась ошибкой для хвоста, в `catch` нужно снова **отклонить**: `throw err`, `return Promise.reject(err)` или бросить новую. Иначе нижестоящий код думает, что всё успешно — классический баг «проглотили reject и пошли рисовать UI».
>
> Ловушка: `finally` не глотает и не чинит значение так же, как `catch` — он для side effects; если из `finally` вернуть промис, он может задержать цепочку. Пустой `catch (() => {})` скрывает сбой. Смотрите, **что возвращает** обработчик ошибки — от этого зависит судьба всех следующих звеньев.

---

# 4. Самое главное запомнить

- Reject пропускает обычные `then(onFulfilled)` до ближайшего `onRejected` / `catch`.
- `catch`, вернувший значение → дальше цепочка **fulfilled** с этим значением.
- Чтобы пробросить: `throw` или `return Promise.reject(...)`.
- После успешного recovery следующие `then` выполняются как обычно.
- Пустой `catch` = намеренно скрытый сбой (логируйте или rethrow).
- `finally` не заменяет `catch` для восстановления значения.

---

# 5. Описание

```text
Promise.reject(err)
  → then(ok)      пропускается
  → catch(handler)
       ├─ return value     → then дальше (recovery)
       └─ throw / reject   → следующий catch
```

## Recovery

```js
Promise.reject(new Error('fail'))
  .catch((err) => {
    console.warn(err.message);
    return { fallback: true }; // восстановили
  })
  .then((data) => {
    console.log(data); // { fallback: true }
  });
```

## Rethrow

```js
fetch('/api')
  .then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  })
  .catch((err) => {
    log(err);
    throw err; // хвост всё ещё в ошибке
  })
  .then(() => console.log('не вызовется'))
  .catch(() => console.log('финальный catch'));
```

## catch посередине

```js
step1()
  .then(step2)
  .catch(recoverStep2) // только ошибки step1/step2
  .then(step3)          // выполнится после recovery
  .catch(fatal);
```

Имеет смысл ловить узко: не один глобальный `catch` на всё, если часть шагов должна уметь продолжать с запасным значением.

## finally

```js
doWork()
  .catch(handle)
  .finally(() => hideSpinner());
```

Не кладите в `finally` логику «подменить результат», если не уверены в спецификации возвращаемого промиса — для recovery используйте `catch`.

---

# 6. Ссылки

- [MDN: Promise.prototype.catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch)
- [MDN: Promise.prototype.finally](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally)
- [MDN: Using promises — error handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#error_handling)
- [ECMA-262: Promise reaction jobs](https://tc39.es/ecma262/#sec-promisereactionjob)
