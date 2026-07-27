# 1. Тема

**Библиотеки для нормализации данных и работы с иммутабельными структурами (Immutable.js, Normalizr и др.)**

---

# 2. Главное в одну фразу

Нормализация переводит вложенные API-ответы в плоскую структуру `entities + ids`, а immutable-библиотеки упрощают безопасные обновления без ручного spread и глубокого копирования.

---

# 3. Ответ для собеседования

> «Когда API отдаёт вложенные данные, хранить их как есть неудобно: дублирование, сложные обновления. **Нормализация** раскладывает данные в словарь сущностей по `id` и массивы идентификаторов.
>
> **Normalizr** — схема + `normalize()` / `denormalize()`.
> **Immer** — пишешь как при мутации, на выходе immutable state (де-факто стандарт в React/Redux).
> **Immutable.js** — persistent structures со structural sharing; сейчас реже в новых проектах.
> **RTK createEntityAdapter** — встроенная нормализация CRUD без Normalizr.
>
> На практике: plain objects + Immer + entity adapter; Normalizr — для сложных API; Immutable.js — редко, при очень больших коллекциях.»

---

# 4. Самое главное запомнить

- **Нормализация** = `entities` + `result`.
- **Normalizr** — схема для API-ответов.
- **Immer** — стандарт для immutable-обновлений.
- **Immutable.js** — structural sharing, отдельный API.
- **createEntityAdapter** — нормализация в RTK.

---

# 5. Описание

## Зачем нормализация

Вложенный ответ дублирует авторов/сущности. После нормализации каждая сущность в одном месте, связи через `id`.

## Normalizr

```javascript
const user = new schema.Entity('users');
const post = new schema.Entity('posts', { author: user });
const normalized = normalize(data, [post]);
```

## createEntityAdapter

```javascript
const usersAdapter = createEntityAdapter();
// state = { ids: [...], entities: { ... } }
```

## Immer

```javascript
const next = produce(state, draft => {
  draft.users[10].name = 'Anna';
});
```

## Выбор

| Задача | Инструмент |
|--------|------------|
| CRUD в Redux | createEntityAdapter |
| Сложный API | Normalizr |
| Immutable updates | Immer |
| Очень большие коллекции | Immutable.js (редко) |

---

# 6. Ссылки

- [Normalizr](https://github.com/paularmstrong/normalizr)
- [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [RTK — createEntityAdapter](https://redux-toolkit.js.org/api/createEntityAdapter)
- [Immer](https://immerjs.github.io/immer/)
- [Immutable.js](https://github.com/immutable-js/immutable-js)
