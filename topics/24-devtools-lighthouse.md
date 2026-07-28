# 1. Тема

**Инструмент проверки производительности (DevTools, Lighthouse)**

---

# 2. Главное в одну фразу

Chrome DevTools даёт ручной разбор Performance/Network/Memory, а Lighthouse — автоматический аудит производительности, доступности, SEO и best practices.

---

# 3. Ответ для собеседования

> «Для проверки производительности фронта обычно смотрю два инструмента.
>
> **Chrome DevTools → Performance** — запись timeline: время JS, layout/paint, память, сеть. Там видно long tasks, что блокирует main thread, когда рисуется кадр.
>
> **Lighthouse** — автоматизированный аудит: Performance (FCP, LCP и др.), Accessibility, SEO, Best Practices. Удобно для baseline и регрессий в CI, но это **lab**-данные, не полевые.
>
> Рядом: Network (водопад, TTFB, кэш), Coverage (неиспользуемый CSS/JS), Memory (утечки).
> Lab (Lighthouse/DevTools) ≠ Field (CrUX/RUM).»

---

# 4. Самое главное запомнить

- DevTools Performance — детальный ручной профиль.
- Lighthouse — автоаудит + score по категориям.
- Lab ≠ Field.
- Для сети — вкладка Network; для лишнего кода — Coverage.

### Chrome DevTools Performance

Даёт детальную информацию о времени выполнения JavaScript, рендеринге и отрисовке, потреблении памяти и сетевых запросах.

### Lighthouse

Автоматизированный инструмент для комплексной проверки производительности (FCP, LCP), доступности, SEO и best practices.

---

# 5. Описание

Инструменты проверки производительности — специализированные средства для анализа и оптимизации веб-приложений.

| Инструмент | Когда использовать |
|------------|-------------------|
| Performance | Найти long task, jank, причину тормозов |
| Network | Водопад загрузки, TTFB, кэш, размер |
| Lighthouse | Быстрый score + список рекомендаций |
| Coverage | Неиспользуемый JS/CSS |

---

# 6. Ссылки

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/overview/)
