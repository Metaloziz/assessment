# 1. Тема

**Dependency Injection**

---

# 2. Главное в одну фразу

Dependency Injection отдаёт зависимости снаружи: объект получает `Http` / `Logger` готовыми, а не создаёт их внутри через `new` или жёсткий импорт.

---

# 3. Суть

> **Dependency Injection (DI)** — способ собрать объект так, чтобы он **не владел созданием** своих зависимостей. Вместо `new HttpClient()` внутри `OrderService` сервис принимает уже готовый клиент (конструктор, фабрика, аргументы функции). Кто создаёт и стыкует — **composition root** (часто `main`, bootstrap, корневой `Provider`): там выбирают реализацию и передают вниз.
>
> Зачем: подмена в тестах и стендах (`FakeHttp`), смена транспорта без правки бизнес-кода, явный граф зависимостей вместо скрытых синглтонов и «магических» импортов. В JS/TS DI часто выглядит просто: параметры функции, props/Context на корне, тонкий ручной wiring — тяжёлый IoC-контейнер нужен не всегда.
>
> Как: объявить контракт зависимости (`fetchJson`, `Logger`), принять его снаружи, собрать граф в одном месте. Инжект бывает constructor / parameter / property; контейнер (если есть) — реестр «кто кого создаёт», не замена понятному wiring.
>
> Ловушка: **Service Locator** («достану из глобального `container.get` где угодно») маскируется под DI, но снова прячет связи. Другая крайность — контейнер на три класса или DI «на вырост», когда хватило бы двух аргументов в `createOrderService(api, log)`.

---

# 4. Самое главное запомнить

- DI: зависимости **передаются** снаружи; объект их не создаёт.
- Composition root — единственное место, где стыкуют реализации.
- Контракт зависимости важнее конкретной библиотеки (`Http` vs `axios`).
- Подмена в тестах / Storybook — главный практический выигрыш.
- Service Locator ≠ DI: глобальный `get()` снова скрывает граф.
- В JS/TS часто достаточно параметров и ручного wiring; контейнер — по необходимости.

---

# 5. Описание

```text
жёстко:                    DI:
OrderService               CompositionRoot (main)
  └─ new HttpClient()         ├─ HttpClient / FakeHttp
     (снаружи не подменить)   ├─ Logger
                              └─ inject → OrderService(api, log)
```

## Проблема без DI

`OrderService` сам знает, *какой* HTTP и логгер ему нужны:

```ts
// плохо: создание внутри — нельзя подставить Fake в тесте
export function createOrderService() {
  const api = new HttpClient('/api'); // ← жёсткая связь
  return {
    async place(id: string) {
      return api.post('/orders', { id });
    },
  };
}
```

Любая смена клиента или мока правит сам сервис.

## Идея DI

Сервис зависит от **контракта**, получает реализацию снаружи:

```ts
type Http = { post: (url: string, body: unknown) => Promise<unknown> };
type Logger = { info: (msg: string) => void };

// ← DI: зависимости приходят аргументами
export function createOrderService(api: Http, log: Logger) {
  return {
    async place(id: string) {
      log.info(`place ${id}`);
      return api.post('/orders', { id });
    },
  };
}
```

## Composition root

Стыковка — на краю приложения, не в глубине фичи:

```ts
// src/main.ts — composition root
const api = createHttpClient(import.meta.env.VITE_API);
const log = createLogger('orders');
const orders = createOrderService(api, log); // ← inject
```

В тестах тот же `createOrderService(fakeHttp, silentLog)`. В React ту же роль часто играют корневой `Provider` и явная передача клиентов в хуки/сервисы.

## Контейнер (по желанию)

IoC-контейнер (`inversify`, `tsyringe`, …) хранит регистрации и резолвит граф. Имеет смысл при большом числе связей и нескольких lifetime. На маленьком модуле ручной wiring читаемее: видно, кто от кого зависит, без «магии» декораторов.

## DI vs похожее

| | DI | Service Locator | Singleton-модуль |
|---|---|---|---|
| Откуда зависимость | аргумент / ctor | `container.get` в любом месте | `import { api }` |
| Граф связей | явный в root | спрятан | спрятан в импортах |
| Подмена | легко на root / тесте | нужна подмена локатора | сложно без моков модуля |

## Как проверить

В лабе: слоты `OrderService` — либо сервис сам втыкает `Http` (жёстко), либо composition root подключает боевой или `FakeHttp`.

---

# 6. Ссылки

- [Refactoring Guru — Dependency Injection](https://refactoring.guru/design-patterns/dependency-injection)
- [Maria Naggaga / Microsoft — Dependency injection in .NET (идея composition root)](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context)
- [Inversion of Control Containers and the Dependency Injection pattern — Martin Fowler](https://martinfowler.com/articles/injection.html)
