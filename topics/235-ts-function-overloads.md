# 1. Тема

**Перегрузка функций**

---

# 2. Главное в одну фразу

Перегрузка нужна, когда от входа зависит **точный** тип результата: union даёт «`div`|`span` → string|number», overload — «`div`→string, `span`→number».

---

# 3. Суть

> Перегрузка функций в TypeScript — несколько сигнатур без тела (**overload**) и одна реализация с телом. На вызове checker берёт подходящую сигнатуру и даёт **точный** тип результата. В JS после сборки остаётся одна обычная функция.
>
> Зачем: одна логика (`el`), но разный смысл: `"div"` → строка, `"span"` → число. Если написать это одним union, после `el("div")` тип будет `string | number` — связь «дал div → получил строку» пропала. Overload эту связь сохраняет.
>
> Как проверить: одну функцию пишут дважды — через union и через overload — и смотрят тип переменной после вызова. Если return всегда один и тот же — union проще. Если union «размазал» тип или разрешил странный набор аргументов — нужен overload.
>
> Ловушка: городить overload’ы для `len(строка|массив): number` — return один, хватит union. Implementation для caller’а не видна; узкие сигнатуры ставят выше широких.

---

# 4. Самое главное запомнить

- Union: один широкий контракт; результат часто «все варианты сразу».
- Overload: отдельный контракт на каждый вид вызова → точный return.
- Overload чинит связь «какой вход → какой выход» (и лишние арности).
- Один и тот же return → обычно union, не overload.
- Тело одно; для caller’а важны только overload-сигнатуры.
- Порядок: сначала узкие, потом общие.

---

# 5. Описание

```text
одна логика в JS
        │
        ├─ union:     el("div"|"span"): string|number
        │             el("div")  →  string|number   ← связь потеряна
        │
        └─ overload:  el("div"): string
                      el("span"): number
                      el("div")  →  string          ← связь есть
```

## Одна функция: union теряет связь

По тегу возвращаем строку или число. Сначала через union:

```ts
function el(tag: "div" | "span"): string | number {
  if (tag === "div") return "1111";
  return 2222;
}

const fromDiv = el("div");
// fromDiv: string | number  ← UNION: хотя передали "div"
// fromDiv.toUpperCase(); // ошибка
```

Тело одно, но checker не связывает «`div` на входе → строка на выходе».

## Та же функция: overload сохраняет связь

```ts
function el(tag: "div"): string;
function el(tag: "span"): number;
function el(tag: "div" | "span"): string | number {
  // ← IMPL: только тело; caller её не видит
  if (tag === "span") return 2222;
  return "1111";
}

const fromDiv = el("div"); // string
fromDiv.toUpperCase(); // ок

const fromSpan = el("span"); // number
```

Рантайм тот же; меняется только обещание типов. Overload как раз про это: известный литерал на входе → узкий тип выхода.

| | Union | Overload |
| --- | --- | --- |
| Контракт | один широкий | несколько точных |
| `el("div")` | `string \| number` | `string` |
| Когда брать | return один | разный return от входа |

## Арность: сколько аргументов можно передать

Иногда важны только «1 аргумент» или «3», без середины. Union через `?` пропускает лишнее:

```ts
function score(points: number, bonus?: number, mult?: number): number {
  return points + (bonus ?? 0) * (mult ?? 1);
}

score(10); // ок
score(10, 2, 3); // ок
score(10, 2); // типы ок — но «бонус без множителя» вы не хотели
```

Overload оставляет только нужные формы:

```ts
function score(points: number): number;
function score(points: number, bonus: number, mult: number): number;
function score(points: number, bonus?: number, mult?: number): number {
  return points + (bonus ?? 0) * (mult ?? 1);
}

score(10, 2); // ошибка: такой сигнатуры нет
```

## Когда union лучше

Return всегда `number` — overload не даёт выигрыша:

```ts
function len(x: string | number[]): number {
  return x.length;
}
```

Два overload’а с тем же `number` — лишний шум. Плюс значение типа `string | number[]` в union-версию передать проще.

## Сигнатуры и порядок

Строки без тела — контракт для вызова. Строка с телом — только для реализации. Сначала узкие overload’ы, потом общие.

---

# 6. Ссылки

- [TypeScript Handbook — Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [TypeScript Handbook — Writing Good Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#writing-good-overloads)
- [TypeScript Handbook — Functions (legacy: Overloads)](https://www.typescriptlang.org/docs/handbook/functions.html#overloads)
- [TypeScript Handbook — More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript Playground](https://www.typescriptlang.org/play)
