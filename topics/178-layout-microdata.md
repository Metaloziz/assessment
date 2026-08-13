# 1. Тема

**Микроразметка:** Schema.org · JSON-LD · Microdata · rich results

---

# 2. Главное в одну фразу

Микроразметка добавляет к HTML машиночитаемые факты (тип сущности и свойства), чтобы поисковики и другие парсеры собрали карточку товара, статьи или организации, а не только видимый текст.

---

# 3. Суть

> **Микроразметка** (structured data) — способ описать смысл страницы для машин: «это `Product` с `name`, `offers.price` и `aggregateRating`», а не просто абзац с ценой. Словарь почти всегда **Schema.org**; в разметке его подключают через **JSON-LD** (блок `<script type="application/ld+json">`), атрибуты **Microdata** (`itemscope` / `itemtype` / `itemprop`) или реже RDFa.

> Зачем: краулер видит структуру и может показать **rich result** — звёзды, цену, FAQ, хлебные крошки. Без разметки остаётся обычный сниппет из title и текста. Для продукта, рецепта, события и статьи это заметно влияет на кликабельность выдачи.

> Как работает поток. В HTML кладут описание сущности по типам Schema.org. Парсер (Google, Bing, валидатор) извлекает граф: тип + свойства. JSON-LD обычно отделён от вёрстки и проще поддерживать в SPA/SSR; Microdata живёт рядом с видимыми узлами. Валидность и совпадение с тем, что видит пользователь, проверяют Rich Results Test / Schema Markup Validator.

> Ловушка: разметка ≠ волшебный SEO-буст и не заменяет контент. Неверный `@type`, пустые обязательные поля, цена в JSON-LD «999», а на странице «от 1200», или разметка только на клиенте после гидрации — rich result не появится или будет отклонён. Дублировать один и тот же факт и в JSON-LD, и в Microdata без нужды не стоит.

---

# 4. Самое главное запомнить

- Цель — машиночитаемые факты (тип + свойства), не «красивее HTML».
- Словарь — Schema.org; форматы — JSON-LD (предпочтительно), Microdata, RDFa.
- JSON-LD: `<script type="application/ld+json">` с `@context` и `@type`.
- Microdata: `itemscope` + `itemtype` на контейнере, `itemprop` на полях.
- Rich result зависит от типа, обязательных полей и согласованности с видимым контентом.
- Проверка — Rich Results Test / Schema Markup Validator, не «на глаз по title».

---

# 5. Описание

```text
  HTML (видимый UI)
       │
       ├─ JSON-LD  <script type="application/ld+json">
       │            { "@type": "Product", "name": … }
       │
       └─ Microdata  itemscope itemtype="…/Product"
                     itemprop="name" | "price" | …
              │
              ▼
         парсер / краулер
              │
              ▼
         граф сущностей  →  rich result (карточка в выдаче)
```

## Зачем отдельно от семантики HTML

`<h1>`, `<article>`, `<time>` помогают браузеру и a11y, но не задают коммерческий тип «товар с оффером». Schema.org как раз про **доменные** сущности: `Product`, `Article`, `Organization`, `BreadcrumbList`, `FAQPage`.

Микроразметка не рисует UI и не заменяет Open Graph для соцсетей — это другой потребитель (в первую очередь поисковые системы).

## JSON-LD

Отдельный JSON в `<head>` или в конце `<body>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Наушники Pro",
  "image": "https://example.com/phones.jpg",
  "offers": {
    "@type": "Offer",
    "price": "4990",
    "priceCurrency": "RUB",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "reviewCount": "128"
  }
}
</script>
```

Плюсы: не путается с CSS/классами, удобно генерировать на сервере, один блок на страницу (или несколько скриптов). Минус: нужно синхронизировать с тем, что реально показано пользователю.

## Microdata

Свойства «привязаны» к DOM:

```html
<article itemscope itemtype="https://schema.org/Product">
  <h1 itemprop="name">Наушники Pro</h1>
  <img itemprop="image" src="/phones.jpg" alt="" />
  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="price">4990</span>
    <meta itemprop="priceCurrency" content="RUB" />
  </div>
</article>
```

Удобно, когда значение уже в разметке. Хуже масштабируется в компонентах с условной вёрсткой; вложенные `itemscope` легко сломать.

## Типичные типы

| Тип | Что описывает | Часто в rich |
| --- | --- | --- |
| `Product` + `Offer` | товар, цена, наличие | цена, availability |
| `Article` / `BlogPosting` | статья | заголовок, дата, автор |
| `BreadcrumbList` | крошки | путь в сниппете |
| `Organization` | бренд / компания | логотип, контакты |
| `FAQPage` | вопрос–ответ | раскрывашки в выдаче |

Список поддерживаемых rich results у поисковиков меняется — ориентир на их документацию, не на «все типы Schema.org».

## Проверка и ловушки

1. **Обязательные поля** типа не заполнены → тип распознан слабо или rich нет.
2. **Расхождение** JSON-LD и UI → риск ручного/авто отклонения.
3. **Только клиентский** `document.write` / `useEffect` без SSR — краулер может не увидеть блок.
4. **Микроразметка ≠ a11y**: `itemprop` не заменяет `label` и роли.
5. Несколько конфликтующих описаний одной сущности без нужды усложняют отладку.

Практический порядок: выбрать тип → заполнить обязательное → выложить JSON-LD (или Microdata) → прогнать валидатор → сверить с видимой страницей.

---

# 6. Ссылки

- [Schema.org](https://schema.org/)
- [Google — Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [MDN — Microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata)
- [MDN — JSON-LD](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#data_blocks_json-ld)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
