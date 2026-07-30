# 1. Тема

**Web APIs (Payment Request API, Push API, Web Share API и т.д.)**

---

# 2. Главное в одну фразу

Современные Web API дают доступ к возможностям устройства и UX-сценариям (оплата, push, шаринг, WebAuthn) через стандартизированные браузерные интерфейсы с проверкой поддержки и разрешениями.

---

# 3. Суть

> «Web APIs» здесь — набор браузерных интерфейсов сверх «просто DOM»: **Payment Request**, **Push** (+ Notifications), **Web Share**, **WebAuthn**, иногда Bluetooth/NFC и др. Общий паттерн: feature-detect → permission → вызов → обработка отказа/неподдержки.
>
> Для продуктов важны: **HTTPS**, серверная проверка всего критичного (платежи, auth), не спамить push, деградация UI если API нет. Push обычно требует **Service Worker**; Payment Request не заменяет бэкенд-эквайринг — только UX сбора платёжных данных/подтверждения.
>
> На собеседовании достаточно уметь объяснить **зачем API**, **ограничения безопасности** и **связку с разрешениями/SW**, а не заучивать сигнатуры всех методов.

---

# 4. Самое главное запомнить

- Всегда `in` / feature detection + fallback.
- Чувствительные API → HTTPS и permissions.
- Push ≈ SW + подписка + сервер push-service.
- Payment Request упрощает UI оплаты, не бизнес-логику биллинга.
- Web Share — нативный share-sheet; на десктопе поддержка ограничена.
- WebAuthn — криптографический MFA/passwordless, проверка на сервере.

| API | Идея |
|---|---|
| Payment Request | Нативный UI оплаты |
| Push | Сообщения «с сервера» даже без открытой вкладки |
| Web Share | Системный шаринг ссылки/файла |
| WebAuthn | Биометрия / ключи вместо пароля |
| Notifications | Показ уведомлений (с разрешением) |

---

# 5. Описание

### Payment Request (идея)

```javascript
const request = new PaymentRequest(
  [{ supportedMethods: 'https://example.com/pay' }],
  { total: { label: 'Итого', amount: { currency: 'RUB', value: '100.00' } } },
)
const response = await request.show()
// отправить details на сервер → response.complete('success')
```

### Push (связка с SW)

```javascript
const reg = await navigator.serviceWorker.ready
const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
// sub → сохранить на бэкенде
```

В SW: событие `push` → `showNotification`.

### Web Share

```javascript
if (navigator.share) {
  await navigator.share({ title: 'Документ', url: location.href })
}
```

### WebAuthn (схема)

`navigator.credentials.create` / `get` с `publicKey`-опциями; challenge и проверка аттестации/assertion — **на сервере**.

### Best practices

- не вызывать permission-промпты без жеста пользователя;
- логировать/метричить отказы;
- критичные действия дублировать серверными проверками.

---

# 6. Ссылки

- [MDN — Payment Request API](https://developer.mozilla.org/en-US/docs/Web/API/Payment_Request_API)
- [MDN — Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN — Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [webauthn.io](https://webauthn.io/)
- [MDN — Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
