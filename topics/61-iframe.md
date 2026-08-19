# 1. Тема

**iframe**

---

# 2. Главное в одну фразу

`iframe` создаёт отдельный browsing context внутри страницы: доступ к DOM зависит от origin, изоляцию режет `sandbox`, а безопасная связь почти всегда строится через `postMessage`.

---

# 3. Суть

> **`iframe`** создаёт вложенный browsing context: у него свой `document`, своя история навигации, свой `window` и свои политики безопасности. Это не просто «вставить кусок HTML», а запустить внутри страницы другой документ.
>
> Главный практический вопрос: **кто кому видит DOM**. Если родитель и child на одном origin, parent может читать `contentWindow` / `contentDocument`, менять DOM iframe и вызывать его JS. Если origin разный, same-origin policy режет прямой доступ: останется только явный мост вроде `postMessage`.
>
> **`sandbox`** нужен, когда сам iframe недоверенный или должен жить в более жёсткой песочнице. Пустой `sandbox` почти всё запрещает; `allow-scripts`, `allow-forms`, `allow-downloads`, `allow-popups`, `allow-top-navigation-by-user-activation` возвращают только нужные права. Важная ловушка middle-уровня: сочетание `allow-scripts` + `allow-same-origin` для same-origin контента почти снимает изоляцию.
>
> Для связи parent ↔ child на практике делают **протокол сообщений**: `postMessage`, проверка `origin`, проверка `source`, валидация `event.data`. Это обязательнее, чем «просто послать объект», потому что во фрейм могут прийти сообщения не только от ожидаемого документа.
>
> Обратная сторона встраивания: **clickjacking**. Если ваш UI можно встроить в чужой iframe, атакующий может накрыть опасную кнопку своим интерфейсом. Защита ставится на стороне встраиваемой страницы через CSP `frame-ancestors` или `X-Frame-Options`.

---

# 4. Самое главное запомнить

- `iframe` живёт как отдельный документ, а не как DOM-фрагмент родителя.
- `contentDocument` / `contentWindow` доступны только при same-origin; cross-origin и sandbox быстро это ломают.
- `sandbox` включают по принципу least privilege: открыть только те `allow-*`, без которых сценарий не работает.
- `allow-scripts` + `allow-same-origin` для недоверенного контента почти всегда красный флаг.
- `postMessage` безопасен только вместе с проверкой `origin`, `source` и формата `data`.
- `allow` и `sandbox` решают разные задачи: `allow` даёт feature policy (`fullscreen`, `camera`, `payment`), `sandbox` ограничивает сам документ.
- Защита от того, чтобы встроили уже вас: `Content-Security-Policy: frame-ancestors` и/или `X-Frame-Options`.
- У iframe должен быть осмысленный `title`, иначе скринридеру трудно объяснить, что это за встроенный контент.

| Механизм | Что решает |
|---|---|
| Same-origin policy | Можно ли напрямую читать/менять DOM child |
| `sandbox` | Какие способности вообще остаются у iframe |
| `postMessage` | Явный контракт связи между окнами |
| `allow` | Какие browser features разрешены внутри iframe |
| `frame-ancestors` / `X-Frame-Options` | Можно ли встраивать ваш документ |

---

# 5. Описание

## Что именно создаёт iframe

```text
parent page
  └── <iframe>
        └── child window
              ├── свой document
              ├── своя history
              ├── свой origin
              └── свои permissions / sandbox rules
```

Из-за этого iframe удобен для виджетов, preview и изоляции недоверенного UI: браузер уже умеет отделять такой документ от родителя.

## Same-origin: когда parent видит child

```html
<iframe
  src="/widgets/checkout.html"
  title="Платёжный виджет"
></iframe>
```

```js
const frame = document.querySelector('iframe');
const childDoc = frame?.contentDocument; // ← только same-origin

if (childDoc) {
  childDoc.body.classList.add('ready');
}
```

