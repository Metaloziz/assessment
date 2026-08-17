# 1. Тема

**MVC, MVP, MVVM**

---

# 2. Главное в одну фразу

MVC, MVP и MVVM режут UI на вид, сценарий и данные; после клика отличается, кто знает `Model` и кто обновляет `View`.

---

# 3. Суть

> MVC, MVP и MVVM — три способа разрезать экран: что рисует виджеты, что принимает жест, где живут данные и правила. Во всех есть `Model` (состояние и инварианты) и `View` (кнопки, поля). Разница — граф связей после «Сохранить»: кто имеет право писать в модель и кто говорит виду, что показать.
>
> Резать нужно, когда экран меняют чаще, чем правила. Если виджет сам валидирует, сам пишет в хранилище и сам решает, как перерисоваться, тот же сценарий нельзя перенести в другой UI или в тест без копипасты. Контроллер, презентер или `ViewModel` держат сценарий; `View` остаётся тонким.
>
> Жест идёт по-разному. В **MVC** `View` отдаёт событие `Controller`; тот меняет `Model`; `View` подписан на модель и перерисовывается — вид **знает** модель, но не должен писать в неё сам. В **MVP** `View` пассивный: `Presenter` и меняет модель, и зовёт `view.setName()`; вид модель не импортирует. В **MVVM** вид биндится к свойствам и командам `ViewModel`; `Model` трогает только VM, синхронизация — через observable / binding, не через ручной `set` из виджета.
>
> Ловушка: называть «MVVM» любой компонент с локальным state — часто это толстый `View` или MVC без подписки. `Controller` не обязан рисовать вид; `Presenter` — обязан. Не тащить все три «на вырост»: нужен наблюдаемый `Model`, пассивный вид или binding — тогда паттерн.

---

# 4. Самое главное запомнить

- MVC: `Controller` меняет `Model`; `View` подписан на модель и может её знать.
- MVP: `Presenter` обновляет и `Model`, и `View`; вид пассивный, модель не видит.
- MVVM: `View` биндится к свойствам и командам `ViewModel`; `Model` трогает только VM.
- `Controller` ≠ `Presenter`: контроллер не обязан звать `view.set…()`.
- Binding — не «любой `useState`»: нужен контракт свойств / команд, на который вид подписан.
- `Model` — данные и правила, не класс с словом Model в имени.

---

# 5. Описание

```text
клик «Сохранить» на поле имени

MVC:   View ──event──► Controller ──set──► Model
       View ◄──subscribe / render──────── Model
       View знает Model; пишет только Controller

MVP:   View ──onSave──► Presenter ──set──► Model
       View ◄──setName()──────── Presenter
       View Model не видит; Presenter рисует View

MVVM:  View ◄──bind name / save──► ViewModel ──set──► Model
       View не зовёт Model; синхронизация через свойства VM
```

## MVC

**Проблема:** обработчик в виджете и запись в хранилище слиплись — сменить DOM на другой UI значит переписать сценарий.

**Идея:** жест идёт в `Controller`. Он вызывает `model.setName()`. `View` подписан на модель (`subscribe` / observer) и читает новое значение. Вид **может знать** модель; писать в неё должен контроллер.

```js
// ← MVC: View подписан на Model, пишет Controller
function createController(model) {
  return {
    save(raw) {
      model.setName(raw.trim()); // ← Controller
    },
  };
}

view.on('submit', (raw) => controller.save(raw));
model.subscribe(() => view.render(model.getName()));
```

Классика Smalltalk / веб-фреймворков: вид наблюдает модель. Ловушка — `onclick` сразу зовёт `model.setName()`: контроллер обойден, это уже толстый вид.

## MVP

**Проблема:** вид знает поля модели и сам решает, что показать после сохранения — тесты сценария тянут DOM.

**Идея:** `View` отдаёт только `onSave(raw)` и принимает `setName(value)`. `Presenter` меняет модель и **сам** обновляет вид. Модель вид не импортирует.

```js
// ← MVP: Presenter рисует View, View Model не видит
function createPresenter(view, model) {
  return {
    onSave(raw) {
      model.setName(raw.trim());
      view.setName(model.getName()); // ← Presenter → View
    },
  };
}
```

`Passive View` (Fowler): вид почти без логики. Отличие от MVC: презентер не полагается на то, что вид сам подписан на модель.

## MVVM

**Проблема:** после каждого `set` вручную звать `view.set…()` — много клея; хочется объявить «поле `name` и команда `save`».

**Идея:** `ViewModel` держит наблюдаемые свойства и команды. Вид биндится к ним. `Model` меняет только VM; вид модель не зовёт.

```js
// ← MVVM: bind к свойству и команде, не к Model
function createViewModel(model) {
  const name = observable(model.getName());
  return {
    name, // ← bind
    save(raw) {
      model.setName(raw.trim());
      name.set(model.getName()); // ← VM, не View
    },
  };
}

bind(input, vm.name);
form.onsubmit = () => vm.save(input.value);
```

В браузере binding — это подписка на observable, не обязательно WPF/`INotifyPropertyChanged`. Ловушка: компонент, который в обработчике сам пишет в API и в локальный state, — не MVVM, пока нет контракта VM.

## Что не путать

| Слово в быту | Часто имеют в виду | Точнее |
| --- | --- | --- |
| «у нас MVC» | файлы `controllers/` | жест → контроллер → модель → вид подписан |
| «это MVVM, есть state» | `useState` в виджете | нужен bind к свойствам / командам VM |
| Presenter = Controller | одно и то же «посередине» | презентер **рисует** вид; контроллер — нет |

React / Vue часто ближе к MVVM (реактивные свойства) или к MVC (контейнер как контроллер). Имя папки не задаёт граф связей: смотрите, кто после клика пишет в `Model` и кто обновляет `View`.

Живой контраст трёх графов — в лабе на одном поле имени.

---

# 6. Ссылки

- [Reenskaug — MVC (Xerox PARC / Smalltalk)](https://folk.universitetetioslo.no/trygver/themes/mvc/mvc-index.html)
- [Fowler — GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html)
- [Fowler — Passive View](https://martinfowler.com/eaaDev/PassiveScreen.html)
- [MSDN — Model-View-Presenter](https://learn.microsoft.com/en-us/archive/msdn-magazine/2006/august/design-patterns-model-view-presenter)
- [Microsoft — MVVM](https://learn.microsoft.com/en-us/dotnet/architecture/maui/mvvm)
