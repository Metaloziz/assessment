# 1. Тема

**Библиотеки для нормализации данных и работы с иммутабельными структурами (Immutable.js, Normalizr и др.)**

---

# 2. Главное в одну фразу

Нормализация раскладывает вложенный API-ответ в плоские `entities` + `ids`, а Immer / RTK entity adapter (и реже Immutable.js) дают безопасные обновления без ручного deep-spread.

---

# 3. Суть

> Нормализация данных — приём хранить сущности словарями по `id`, а связи и списки — массивами идентификаторов. Так один пользователь или автор не дублируется в десяти постах, а правка имени обновляет одну запись.
>
> **Normalizr** описывает схему вложенности и делает `normalize` / `denormalize`. В Redux Toolkit ту же форму `ids + entities` даёт **`createEntityAdapter`**. Для иммутабельных правок де-факто стандарт — **Immer** (встроен в RTK): пишете в `draft`, снаружи новый state. **Immutable.js** — отдельные persistent-коллекции со structural sharing; в новых проектах почти не берут из‑за своего API и связки с React.
>
> На практике: plain objects + Immer + entity adapter; Normalizr — когда ответ API глубоко вложен и схем много; Immutable.js — исключение для очень больших коллекций с частыми точечными апдейтами.

---

# 4. Самое главное запомнить

- **Нормализация** → `{ entities: { users: {}, posts: {} }, result: [...] }` (или `ids` + `entities` в RTK).
- Одна сущность — **одно место**; связи через `id`, не через вложенные копии.
- **Normalizr** — schema + `normalize` / `denormalize` для API.
- **`createEntityAdapter`** — CRUD и селекторы над нормализованным slice в RTK.
- **Immer** — стандарт immutable-обновлений; не путать с нормализацией (это про *как* писать update).
- **Immutable.js** — `Map`/`List` и свой API; редко в новых кодовых базах.
- Не нормализуйте всё подряд: маленькие локальные деревья UI иногда удобнее оставить вложенными.

---

# 5. Описание

## Зачем нормализация

Вложенный ответ:

```text
posts[]
  └── author { id, name }   ← один автор скопирован в N постах
  └── comments[]
        └── author { id, name }
```

После нормализации:

```text
entities.users[id]     → { id, name }
entities.posts[id]     → { id, title, author: userId }
entities.comments[id]  → { id, text, author: userId }
result                 → [postId, postId, ...]
```

Правка `users[7].name` сразу видна везде, где UI читает этого пользователя.

## Normalizr

```javascript
import { normalize, schema } from 'normalizr';

const user = new schema.Entity('users');
const comment = new schema.Entity('comments', { author: user });
const post = new schema.Entity('posts', {
  author: user,
  comments: [comment],
});

const normalized = normalize(apiResponse, [post]);
// { entities: { users, posts, comments }, result: [1, 2, ...] }
```

`denormalize` собирает дерево обратно для экрана, которому удобнее вложенный вид.

## createEntityAdapter (RTK)

Встроенный «нормализованный карман» под slice:

```javascript
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(), // { ids: [], entities: {} }
  reducers: {
    userAdded: usersAdapter.addOne,
    usersReceived: usersAdapter.setAll,
    userUpdated: usersAdapter.updateOne,
  },
});
```

Селекторы: `selectAll`, `selectById`, `selectIds` — без ручного обхода словаря.

Связка с async: в `extraReducers` на `fetchPosts.fulfilled` кладёте нормализованный payload через `upsertMany` / `setAll`.

## Immer

Не нормализует сама по себе — упрощает **immutable update**:

```javascript
import { produce } from 'immer';

const next = produce(state, (draft) => {
  draft.entities.users[10].name = 'Anna';
});
```

В `createSlice` Immer уже включён: в `reducers` можно писать «мутации» `draft`.

## Immutable.js

```javascript
import { Map, List } from 'immutable';

const state = Map({ ids: List([1, 2]), entities: Map() });
const next = state.setIn(['entities', '1', 'name'], 'Ada');
```

Плюс — structural sharing и богатые коллекции. Минус — другой тип данных, конвертации на границе с React, кривая обучения. В экосистеме после Immer + plain objects почти вытеснен.

## Как выбирать

| Задача | Инструмент |
|--------|------------|
| Плоский CRUD в Redux | `createEntityAdapter` |
| Глубокий / разношёрстный API | Normalizr (или ручная schema) |
| Удобные immutable-правки | Immer (RTK из коробки) |
| Очень большие коллекции, свой API ок | Immutable.js (редко) |
| Мелкий локальный UI-state | Вложенный plain object без нормализации |

## Типичные вопросы на собеседовании

- Зачем нормализовать? — Убрать дубли сущностей и упростить точечные обновления.
- Normalizr vs entity adapter? — Normalizr разбирает *входной* JSON; adapter держит *slice* в форме ids/entities и даёт CRUD-хелперы.
- Immer заменяет Normalizr? — Нет: Immer про способ обновления, нормализация про форму хранения.
- Почему уходят от Immutable.js? — Plain + Immer проще стыкуются с экосистемой и DevTools.

---

# 6. Ссылки

- [Normalizr](https://github.com/paularmstrong/normalizr)
- [Redux — Normalizing State Shape](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
- [RTK — createEntityAdapter](https://redux-toolkit.js.org/api/createEntityAdapter)
- [Immer](https://immerjs.github.io/immer/)
- [Immutable.js](https://github.com/immutable-js/immutable-js)