Если iframe грузит документ с того же origin, это почти «соседнее окно вашего приложения»: parent может читать DOM, дергать методы child и наоборот. Удобно, но для недоверенного HTML это уже не изоляция.

## Cross-origin и безопасный мост

Когда iframe грузится с другого origin, прямой доступ ломается:

```js
const frame = document.querySelector('iframe');

try {
  console.log(frame.contentDocument.body.innerHTML);
} catch (error) {
  console.log(error.name); // SecurityError
}
```

Тогда связь идёт через `postMessage`:

```js
// parent → iframe
frame.contentWindow?.postMessage(
  { type: 'checkout:init', currency: 'RUB' },
  'https://pay.example.com',
);

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://pay.example.com') return; // ← кто прислал
  if (event.source !== frame.contentWindow) return;       // ← тот ли iframe
  if (event.data?.type !== 'checkout:ready') return;      // ← тот ли контракт

  console.log('виджет готов');
});
```

Middle-ошибка здесь не в том, что `postMessage` «опасен сам по себе», а в том, что его часто принимают без фильтров или шлют с `targetOrigin="*"`, хотя адрес партнёра известен.

## `sandbox`: урезать возможности child

```html
<iframe
  src="https://pay.example.com"
  title="Оплата"
  sandbox="allow-scripts allow-forms"
></iframe>
```

Что важно помнить:

- пустой `sandbox=""` даёт максимально жёсткую изоляцию;
- `allow-scripts` разрешает JS внутри child, но не возвращает same-origin;
- `allow-same-origin` убирает opaque origin и снова делает документ «своим»;
- `allow-scripts allow-same-origin` для same-origin страницы почти сводит sandbox на нет;
- `allow-top-navigation-by-user-activation` и похожие флаги открывают очень конкретные возможности и должны добавляться осознанно.

На практике `sandbox` полезен для preview пользовательского HTML, встроенных админских инструментов и партнёрских виджетов, когда не нужен полный доступ child-страницы.

## `allow` не равен `sandbox`

```html
<iframe
  src="https://player.example.com"
  title="Видео"
  allow="fullscreen; autoplay"
  sandbox="allow-scripts"
></iframe>
```

`allow` управляет browser features и permission policy: `fullscreen`, `camera`, `microphone`, `payment` и так далее.  
`sandbox` ограничивает сам документ как среду исполнения. Эти атрибуты часто стоят рядом, но решают разные задачи.

## `srcdoc`, `about:blank` и неожиданный origin

У middle-разработчика часто всплывает нюанс: не все iframe одинаково «чужие».

- `srcdoc` без sandbox обычно наследует same-origin родителя;
- `about:blank`, открытый из same-origin родителя, тоже нередко оказывается доступным;
- sandbox без `allow-same-origin` создаёт opaque origin, поэтому child может начать слать сообщения с origin вроде `"null"`.

Из этого следует практическое правило: если iframe стал sandboxed и origin больше не обычный, в `message`-обработчике часто приходится проверять не только `origin`, но и `source`, а для отправки в child использовать не точный origin, а `'*'` там, где другого безопасного адреса нет.

## Clickjacking и защита встраиваемой страницы

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

Если документ нельзя показывать в чужом iframe, это настраивает **сервер ответа самого документа**, а не страница-родитель. Для банковских, админских и профильных экранов это базовая защита от clickjacking.

## Где iframe уместен, а где нет

- платёжные формы, карты, видео, чаты и сторонние виджеты;
- preview недоверенного HTML, который опасно рендерить прямо в DOM приложения;
- редкие micro-frontend кейсы, когда нужна жёсткая изоляция runtime.

Часто iframe не нужен там, где документ на самом деле ваш и должен жить в одном React/DOM-дереве: модалки, тултипы, панели, обычные внутренние экраны. Там чаще подходят компоненты, порталы и роутинг, а не новый browsing context.

---

# 6. Ссылки

- [MDN — iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN — Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN — Content-Security-Policy: frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
