# 1. Тема

**Настройка логирования ошибок (Sentry, Prometheus и др.)**

---

# 2. Главное в одну фразу

Sentry (и аналоги) собирают ошибки с контекстом и релизом; Prometheus — метрики и алерты по ним: вместе закрывают «что упало» и «насколько часто / насколько плохо».

---

# 3. Суть

> В проде `console.error` не масштабируется: нет группировки, релизов, алёртов и связи с пользователем. **Sentry** (Datadog APM Errors, Bugsnag, …) принимает события об ошибках с фронта и бэка: stack, breadcrumbs, release, environment, user id — и склеивает дубликаты в issue. **Prometheus** (+ Grafana) — другой слой: **метрики** (`http_requests_total`, `error_rate`, latency histograms), scrape, правила алертов. Ошибка в Sentry отвечает на «что сломалось у кого»; Prometheus — на «сколько 5xx в минуту и растёт ли p99».
>
> Зачем оба: без error-tracker чините по скринам из чата; без метрик не видите деградацию до жалоб. Логи (ELK, Loki) — третий слой текста; их не путают с метриками и не заменяют ими Sentry.
>
> Как настраивают. SDK: `Sentry.init({ dsn, environment, release, tracesSampleRate })` на клиенте и сервере; source maps для читаемых стеков; `beforeSend` — вырезать PII. Prometheus: экспортер /client library, `Counter`/`Histogram` на границах API, алерт `rate(http_requests_total{status=~"5.."}[5m])`. Связка: по росту 5xx в Grafana открываете Sentry issue того же релиза.
>
> Ловушка: слать в Sentry всё подряд без sample rate — шум и счёт. Метрики высокой кардинальности (userId в label) убивают Prometheus. Секреты в breadcrumbs/extra. Путать логи, метрики и traces (OpenTelemetry) — разные сигналы одной картины.

---

# 4. Самое главное запомнить

| Сигнал | Инструменты | Вопрос |
|--------|-------------|--------|
| Errors | Sentry, … | Что упало, у кого, в каком релизе |
| Metrics | Prometheus + Grafana | Сколько / как быстро / алерт |
| Logs | Loki, ELK, … | Текст и поиск по полям |

- `dsn` + `release` + `environment` в Sentry.
- Source maps для минифицированного фронта.
- Prometheus: labels с низкой кардинальностью.
- `beforeSend` / scrubbing PII.
- Алерты на error rate и latency, не только на «процесс жив».

---

# 5. Описание

## Sentry (браузер)

```javascript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // вырезать email / token из extra
    return event;
  },
});
```

## Sentry (Node)

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,
});

// Express: requestHandler → routes → errorHandler
```

## Prometheus (фрагмент)

```javascript
import client from 'prom-client';

const httpErrors = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// после ответа:
httpErrors.inc({ method: 'POST', route: '/pay', status: '500' });
```

```text
App ──errors──► Sentry ──► Issue + alert (Slack)
 │
 └──metrics──► Prometheus ──► Grafana / Alertmanager
```

## Чеклист выкладки

1. DSN только из env, не в git.
2. `release` = git sha / версия образа.
3. Source maps загружены для фронта.
4. Sample rate на проде осмысленный.
5. Алерт: spike 5xx + новый Sentry issue.

---

# 6. Ссылки

- [Sentry Docs](https://docs.sentry.io/)
- [Prometheus — Concepts](https://prometheus.io/docs/concepts/data_model/)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [Grafana — Alerting](https://grafana.com/docs/grafana/latest/alerting/)
