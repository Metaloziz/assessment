# 1. Тема

**Template Method · Flyweight · Bridge**

---

# 2. Главное в одну фразу

Template Method фиксирует скелет алгоритма и оставляет хуки; Flyweight делит много объектов на общее intrinsic и внешний extrinsic; Bridge разводит абстракцию и реализацию по разным осям изменения.

---

# 3. Суть

> Три паттерна про разные оси: **порядок шагов**, **экономия повторяющихся данных**, **независимое развитие двух иерархий**. **Template Method** (поведенческий) задаёт каркас в базовом методе (`open → read → close`), а варьируемые куски — в хуках/`override`: отчёты, пайплайн парсера, жизненный цикл виджета. **Flyweight** (структурный) выносит тяжёлое *общее* (шрифт глифа, текстура иконки, стиль клетки) в разделяемый объект; у каждого «экземпляра» остаются лёгкие внешние координаты и контекст. **Bridge** (структурный) держит абстракцию (`Remote`) и реализацию (`Device` / канал) связанными композицией, а не наследованием «Remote×Device» — чтобы менять UI и бэкенд/драйвер по отдельности.
>
> В JS/TS template часто — базовый класс или функция высшего порядка со слотами; flyweight — `Map` ключ→shared + тонкие обёртки; bridge — абстракция держит `impl` и делегирует (`this.device.power()`).
>
> Ловушка: Template Method путают со Strategy (там *весь* алгоритм подменяют снаружи; здесь скелет фиксирован); Flyweight — с обычным кэшем без разделения intrinsic/extrinsic; Bridge — с Adapter (адаптер стыкует *уже готовые* контракты, мост проектирует две оси *заранее*). Не тащить все три «на вырост»: нужен каркас шагов, пул shared-данных или две независимые иерархии — тогда паттерн.

---

# 4. Самое главное запомнить

- Template Method: скелет в базе, вариации в хуках; порядок шагов не ломают наследники.
- Flyweight: intrinsic общий и неизменяемый; extrinsic передают снаружи на каждый вызов.
- Bridge: абстракция *имеет* реализацию (композиция), а не размножает подклассы «A×B».
- Template ≠ Strategy: Strategy подменяет алгоритм целиком; Template фиксирует каркас.
- Flyweight ≠ «просто кэш»: без разделения shared/context это обычный memo.
- Bridge ≠ Adapter: Adapter чинит несовместимость; Bridge заранее разводит две оси изменений.

---

# 5. Описание

```text
Template:   algorithm()
              ├── stepA()      ← fixed
              ├── hook()       ← override
              └── stepC()      ← fixed

Flyweight:  Glyph("A") ──shared──► many {x,y} contexts
            Factory.get("A") → тот же intrinsic

Bridge:     Abstraction ──────► Implementation
            Remote.on()         Tv.power() / Radio.power()
```

## Template Method

**Проблема:** три отчёта копируют «открыть → собрать строки → закрыть», отличаясь только серединой.

**Идея:** базовый `run()` вызывает шаги по порядку; наследник переопределяет только `buildRows()`.

```js
// ← TEMPLATE: каркас фиксирован, хук — в subclass / слоте
class Report {
  run() {
    this.open();
    const rows = this.buildRows(); // ← hook
    this.close(rows);
  }
  open() {
    /* … */
  }
  close(rows) {
    /* … */
  }
  buildRows() {
    throw new Error('override');
  }
}

class SalesReport extends Report {
  buildRows() {
    return [{ sku: 'A', qty: 2 }]; // ← только вариация
  }
}
```

В функциональном стиле то же: `function pipeline({ buildRows }) { open(); const r = buildRows(); close(r); }`. Не путать со Strategy: там клиент подставляет *весь* алгоритм; здесь нельзя переставить `open`/`close` местами без правки базы.

## Flyweight

**Проблема:** тысяча иконок на канвасе — у каждой копия PNG/пути/метрик шрифта.

**Идея:** factory отдаёт один shared-глиф на ключ; рисование принимает `(x, y)` снаружи.

```js
// ← FLYWEIGHT: intrinsic в Map, extrinsic — аргументы draw
const glyphs = new Map();

function getGlyph(char) {
  if (!glyphs.has(char)) {
    glyphs.set(char, { char, width: 8, path: `glyph:${char}` }); // ← intrinsic
  }
  return glyphs.get(char);
}

function draw(char, x, y) {
  const g = getGlyph(char);
  return { path: g.path, at: [x, y] }; // ← extrinsic x,y
}

draw('A', 0, 0);
draw('A', 10, 0); // тот же Glyph("A")
```

Intrinsic лучше держать immutable. Ловушка: класть координаты *внутрь* shared-объекта — тогда «экономия» ломает всех клиентов сразу.

## Bridge

**Проблема:** `RemoteTv`, `RemoteRadio`, `RemoteTvWifi`… — комбинаторный взрыв подклассов.

**Идея:** `Remote` держит `device` и делегирует; устройства живут своей иерархией.

```js
// ← BRIDGE: абстракция композирует реализацию
function createRemote(device) {
  return {
    toggle() {
      device.power(); // ← делегирование в impl
    },
    setDevice(next) {
      device = next; // ← смена реализации без смены Remote
    },
  };
}

const tv = { power: () => 'tv-on' };
const radio = { power: () => 'radio-on' };

const remote = createRemote(tv);
remote.toggle(); // tv-on
remote.setDevice(radio);
remote.toggle(); // radio-on
```

В UI/API то же: экран держит `transport` (REST / WS), кнопка зовёт `transport.send` — оси «что на экране» и «как доставить» меняются независимо. Adapter подключают, когда *уже есть* чужой интерфейс; Bridge закладывают, когда обе стороны проектируете сами.

## Как не перепутать

| | Template Method | Flyweight | Bridge |
|---|---|---|---|
| Главный вопрос | *какой* каркас шагов? | *что* можно разделить между N объектами? | *как* развести две оси изменений? |
| Связь | база → хуки | factory → shared + context | abstraction → impl |
| Типичный след | report/pipeline lifecycle | glyphs, иконки, клетки сетки | remote↔device, UI↔transport |

В лабе переключателем разобраны каркас отчёта, shared-глиф и смена реализации у пульта.

---

# 6. Ссылки

- [Refactoring Guru — Template Method](https://refactoring.guru/design-patterns/template-method)
- [Refactoring Guru — Flyweight](https://refactoring.guru/design-patterns/flyweight)
- [Refactoring Guru — Bridge](https://refactoring.guru/design-patterns/bridge)
- [Refactoring Guru — Template Method vs Strategy](https://refactoring.guru/design-patterns/template-method#relations-with-other-patterns)
- [MDN — Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
