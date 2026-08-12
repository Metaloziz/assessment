# 1. Тема

**Chrome DevTools: Application · Sources**

---

# 2. Главное в одну фразу

**Sources** — отладка JS (breakpoints, scope, source maps); **Application** — хранилища и PWA-слой (Cache, Local/Session Storage, Cookies, Service Workers).

---

# 3. Суть

> В Chrome DevTools две соседние, но разные вкладки. **Sources** — мир исходников и паузы: дерево файлов (или webpack:// через source maps), breakpoints, Call Stack, Scope, Watch, сниппеты. Здесь разбирают «почему в переменной `undefined`» и идут по шагам после клика. **Application** — мир персистентности и клиента как «установленного» приложения: Local Storage, Session Storage, IndexedDB, Cookies, Cache Storage, Service Workers, Manifest. Здесь смотрят, что реально лежит в браузере после логина или offline-кеша.
>
> Зачем разделять: баг «после F5 пропал токен» часто в Application → Storage, а не в reducer. Баг «неверная цена в момент клика» — в Sources на breakpoint. Путать вкладки — тратить время не там.
>
> Как работать. Sources: Ctrl+P к файлу, line breakpoint или `debugger;`, при паузе читать Scope и стек; для бандла нужны source maps в dev. Application: выбрать origin, раскрыть Local Storage / Cookies, Clear site data при «залипшем» состоянии; Service Workers — unregister, если SW отдаёт старый shell; Cache Storage — какие Response закешированы.
>
> Ловушка: чистить только Local Storage и забывать Cookies / SW / Cache — симптом остаётся. В Sources без maps смотреть minified prod. Не путать Application → Storage с вкладкой Network (трафик сейчас) и с React/Redux DevTools (деревья фреймворка).

---

# 4. Самое главное запомнить

| Вкладка | Задача |
|---------|--------|
| Sources | Breakpoints, step, scope, maps |
| Application | Storage, cookies, SW, Cache, manifest |

- Clear site data — сброс «залипшего» клиента.
- SW + Cache часто виноваты в «старой версии» UI.
- Source maps обязательны для удобного Sources в dev.
- Network ≠ Application (запрос сейчас ≠ что лежит на диске браузера).

---

# 5. Описание

## Sources — карта

```text
Page / Filesystem / Overrides
        │
        ▼
   файл + breakpoint
        │
        ▼
  пауза → Scope · Call Stack · Watch
        │
        ▼
  Step over / into / Resume
```

Полезное:

- **Conditional breakpoint** — `item.id === '42'`.
- **DOM / Event breakpoints** — в правой панели Sources.
- **Overrides** — подменить файл локально без пересборки (осторожно).

## Application — карта

```text
Application
├── Manifest          ← PWA / installability
├── Service Workers   ← register / unregister / update
├── Storage
│   ├── Local Storage
│   ├── Session Storage
│   ├── IndexedDB
│   ├── Cookies
│   └── Cache Storage
└── Clear site data   ← ядерная кнопка сброса origin
```

## Типичные сценарии

| Симптом | Куда смотреть |
|---------|----------------|
| Токен пропал / не тот | Application → Local Storage / Cookies |
| После деплоя старый UI | SW + Cache Storage → unregister / clear |
| Неверное значение в момент клика | Sources → breakpoint |
| «У меня работает» после очистки | Clear site data vs только один Storage |

## Связка с кодом

```javascript
localStorage.setItem('token', token); // видно в Application → Local Storage
sessionStorage.setItem('draft', json);

// Sources остановится здесь, если DevTools открыты
function applyDiscount(cart) {
  debugger;
  return { ...cart, total: cart.total * 0.9 };
}
```

---

# 6. Ссылки

- [Chrome — Sources](https://developer.chrome.com/docs/devtools/javascript/)
- [Chrome — Application](https://developer.chrome.com/docs/devtools/storage/)
- [Chrome — Clear site data](https://developer.chrome.com/docs/devtools/application/storage/#clear-site-data)
- [Chrome — Service workers in DevTools](https://developer.chrome.com/docs/devtools/progressive-web-apps/)
