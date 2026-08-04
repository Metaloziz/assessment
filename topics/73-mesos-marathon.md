# 1. Тема

**Mesos/Marathon**

---

# 2. Главное в одну фразу

Mesos объединяет ресурсы серверов кластера, а Marathon использует их для запуска, масштабирования и восстановления долгоживущих приложений.

---

# 3. Суть

> Apache Mesos — менеджер ресурсов кластера: он представляет CPU, память и диск множества машин как общий пул. Mesos Master координирует работу, Agents предлагают доступные ресурсы, а frameworks решают, какие задачи на них запускать.
>
> Marathon — framework поверх Mesos для сервисов, которые должны работать постоянно. В его декларации указывают образ, ресурсы, число экземпляров, сеть и health check; Marathon размещает экземпляры, выполняет rolling update и перезапускает упавшие задачи.
>
> Сейчас для новых контейнерных платформ чаще выбирают Kubernetes. Mesos/Marathon по-прежнему встречается в legacy- и гибридных контурах, где надо одновременно управлять виртуальными машинами, контейнерами и разными типами задач.

---

# 4. Самое главное запомнить

- Mesos — не оркестратор приложений сам по себе, а распределённый менеджер ресурсов.
- Основные части Mesos: Master, Agents и Frameworks.
- Marathon — framework Mesos для долгоживущих приложений и микросервисов.
- Marathon задаёт desired state: число экземпляров, образ, CPU/RAM, сеть, обновление и health checks.
- Mesos предлагает ресурсы, Marathon выбирает размещение и следит за жизненным циклом приложения.
- Основные минусы: сложность эксплуатации и меньшая популярность, чем у Kubernetes.

---

# 5. Описание

## Архитектура и взаимодействие

```text
Marathon → планирует приложение и desired state
        → принимает offers ресурсов от Mesos
Mesos Master → координирует Agents и frameworks
Mesos Agents → запускают контейнеры и задачи на узлах
```

Когда в Marathon указано `instances: 3`, он стремится поддерживать три здоровых экземпляра. Он получает предложения ресурсов от Mesos и запускает задачи на подходящих Agents. Если контейнер падает или health check не проходит, Marathon пытается восстановить желаемое состояние, а Mesos может выделить ресурсы на другом узле.

В лабе слева — учебный симулятор кластера: можно задать desired state, смотреть resource offers и убить агент, чтобы увидеть автоматический reschedule.

## Пример приложения Marathon

```json
{
  "id": "/bank-api",
  "instances": 3,
  "cpus": 0.5,
  "mem": 512,
  "container": {
    "type": "DOCKER",
    "docker": {
      "image": "registry.bank.example/bank-api:1.4.2",
      "network": "BRIDGE",
      "portMappings": [
        { "containerPort": 8080, "hostPort": 0, "protocol": "tcp" }
      ]
    }
  },
  "healthChecks": [
    {
      "protocol": "HTTP",
      "path": "/health",
      "portIndex": 0,
      "gracePeriodSeconds": 30,
      "intervalSeconds": 10,
      "timeoutSeconds": 5,
      "maxConsecutiveFailures": 3
    }
  ],
  "upgradeStrategy": {
    "minimumHealthCapacity": 0.5,
    "maximumOverCapacity": 0.25
  }
}
```

Не стоит использовать тег `latest`: он разрушает воспроизводимость выпуска. Версия образа должна быть неизменяемой, например `1.4.2` или commit SHA. Health check обязан отражать готовность принимать реальный трафик, а не только факт запуска процесса.

## Сценарии в банке

| Сценарий | Роль Mesos/Marathon |
|---|---|
| Микросервисы авторизации и платежей | Marathon поддерживает нужное число экземпляров и заменяет нездоровые |
| Пиковая нагрузка | Увеличение instances и распределение задач по узлам |
| Docker-стандартизация | Один образ работает в тестовой и production-среде |
| Пакетная аналитика | Mesos выделяет ресурсы фреймворкам для batch-задач, например Spark |
| Legacy-контур | Совместное управление VM- и контейнерными нагрузками |

HAProxy или другой балансировщик обычно направляет запросы только на здоровые экземпляры. Для критичных сервисов также нужны несколько master-узлов, сетевые политики, мониторинг и проверенная процедура rollback.

## Ограничения

Mesos и Marathon требуют отдельных знаний о ресурсных offers, framework и сетевой модели. Экосистема и рынок специалистов заметно сместились к Kubernetes, поэтому для нового проекта нужно отдельно обосновать выбор. Однако миграция legacy-систем сама по себе несёт риск: если платформа уже стабильна, важнее безопасно поддерживать и постепенно модернизировать её.

## Короткий ответ на собеседовании

«Mesos объединяет ресурсы кластера, а Marathon — его framework для постоянных сервисов. В Marathon я задаю Docker-образ, instances, CPU/RAM, сеть и health check; он использует ресурсы Mesos, выполняет rolling update и перезапускает задачи при сбое. Для новых решений чаще выберу Kubernetes, но Mesos/Marathon полезен в существующих гибридных и legacy-контурах».

---

# 6. Ссылки

- [Apache Mesos Documentation](https://mesos.apache.org/documentation/)
- [Marathon Documentation](https://mesosphere.github.io/marathon/)
- [Mesos и Kubernetes](https://www.nginx.com/blog/mesos-kubernetes-container-orchestration/)
- [Marathon Native Docker](https://mesosphere.github.io/marathon/docs/native-docker.html)
