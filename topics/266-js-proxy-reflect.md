# 1. Тема

**Proxy и Reflect:** traps · перехват операций · метапрограммирование · валидация · реактивность · `Reflect` как зеркало API объекта

---

# 2. Главное в одну фразу

`Proxy` — посредник перед объектом: он перехватывает чтение, запись и другие операции; `Reflect` — набор тех же операций в виде функций, чтобы в trap корректно пробросить действие дальше.

---

# 3. Суть

> Обычный объект отвечает сам: написали `user.age` — движок сразу лезет в поле. `Proxy` ставит «охранника» перед объектом: любое обращение сначала попадает к вам — в функцию-перехватчик (**trap**). Вы решаете: отдать значение, запретить запись, подставить default, вызвать колбэк.
>
> Так делают валидацию полей, логирование, ленивые вычисления, простые реактивные store (идея Vue 3). Это не «магия поверх объекта», а явный контракт: для каждой операции, которую вы перехватываете, либо делаете своё, либо делегируете дальше на настоящий объект (**target**).
>
> `Reflect` — зеркало встроенных действий языка: `Reflect.get`, `Reflect.set`, `Reflect.has` и т.д. В trap по умолчанию вызывают именно их, а не голый `target[prop]`. Почему: у операций есть нюансы (например, `receiver` для геттеров), и `Reflect` повторяет то же поведение, что и обычный синтаксис. Прямой доступ к `target` обходит proxy — иногда это нужно для «сырых» данных, но чаще делегируют через `Reflect`.

---

# 4. Самое главное запомнить

- `new Proxy(target, handler)` — обёртка; операции на `proxy` идут в traps из `handler`, если trap задан.
- Trap — обычная функция: для `get` возвращает значение, для `set` / `has` — `true` или `false`.
- В trap делегировать через `Reflect.*`, не через `target[key]`: так сохраняется `receiver` и поведение как у обычного объекта.
- `Reflect.ownKeys` видит строки и символы; `Object.keys` — только перечислимые строковые ключи.
- В `set`: `return false` отклоняет присваивание (в strict mode — `TypeError`); `return true` без реальной записи — «соврали, что записали».
- Proxy не копирует объект: `target` живёт отдельно; private fields через proxy как обычные ключи не перехватываются.
- `Proxy.revocable` даёт `{ proxy, revoke }`: после `revoke()` любая операция на proxy — `TypeError`.

---

# 5. Описание

```text
код: proxy.age
  → trap get(target, "age", receiver)
      → Reflect.get(target, "age", receiver)  // или своё значение
  → результат в выражении

код: proxy.age = -1
  → trap set(target, "age", -1, receiver)
      → false  // отказ
      или Reflect.set(...)  // записать в target
```

Аналогия: `target` — сейф с данными, `proxy` — сотрудник на входе, trap — его правила («что можно читать / писать»). `Reflect` — «сделай стандартное действие с сейфом», как если бы охранника не было.

## Базовый trap `get` — значение по умолчанию

```js
const user = { name: 'Alex' };

const profile = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver); // ← как обычное чтение
    }
    return 'не задано'; // ← своего поля нет — отдаём default
  },
});

profile.name; // 'Alex'
profile.city; // 'не задано' — это trap, не поле в user
```

Читаете `profile.city` — в `user` такого ключа нет, но ошибкой это не становится: trap подставил строку. Сам `user` при этом не меняется.

## Trap `set` — валидация

```js
const account = { balance: 100 };

const guarded = new Proxy(account, {
  set(target, prop, value, receiver) {
    if (prop === 'balance' && typeof value === 'number' && value < 0) {
      return false; // ← «запись запрещена»
    }
    return Reflect.set(target, prop, value, receiver);
  },
});

guarded.balance = 50; // ok → account.balance === 50
guarded.balance = -10; // TypeError в strict (или false в sloppy)
```

Правило простое: вернули `false` — присваивание не прошло; вернули результат `Reflect.set` — записали как обычно.

## Зачем `Reflect`, а не `target[prop]`

Кратко: `Reflect.get(target, prop, receiver)` ближе к тому, что делает язык при `proxy.prop`. Третий аргумент `receiver` важен, если у свойства есть геттер: внутри геттера `this` должен быть proxy (или тем, кого передали), а не «голый» target. Без `Reflect` легко сломать цепочку прототипов и сюрпризы с `this`.

Практическое правило новичка: в trap почти всегда `return Reflect.xxx(...)`, а свою логику пишут *до* или *после* этого вызова.

## `Reflect.ownKeys` vs `Object.keys`

```js
const sym = Symbol('id');
const raw = { a: 1, [sym]: 2 };
const p = new Proxy(raw, {}); // пустой handler — всё «как есть»

Reflect.ownKeys(p); // ['a', Symbol(id)]
Object.keys(p);     // ['a'] — символы не входят
```

Нужны все собственные ключи (включая Symbol) — `Reflect.ownKeys`. Нужны только привычные enumerable-строки — `Object.keys`.

## Частые traps

| Trap | Когда срабатывает | Зачем обычно |
| --- | --- | --- |
| `get` | чтение свойства | default, лог, вычисляемое значение |
| `set` | присваивание | валидация, «заморозить» объект |
| `has` | оператор `in` | спрятать ключ |
| `deleteProperty` | `delete` | запретить удаление |
| `ownKeys` | `Object.keys`, spread | отфильтровать ключи |
| `apply` | вызов функции `fn()` | обернуть функцию |
| `construct` | `new Fn()` | контроль создания экземпляра |

Необязательно перехватывать всё: задаёте только нужные traps, остальное работает как у обычного объекта.

## Реактивность (идея)

```js
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, prop, value, receiver) {
      const ok = Reflect.set(target, prop, value, receiver);
      if (ok) onChange(prop, value); // ← «уведоми подписчика»
      return ok;
    },
  });
}

const state = reactive({ count: 0 }, (prop, value) => {
  console.log(`${prop} = ${value}`);
});

state.count = 1; // лог: count = 1
```

Каждое изменение через proxy зовёт колбэк. На этой идее стоят реактивные фреймворки; в Vue 3 реальность сложнее (зависимости, вложенность), но входная точка та же — перехват `set` / `get`.

## Revocable proxy

```js
const { proxy, revoke } = Proxy.revocable({ secret: 1 }, {});
proxy.secret; // 1
revoke();
proxy.secret; // TypeError: proxy is revoked
```

Удобно, когда доступ к объекту нужно «выключить» после передачи наружу: отозвали — и больше никто через этот proxy не пройдёт.

## Proxy ≠ паттерн Proxy из ООП

В учебниках по паттернам «Proxy» — обёртка с тем же интерфейсом (кэш, ленивая загрузка). Её можно написать обычным объектом с методами.

Языковой `Proxy` в JS — **метапрограммирование**: перехват *операций* (`obj.x`, `obj.x = …`, `in`, `delete`), а не только вызовов методов. Паттерн можно реализовать и с `Proxy`, и без него.

## Ловушки

- Менять `target` напрямую — traps на proxy не сработают (обошли охранника).
- В `set` вернуть `true`, но ничего не записать — вызывающий код думает, что запись успешна.
- Ждать, что `===` сравнит proxy и target как один объект: это разные ссылки.
- Путать `Object.keys` и `Reflect.ownKeys` при фильтрации символов.

---

# 6. Ссылки

- [MDN — Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MDN — Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect)
- [javascript.info — Proxy](https://javascript.info/proxy)
- [ECMAScript — Proxy internal methods](https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-exotic-objects)
