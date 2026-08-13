# 1. Тема

**Factory Method · Prototype · Proxy · Singleton · Adapter**

---

# 2. Главное в одну фразу

Factory Method и Prototype решают создание объектов; Singleton ограничивает экземпляр; Proxy и Adapter меняют доступ и стыковку без переписывания клиента.

---

# 3. Суть

> Пять паттернов закрывают две оси: **как появляется объект** и **как к нему обращаются**. Factory Method отдаёт создание подклассу или фабричной функции — клиент знает контракт продукта, но не конкретный класс. Prototype копирует готовый экземпляр вместо сборки с нуля. Singleton гарантирует один общий экземпляр (и часто глобальную точку доступа) — удобно для конфига, опасно как скрытая зависимость.
>
> Proxy подставляет суррогат с тем же интерфейсом: ленивая загрузка, кэш, проверка прав, логирование — клиент зовёт «как настоящий», а работа уходит в обёртку. Adapter переводит чужой/legacy API к нужному контракту: клиент говорит на своём языке, адаптер дергает старый.
>
> В JS/TS часто хватает функций и модулей вместо иерархий классов: `createNotifier(type)`, `structuredClone` / ручной clone, `Proxy` языка, модуль с одним экспортом-синглтоном, тонкая обёртка-адаптер. Ловушка — тащить все пять «на вырост»: лишние слои без реальной боли с созданием или стыковкой.

---

# 4. Самое главное запомнить

- Factory Method: клиент зависит от абстракции продукта; *кто* создаёт — creator / фабрика.
- Prototype: новый объект = копия прототипа; важно решить shallow vs deep clone.
- Singleton: один экземпляр на процесс/область; в тестах и DI часто мешает — лучше явная передача.
- Proxy: тот же интерфейс, другая политика доступа/ленивости/кэша.
- Adapter: «переводчик» интерфейсов; не путать с Proxy (у Proxy интерфейс *тот же*).
- Proxy ≠ Adapter: Proxy *контролирует* доступ к своему субъекту; Adapter *меняет* форму API.

---

# 5. Описание

```text
создание                         доступ / стыковка
─────────                        ─────────────────
Factory Method → Product A|B     Proxy → RealSubject (тот же API)
Prototype.clone() → копия        Adapter → LegacyAPI (другой API)
Singleton.getInstance() → один
```

## Factory Method

**Проблема:** клиент размазывает `new ConcreteA()` / `new ConcreteB()` и при новом типе правит все call-site.

**Идея:** создание выносят в метод/функцию creator'а. Клиент вызывает `create()` и получает объект с общим контрактом.

```js
// ← FACTORY METHOD: выбор продукта в одном месте
function createNotifier(channel) {
  if (channel === 'email') return { send: (m) => `mail:${m}` };
  if (channel === 'sms') return { send: (m) => `sms:${m}` };
  throw new Error(`unknown channel: ${channel}`);
}

const n = createNotifier('email');
n.send('hello');
```

В классическом ООП creator — класс с `factoryMethod()`, продукты — иерархия. В JS достаточно map/функции.

## Prototype

**Проблема:** дорогая или сложная инициализация; проще клонировать настроенный образец.

**Идея:** объект умеет `clone()` (или внешняя функция копирования). Новый экземпляр наследует состояние прототипа, затем точечно меняют поля.

```js
const proto = { theme: 'dark', locale: 'ru', clone() {
  return { ...this, clone: this.clone }; // ← shallow; вложенные объекты — общие
}};

const a = proto.clone();
a.locale = 'en';
```

Ловушка: shallow copy делит вложенные ссылки. Для глубокой копии — `structuredClone`, аккуратный рекурсивный clone или библиотека; функции и DOM-узлы `structuredClone` не клонирует.

## Singleton

**Проблема:** нужен ровно один экземпляр ресурса (логгер, конфиг процесса) и единая точка доступа.

```js
// ← модуль ES — естественный singleton на бандл/рантайм
let instance;
export function getConfig() {
  if (!instance) instance = Object.freeze({ apiUrl: '/api', retries: 3 });
  return instance;
}
```

Цена: скрытые зависимости, сложнее подменить в тестах, в SSR/воркерах «один на процесс» легко ошибочно считать «один на пользователя». Предпочитайте явную передачу конфига, если нет жёсткой нужды в глобале.

## Proxy

**Проблема:** к субъекту нельзя ходить напрямую — нужна проверка, кэш, ленивое создание, логирование.

**Идея:** объект с *тем же* интерфейсом; клиент не знает, что говорит с посредником.

```js
function createApiProxy(real) {
  const cache = new Map();
  return {
    get(id) {
      if (cache.has(id)) return cache.get(id); // ← PROXY: кэш
      const value = real.get(id);
      cache.set(id, value);
      return value;
    },
  };
}
```

Языковой `Proxy` в JS — отдельный механизм метапрограммирования; паттерн Proxy можно реализовать и без него (объект-обёртка).

## Adapter

**Проблема:** есть полезный legacy/сторонний API, но клиентский код ждёт другой контракт (`charge(amount)` vs `makePayment({ cents })`).

**Идея:** тонкий слой переводит вызовы и данные.

```js
// legacy
const stripeLegacy = {
  makePayment: ({ cents }) => ({ ok: true, cents }),
};

// ← ADAPTER: клиентский контракт
function createPaymentAdapter(legacy) {
  return {
    charge(amountRub) {
      return legacy.makePayment({ cents: Math.round(amountRub * 100) });
    },
  };
}
```

## Как не перепутать

| | Factory Method | Prototype | Singleton | Proxy | Adapter |
|---|---|---|---|---|---|
| Главный вопрос | *какой* продукт создать? | *как* скопировать? | *сколько* экземпляров? | *как* ходить к субъекту? | *как* стыковать API? |
| Интерфейс для клиента | продукт | копия как оригинал | один объект | **тот же**, что у субъекта | **новый**, удобный клиенту |

В лабе на схеме разобран **Factory Method**: прямой `new` vs создание через фабрику и выбор продукта.

---

# 6. Ссылки

- [Refactoring Guru — Factory Method](https://refactoring.guru/design-patterns/factory-method)
- [Refactoring Guru — Prototype](https://refactoring.guru/design-patterns/prototype)
- [Refactoring Guru — Proxy](https://refactoring.guru/design-patterns/proxy)
- [Refactoring Guru — Singleton](https://refactoring.guru/design-patterns/singleton)
- [Refactoring Guru — Adapter](https://refactoring.guru/design-patterns/adapter)
- [MDN — Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
