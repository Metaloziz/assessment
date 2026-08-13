# 1. Тема

**Chain of Responsibility · Abstract Factory · Strategy · Decorator**

---

# 2. Главное в одну фразу

Chain передаёт запрос по цепочке обработчиков; Abstract Factory собирает согласованные семейства объектов; Strategy подменяет алгоритм; Decorator наращивает поведение обёртками без наследования.

---

# 3. Суть

> Четыре паттерна закрывают разные оси изменений. **Chain of Responsibility** строит цепочку обработчиков с общим интерфейсом: каждый решает «обработать сам или передать дальше» — типично для middleware, валидации формы, фильтров логов. **Abstract Factory** выдаёт *семейство* связанных продуктов (кнопка + поле + модалка в одной теме) без привязки клиента к конкретным классам. **Strategy** выносит взаимозаменяемый алгоритм (скидка, доставка, сортировка) в отдельные объекты/функции; контекст дергает общий контракт. **Decorator** оборачивает объект тем же интерфейсом и добавляет шаги до/после вызова — лог, кэш, метрики — без раздувания иерархии наследования.
>
> В JS/TS цепочка — массив `(ctx, next) => …` или linked list `setNext`; стратегия — map `kind → fn` или поле `strategy` в объекте; декоратор — функция `wrap(fn)` / HOC; абстрактная фабрика — модуль `createDarkTheme()` / `createLightTheme()`, возвращающий набор компонентов или стилей.
>
> Ловушка: Chain превращают в «все if подряд в одной функции» без явной передачи; Strategy путают с простым `switch` без выделения контракта; Decorator — с Adapter (декоратор *сохраняет* API); Abstract Factory — с Factory Method (фабрика *одного* продукта vs *семейства*).

---

# 4. Самое главное запомнить

- Chain: обработчик либо завершает работу, либо зовёт `next` / следующий звено; порядок звеньев важен.
- Abstract Factory: клиент получает согласованный набор продуктов одной «линейки» (тема, платформа).
- Strategy: алгоритм подставляется извне; контекст не знает деталей реализации, только контракт.
- Decorator: тот же интерфейс, больше поведения слоями; можно складывать несколько обёрток.
- Chain ≠ простой pipeline без «решения»: каждое звено *может* остановить цепочку.
- Decorator ≠ наследование «SuperClassWithLogging»: обёртки комбинируют гибче, чем дерево подклассов.
- Abstract Factory ≠ Factory Method: семейство связанных типов vs один продукт на выбор.

---

# 5. Описание

```text
Chain:     Request → H1 → H2 → H3 → …  (H может stop или next)
Strategy:  Context ──uses──► StrategyA | StrategyB
Decorator: Client → Decorator → Decorator → Core (тот же API)
Abstract:  Client → AbstractFactory.createX() + createY()  (одна линейка)
```

## Chain of Responsibility

**Проблема:** один «богатый» обработчик копит `if (auth) … if (rateLimit) … if (validate) …`; новый шаг ломает все call-site.

**Идея:** каждый concern — отдельное звено. Звено обрабатывает или передаёт дальше.

```js
// ← CHAIN: каждое звено решает — stop или next
function createChain(handlers) {
  return async function run(ctx) {
    let i = 0;
    async function next() {
      const h = handlers[i++];
      if (!h) return;
      await h(ctx, next); // ← передать дальше
    }
    await next();
  };
}

const pipeline = createChain([
  async (ctx, next) => {
    if (!ctx.token) throw new Error('auth'); // ← stop
    await next();
  },
  async (ctx, next) => {
    if (ctx.count > 100) throw new Error('rate'); // ← stop
    await next();
  },
  async (ctx) => {
    ctx.result = 'ok'; // ← финальный обработчик
  },
]);
```

Express/Koa middleware — практический Chain: `app.use(auth); app.use(logger); app.use(handler)`.

## Abstract Factory

**Проблема:** UI или SDK должны быть согласованы (все контролы «тёмные» или «светлые»), но клиент не должен мешать `DarkButton` с `LightInput`.

**Идея:** фабрика семейства возвращает набор фабричных методов или объект с продуктами одной линейки.

```js
// ← ABSTRACT FACTORY: семейство light / dark
function createLightTheme() {
  return {
    Button: (props) => ({ type: 'button', theme: 'light', ...props }),
    Input: (props) => ({ type: 'input', theme: 'light', ...props }),
  };
}

function createDarkTheme() {
  return {
    Button: (props) => ({ type: 'button', theme: 'dark', ...props }),
    Input: (props) => ({ type: 'input', theme: 'dark', ...props }),
  };
}

const ui = createDarkTheme();
ui.Button({ label: 'Save' });
ui.Input({ name: 'email' });
```

Отличие от Factory Method: не один `createButton(channel)`, а *набор* согласованных типов из одной фабрики.

## Strategy

**Проблема:** контекст раздувается `if (plan === 'fixed') … else if (plan === 'percent') …` при каждом новом тарифе.

**Идея:** алгоритмы — взаимозаменяемые стратегии с общим методом `calculate(ctx)`.

```js
const strategies = {
  fixed: (ctx) => ctx.base - 500,
  percent: (ctx) => ctx.base * (1 - ctx.rate),
};

function checkout(ctx, strategyKey) {
  const strategy = strategies[strategyKey];
  if (!strategy) throw new Error(`unknown strategy: ${strategyKey}`);
  return strategy(ctx); // ← Strategy: контекст не знает формулу
}
```

Стратегию можно передать снаружи (DI, props, конфиг) и подменить в тестах без правки контекста.

## Decorator

**Проблема:** нужны лог, тайминг и кэш вокруг одного `fetchUser`, но наследование `LoggingCachingFetch extends Fetch` быстро раздувается.

**Идея:** обёртка с *тем же* интерфейсом добавляет поведение до/после делегирования.

```js
function withLogging(fn, name) {
  return async (...args) => {
    console.log(`→ ${name}`, args); // ← DECORATOR: до
    const result = await fn(...args);
    console.log(`← ${name}`, result); // ← после
    return result;
  };
}

const fetchUser = async (id) => ({ id, name: 'Ann' });
const traced = withLogging(fetchUser, 'fetchUser');
```

В React HOC и композиция компонентов (`<WithAuth><Page /></WithAuth>`) — тот же смысл: слои без изменения контракта дочернего.

## Как не перепутать

| | Chain | Abstract Factory | Strategy | Decorator |
|---|---|---|---|---|
| Главный вопрос | *кто* обработает запрос? | *какое семейство* создать? | *какой алгоритм* применить? | *что добавить* вокруг вызова? |
| Связь | линейная цепочка, возможен stop | набор согласованных продуктов | контекст → стратегия | wrap(core), API тот же |
| Типичный след | middleware, filters | theme/platform kits | pricing, sort, export | log/cache/metrics HOC |

В лабе на схеме разобран **Chain of Responsibility**: монолитный middleware vs цепочка с остановкой на auth.

---

# 6. Ссылки

- [Refactoring Guru — Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility)
- [Refactoring Guru — Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory)
- [Refactoring Guru — Strategy](https://refactoring.guru/design-patterns/strategy)
- [Refactoring Guru — Decorator](https://refactoring.guru/design-patterns/decorator)
- [Express — Writing middleware](https://expressjs.com/en/guide/writing-middleware.html)
