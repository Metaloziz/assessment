# 1. Тема

**IndexedDB**

---

# 2. Главное в одну фразу

IndexedDB — асинхронная NoSQL-база в браузере для больших структурированных данных: object stores, индексы, транзакции, работа в рамках origin.

---

# 3. Суть

> Когда `localStorage` мал и синхронен, берут **IndexedDB**: хранение объектов/файлов/кэша API, офлайн-данные. Единицы: **database** → **object store** → записи; поиск ускоряют **indexes**. Все изменения — в **transactions** (`readonly` / `readwrite`) с атомарностью.
>
> API событийное (`onsuccess`/`onerror`) или через обёртки/`idb`. Версия БД растёт в `onupgradeneeded` (создание store/index). Данные видны в DevTools → Application → IndexedDB.
>
> Не хранить секреты в открытом виде; чистить при logout. Для простых флагов UI часто хватает localStorage; для объёма и запросов — IDB (или обёртки вроде Dexie).

---

# 4. Самое главное запомнить

- Async, origin-scoped, больше лимит чем у localStorage.
- Object store ≈ таблица; keyPath / key generator.
- Транзакции: атомарность + типы readonly/readwrite.
- Схема меняется только в `onupgradeneeded`.
- Отладка в Application → IndexedDB.

| Понятие | Смысл |
|---|---|
| Object store | Коллекция записей |
| Index | Быстрый поиск по полю |
| Transaction | Атомарная группа операций |
| onupgradeneeded | Миграция схемы |

---

# 5. Описание

### Открытие и схема

```javascript
const request = indexedDB.open('AppDB', 1)

request.onupgradeneeded = (event) => {
  const db = event.target.result
  const store = db.createObjectStore('users', { keyPath: 'id' })
  store.createIndex('nameIndex', 'name', { unique: false })
}

request.onsuccess = () => {
  const db = request.result
  const tx = db.transaction('users', 'readwrite')
  tx.objectStore('users').put({ id: 1, name: 'Ada' })
}
```

### Чтение

```javascript
const tx = db.transaction('users', 'readonly')
const getReq = tx.objectStore('users').get(1)
getReq.onsuccess = () => console.log(getReq.result)
```

### Зачем транзакции

Несколько операций либо все применяются, либо откатываются при ошибке; `readwrite` на store не параллелится с другим `readwrite` на том же store.

### Практика

- кэш списков/черновиков офлайн;
- большие JSON/blobs;
- не как единственное хранилище auth token без дополнительной защиты.

---

# 6. Ссылки

- [MDN — IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Chrome DevTools — IndexedDB](https://developer.chrome.com/docs/devtools/storage/indexeddb/)
- [Jake Archibald — IndexedDB](https://www.youtube.com/watch?v=HbRm64l7H4A) (обзор идей; плюс статья [idb](https://github.com/jakearchibald/idb))
