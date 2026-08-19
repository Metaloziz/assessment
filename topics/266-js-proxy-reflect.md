# 1. Тема

**Proxy и Reflect:** traps · перехват операций · метапрограммирование · валидация · реактивность · `Reflect` как зеркало API объекта

---

# 2. Главное в одну фразу

`Proxy` оборачивает объект и перехватывает операции через traps; `Reflect` даёт те же операции как функции — правильный способ делегировать в trap к `target` без ломания прототипов и receiver.

---

# 3. Суть

> Обычный объект отвечает на чтение и запись напрямую: `user.age` идёт в поле объекта. `Proxy` ставит посредника: любая операция — `get`, `set`, `has`, `deleteProperty`, `ownKeys` — сначала попадает в trap, и вы решаете, что делать с `target`.
>
> Так строят валидацию полей, логирование доступа, ленивые вычисления, реактивные store (Vue 3, некоторые ORM), обёртки API. Trap не «магия поверх объекта» — это контракт: для каждой перехваченной операции вы явно вызываете соответствующий метод `Reflect` на `target`, если нужно пробросить действие дальше.
>
> `Reflect` — зеркало встроенных операций языка: `Reflect.get`, `Reflect.set`, `Reflect.has`, `Reflect.defineProperty`, `Reflect.ownKeys` и т.д. В trap **не** пишут `target[prop]` вместо `Reflect.get(target, prop, receiver)` без причины: receiver важен для геттеров на прототипе и корректного `this`. Прямой доступ к `target` в trap обходит перехват — иногда это нужно (чтение «сырых» данных), но по умолчанию делегируйте через `Reflect`.

---

# 4. Самое главное запомнить

- `new Proxy(target, handler)` — обёртка; операции на `proxy` идут в traps `handler`, если trap задан.
- Trap возвращает результат операции (`get` — значение, `set` — boolean успеха, `has` — boolean).
- В trap делегировать через `Reflect.*`, не голый `target[key]`: так сохраняется `receiver` и совпадают стандартные контракты поведения (включая геттеры на прототипе).
- `Reflect.ownKeys` включает строковые ключи, символы и (для массивов) индексы; `Object.keys` — только enumerable string keys.
- `set` trap: `return false` (strict mode → `TypeError`) отклоняет присваивание; `return true` без записи — ложь успеха.
- Proxy не клонирует объект: `target` живёт отдельно; некоторые внутренние слоты (private fields brand) с proxy не перехватываются как обычные ключи.
- Revocable: `Proxy.revocable(target, handler)` → `{ proxy, revoke }`; после `revoke()` любая операция на proxy — `TypeError`.

---

# 5. Описание

```text
код: proxy.age
  → trap get(target, "age", receiver)
      → Reflect.get(target, "age", receiver)  // или своё значение / default
  → результат в выражении

код: proxy.age = -1
  → trap set(target, "age", -1, receiver)
      → false  // отказ
      или Reflect.set(target, "age", -1, receiver)
```

## Базовый trap `get` — значение по умолчанию

```js
const user = { name: 'Alex' };

const profile = new Proxy(user, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver); // ← делегация с receiver
    }
    return 'не задано'; // ← default для отсутствующего ключа
  },
});

profile.name; // 'Alex'
profile.city; // 'не задано' — trap, не поле target
```

## Trap `set` — валидация

```js
const account = { balance: 100 };

const guarded = new Proxy(account, {
  set(target, prop, value, receiver) {
    if (prop === 'balance' && typeof value === 'number' && value < 0) {
      return false; // ← отклонить присваивание
    }
    return Reflect.set(target, prop, value, receiver);
  },
});

guarded.balance = 50; // ok
guarded.balance = -10; // TypeError в strict (или false в sloppy)
```

## `Reflect.ownKeys` vs `Object.keys`

```js
const sym = Symbol('id');
const raw = { a: 1, [sym]: 2 };
const p = new Proxy(raw, {}); // пустой handler — проброс

Reflect.ownKeys(p); // ['a', Symbol(id)]
Object.keys(p);     // ['a'] — без символов
```

## Частые traps

| Trap | Когда срабатывает | Типичное использование |
| --- | --- | --- |
| `get` | чтение свойства | default, лог, derived |
| `set` | присваивание | валидация, иммутабельность |
| `has` | `in` / `Reflect.has` | скрыть ключи |
| `deleteProperty` | `delete` | запрет удаления |
| `ownKeys` | `Object.keys`, spread | фильтр ключей |
| `apply` | вызов функции как `fn()` | обёртка над функцией |
| `construct` | `new Fn()` | фабрика / DI |

## Реактивность (идея)

```js
function reactive(obj, onChange) {
  return new Proxy(obj, {
    set(target, prop, value, receiver) {
      const ok = Reflect.set(target, prop, value, receiver);
      if (ok) onChange(prop, value);
      return ok;
    },
  });
}
```

При изменении через proxy вызывается подписчик — так строят «магию» реактивных фреймворков на уровне идеи (реализация Vue 3 глубже).

## Revocable proxy

```js
const { proxy, revoke } = Proxy.revocable({ secret: 1 }, {});
proxy.secret; // 1
revoke();
proxy.secret; // TypeError: revoked
```

## Proxy ≠ паттерн Proxy (GoF)

Паттерн «Proxy» в классическом ООП — обёртка с тем же интерфейсом (кэш, lazy). Языковой `Proxy` — **метапрограммирование**: перехват **любой** операции на объекте. Паттерн можно реализовать и без `Proxy` (объект-обёртка), и с ним.

---

# 6. Ссылки

- [MDN — Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MDN — Reflect](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect)
- [javascript.info — Proxy](https://javascript.info/proxy)
- [ECMAScript — Proxy internal methods](https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-exotic-objects)
