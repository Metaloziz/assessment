# 1. Тема

**Query-параметры**

---

# 2. Главное в одну фразу

Query-параметры — это пары `ключ=значение` после `?` в URL; ими передают фильтры, пагинацию и прочие необязательные настройки запроса, не меняя путь ресурса.

---

# 3. Суть

> Query-параметры (query string) — часть URL после `?`: список пар `name=value`, разделённых `&`. Пример: `/products?category=books&page=2`. Путь (`/products`) говорит, *какой* ресурс, query — *с какими условиями* его отдать.
>
> Так удобно передавать фильтры, сортировку, поиск, `page` / `limit`, флаги UI и UTM-метки: ссылка остаётся bookmarkable, её можно шарить и логировать. Для чувствительных данных (пароли, токены) query не подходит — строка часто попадает в историю, рефереры и access-логи.
>
> Браузер и сервер разбирают строку в словарь ключей. В JS для этого есть `URL` / `URLSearchParams`; на сервере — то же API или готовое поле вроде `req.query`. Значения нужно кодировать (`encodeURIComponent`), иначе пробелы, `&` и кириллица сломают разбор.
>
> Query не заменяет path-параметры (`/users/42`): id сущности обычно в path, а опции выборки — в query. Один ключ может встретиться несколько раз (`?tag=a&tag=b`) — API должно явно решить, брать первое, последнее или список.

---

# 4. Самое главное запомнить

- Query начинается с `?`, пары разделяются `&`, ключ и значение — `=`.
- Path выбирает ресурс; query уточняет запрос (фильтр, страница, сортировка).
- Читать и собирать строку удобно через `URLSearchParams` / `URL`, а не ручным `split`.
- Спецсимволы и пробелы кодируют; сырой ввод в URL без кодирования ломает разбор.
- Пустой query и отсутствующий ключ — разные случаи: проверяйте `has` / `get`, не полагайтесь только на truthy.
- Не кладите секреты в query: они светятся в логах, истории и Referer.

---

# 5. Описание

```text
https://shop.example/products?category=books&page=2&sort=price
│                         │         │
│                         │         └─ query: category=books, page=2, sort=price
│                         └─ path: /products
└─ origin (схема + хост)
```

Разбор одной строки:

```text
?category=books&page=2&sort=price
   │           │      │
   ключ        ключ   ключ
   значение    …      …
```

## Path vs query

| Часть URL | Роль | Пример |
|---|---|---|
| Path | какой ресурс / сущность | `/users/42`, `/orders` |
| Query | опции выборки и отображения | `?page=1&status=open` |

Типичный контракт REST-подобного API: `GET /orders?status=open&page=1` — список заказов с фильтром; `GET /orders/7` — конкретный заказ. Детали REST — в соседней теме; здесь важно не смешивать «кто» и «с какими условиями».

## Чтение и сборка в браузере

```js
const url = new URL('https://shop.example/products?category=books&page=2');
const q = url.searchParams;

q.get('category'); // "books"
q.get('page');     // "2"
q.has('sort');     // false

q.set('page', '3');
q.append('tag', 'sale');
url.search; // "?category=books&page=3&tag=sale"
```

Текущая страница: `new URLSearchParams(location.search)` или `new URL(location.href).searchParams`.

Сборка ссылки без ручной склейки:

```js
const params = new URLSearchParams({ q: 'кофе', page: '1' });
const href = `/search?${params}`; // /search?q=%D0%BA%D0%BE%D1%84%D0%B5&page=1
```

## Кодирование

Символы `&=?#` и пробелы нельзя вставлять «как есть». `URLSearchParams` кодирует при `set` / `toString`. Если собираете строку вручную — `encodeURIComponent(value)`.

| Сырое | В query | Заметка |
|---|---|---|
| пробел | `%20` (часто и `+`) | оба встречаются; парсер обычно понимает оба |
| `a&b=c` | `a%26b%3Dc` | иначе появится лишний ключ |
| кириллица | percent-encoding UTF-8 | иначе «кракозябры» в логах и на сервере |

## На сервере

Сервер получает полный URL запроса. После выбора маршрута по **pathname** handler читает query:

```js
// Node: встроенный URL
import { URL } from 'node:url';

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const page = Number(url.searchParams.get('page') ?? '1');
  const status = url.searchParams.get('status'); // null, если нет
  // …
}
```

В Express и похожих фреймворках часто уже есть объект `req.query` (после middleware разбора). Смысл тот же: словарь строк (иногда массивов при повторяющихся ключах). Числа и булевы из query — это **строки**, пока вы сами не приведёте тип и не проверите диапазон.

## Повторы, пустые значения, ловушки

```text
?tag=js&tag=node     → два значения одного ключа
?q=                  → ключ есть, значение пустая строка
?                    → query пустой
(нет ?)              → query отсутствует
```

- `get` возвращает **первое** значение; для всех — `getAll`.
- `?debug` без `=` в разных парсерах даёт `""` или флаг — сверяйтесь с контрактом API.
- Длинный query раздувает URL (лимиты прокси/браузера); тяжёлые фильтры иногда уводят в body `POST` / отдельный ресурс.
- Кэш и CDN могут считать разные query разными URL — учитывайте при инвалидации.

## Что не класть в query

Пароли, session/JWT, персональные данные «для удобства» в ссылке. Даже `https` не скрывает query от логов сервера, браузерной истории и заголовка `Referer` на сторонних сайтах. Для таких данных — заголовки, cookie с нужными флагами или тело запроса по подходящему методу.

---

# 6. Ссылки

- [MDN: URLSearchParams](https://developer.mozilla.org/ru/docs/Web/API/URLSearchParams)
- [MDN: URL](https://developer.mozilla.org/ru/docs/Web/API/URL)
- [MDN: encodeURIComponent](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [RFC 3986 — Uniform Resource Identifier (URI)](https://www.rfc-editor.org/rfc/rfc3986)
- [WHATWG URL Standard](https://url.spec.whatwg.org/)
