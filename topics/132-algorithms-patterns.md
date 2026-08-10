# 1. Тема

**Стандартные подходы к решению алгоритмических задач (two pointers, backtracking, binary search)**

---

# 2. Главное в одну фразу

Перед кодом выбирают шаблон: два указателя по структуре, двоичный поиск по монотонности или откат (backtracking) по дереву решений — от шаблона зависят и сложность, и то, что писать.

---

# 3. Суть

> Многие задачи укладываются в несколько рабочих шаблонов. **Two pointers** двигают индексы (или быстрый/медленный указатель) по массиву/строке и снимают лишний множитель `n` у наивного двойного цикла. **Binary search** режет пополам область поиска, если ответ или массив упорядочены / условие монотонно. **Backtracking** строит решение по шагам и откатывается, когда ветка зашла в тупик — перебор с отсечением.
>
> Шаблоны не конкурируют «кто лучше вообще»: они заточены под разные свойства входа. Отсортированная пара с суммой — указатели или бинпоиск; «существует ли путь / расстановка» — чаще backtracking; «первый индекс, где предикат стал true» — бинпоиск по ответу.
>
> Ловушка — натянуть не тот шаблон: бинпоиск без монотонности врёт; два указателя на неотсортированных данных без доп. структуры не заменяют HashSet; backtracking без отсечения превращается в полный перебор.

---

# 4. Самое главное запомнить

- **Two pointers** — два индекса / slow-fast; часто O(n) после сортировки или на уже упорядоченных данных.
- **Binary search** — нужна монотонность: `false…false true…true` или отсортированный массив; O(log n) проверок.
- **Backtracking** — выбрать → рекурсия → отменить выбор; плюс pruning.
- Сначала свойство задачи (порядок, монотонность, дерево решений), потом шаблон.
- Указатели ≠ бинпоиск: оба могут идти по массиву, но двигаются по-разному.
- Backtracking ≠ DP: DP кэширует перекрывающиеся подзадачи; backtracking обходит дерево и откатывается.

---

# 5. Описание

## Two pointers

Два индекса `left` / `right` (или `slow` / `fast`) идут по данным и сужают окно или встречаются.

**Пара с суммой** в отсортированном массиве:

```typescript
function twoSumSorted(arr: number[], target: number): [number, number] | null {
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    const sum = arr[left]! + arr[right]!;
    if (sum === target) return [left, right];
    if (sum < target) left++;
    else right--;
  }
  return null;
}
```

Наивный двойной цикл — O(n²) сравнений; после сортировки указатели дают O(n) (плюс O(n log n) на сортировку, если её не было).

**Slow / fast** — цикл в списке, середина списка: быстрый шагает через один.

## Binary search

Ищем индекс или границу, пока отрезок `[lo, hi]` не сомкнётся.

```typescript
function binarySearch(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid]! < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

Обобщение — **поиск по ответу**: `ok(x)` монотонен, ищем минимальный `x`, где `ok` истинен.

Инвариант: на каждой итерации ответ, если есть, лежит в текущем отрезке. Ошибка в `mid ± 1` ломает инвариант → вечный цикл или пропуск.

## Backtracking

Строим частичное решение. На шаге перебираем кандидатов, углубляемся, при выходе **отменяем** изменение (rollback).

Схема:

```text
function bt(state):
  if done(state): record / return
  for choice in candidates(state):
    apply(choice)
    bt(state)
    undo(choice)    ← обязательно
```

Пример — все перестановки длины `n` из уникальных чисел (учебный каркас):

```typescript
function permutations(nums: number[]): number[][] {
  const res: number[][] = [];
  const used = new Array(nums.length).fill(false);
  const path: number[] = [];

  function bt() {
    if (path.length === nums.length) {
      res.push(path.slice());
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]!);
      bt();
      path.pop();
      used[i] = false;
    }
  }

  bt();
  return res;
}
```

Отсечение (pruning): не заходить в ветку, если уже ясно, что она невалидна (ферзи бьют друг друга, сумма превысила лимит и т.д.).

## Когда что брать

| Сигнал в условии | Шаблон |
|------------------|--------|
| Отсортировано / можно отсортировать, пара/окно | Two pointers |
| «Проверить за O(log n)», монотонный предикат | Binary search |
| Расстановки, пути, подмножества с откатом | Backtracking |
| Перекрывающиеся подзадачи + оптимум | DP (отдельная тема) |

## Типичные ловушки

- Бинпоиск на «почти отсортированном» без восстановления порядка.
- Два указателя сдвигают не тот конец при `sum === target` в задачах на число пар.
- Backtracking забывает `undo` → состояние «течёт» между ветками.
- Путают комбинации и перестановки: разный порядок циклов / `used`.

---

# 6. Ссылки

- [LeetCode Explore — Two Pointers](https://leetcode.com/explore/learn/card/array-and-string/205/array-two-pointer-technique/)
- [Wikipedia — Binary search algorithm](https://en.wikipedia.org/wiki/Binary_search_algorithm)
- [Wikipedia — Backtracking](https://en.wikipedia.org/wiki/Backtracking)
- [CP-Algorithms — Binary Search](https://cp-algorithms.com/num_methods/binary_search.html)
