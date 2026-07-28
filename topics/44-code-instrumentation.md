# 1. Тема
**Инструментализация кода**
---
# 2. Главное в одну фразу
Инструментализация добавляет в приложение измерения, логи и трассировки, чтобы наблюдать производительность, ошибки и бизнес-события в реальной эксплуатации.
---
# 3. Ответ для собеседования
> «Инструментализация — это добавление наблюдаемости: метрик, структурированных логов и trace/span-ов вокруг важных операций. Она отвечает на вопросы: сколько длится операция, где произошла ошибка, как прошёл запрос между сервисами и какова доля успешных платежей. Для стандартного формата использую OpenTelemetry, а данные могу отправлять в Datadog или New Relic. Важно не логировать секреты и персональные данные, давать метрикам стабильные имена и ограничивать cardinality тегов.»
---
# 4. Самое главное запомнить
- Метрика отвечает «сколько/как часто», trace — «где прошло время», log — «что случилось».
- APM: Datadog, New Relic; стандарт телеметрии: OpenTelemetry.
- Измеряйте критические технические и бизнес-операции.
- Не отправляйте PII, токены и пароли.
---
# 5. Описание
| Сигнал | Назначение | Пример |
|---|---|---|
| Metrics | Агрегация и алерты | `payment.success`, p95 duration |
| Logs | Контекст конкретного события | ошибка с `requestId` |
| Traces | Путь запроса между компонентами | checkout → payment → bank |

```javascript
// React: пользовательская метка производительности
useEffect(() => {
  performance.mark('profile:start');
  return () => {
    performance.mark('profile:end');
    performance.measure('profile:visible', 'profile:start', 'profile:end');
  };
}, [userId]);
```

```javascript
async function processPayment(data) {
  const startedAt = performance.now();
  try {
    const result = await api.pay(data);
    metrics.increment('payment.success');
    return result;
  } catch (error) {
    metrics.increment('payment.error');
    logger.error({ err: error, paymentId: data.id }, 'payment failed');
    throw error;
  } finally {
    metrics.histogram('payment.duration_ms', performance.now() - startedAt);
  }
}
```

Инструментировать стоит границы системы: HTTP-запросы, очередь, БД, платёж, загрузку критичного UI. У метрик не должно быть высококардинальных label-ов — например, `userId` нельзя класть в tag, иначе хранилище метрик быстро разрастётся.
---
# 6. Ссылки
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [Datadog APM](https://docs.datadoghq.com/tracing/)
- [New Relic](https://docs.newrelic.com/docs/apm/)
