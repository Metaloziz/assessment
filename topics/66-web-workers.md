# 1. Тема

**Web-workers**

---

# 2. Главное в одну фразу

Web Worker выполняет JS в фоне, не блокируя UI-поток; с страницей общается через сообщения (`postMessage`), без доступа к DOM.

---

# 3. Суть

> **Dedicated Worker** (`new Worker(url)`) — тяжёлые вычисления, парсинг, крипто, большие данные — чтобы не фризить интерфейс. Нет DOM, `window`, `document`; связь — **message passing** (структурированное клонирование / transferables).
>
> Создание: `new Worker(...)` или `new Worker(new URL('./w.ts', import.meta.url), { type: 'module' })` в бандлерах. Завершение: `terminate()` / `self.close()`.
>
> **SharedWorker** — один воркер на несколько вкладок (реже нужен). Не путать с **Service Worker**: SW — про сеть/кэш/PWA, WW — про CPU-задачи в фоне.

---

# 4. Самое главное запомнить

- Фон = нет блокировки UI; нет DOM.
- Обмен: `postMessage` / `onmessage`.
- Transferable (ArrayBuffer) — без лишнего копирования больших буферов.
- `terminate()` при размонтировании (React: cleanup в `useEffect`).
- SW ≠ Web Worker.

| | Web Worker | Service Worker |
|---|---|---|
| Цель | Вычисления | Сеть / кэш / push |
| DOM | Нет | Нет |
| HTTPS | Не обязателен | Обязателен (кроме localhost) |

---

# 5. Описание

### Воркер

```javascript
// calc-worker.js
self.onmessage = (event) => {
  const { data } = event.data
  const result = data.reduce((sum, n) => sum + n, 0)
  self.postMessage({ result })
}
```

### Основной поток

```javascript
const worker = new Worker('/workers/calc-worker.js')
worker.postMessage({ data: [1, 2, 3, 4, 5] })
worker.onmessage = (event) => console.log(event.data.result)
worker.onerror = (error) => console.error(error)
// worker.terminate()
```

### С модулем и React-хуком (идея)

```typescript
useEffect(() => {
  const worker = new Worker(new URL('./math.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => setResult(e.data.result)
  worker.postMessage({ type: 'ADD', a, b })
  return () => worker.terminate()
}, [a, b])
```

### Ограничения

- стоимость сериализации сообщений;
- отдельный контекст — нельзя шарить замыкания/сторы напрямую;
- файл воркера должен быть доступен по URL (настройка бандлера).

---

# 6. Ссылки

- [MDN — Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN — Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [MDN — Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)
