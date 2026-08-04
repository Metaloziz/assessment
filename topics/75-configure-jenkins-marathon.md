# 1. Тема

**Конфигурировать Jenkins, Marathon и другие системы банка**

---

# 2. Главное в одну фразу

Конфигурация CI/CD — это декларативное описание того, где и как проверять, собирать, доставлять и безопасно запускать конкретную версию приложения.

---

# 3. Суть

> В Jenkins pipeline обычно хранится в Jenkinsfile рядом с исходным кодом. В нём описывают agent, переменные окружения, stages, steps и действия после выполнения; код проходит review вместе с правилами его выпуска.

В лабе слева — только Jenkins: собираешь Declarative Pipeline, гоняешь Run и смотришь when/credentials/post. Marathon в этой лабе не трогаем.
>
> Для production-контура я отделяю неизменяемые параметры сборки от секретов и параметров среды: образ получает уникальную версию, секреты приходят из Vault или Jenkins Credentials, а доступы у pipeline минимальны.
>
> В Marathon приложение также описывают декларативно: какой образ запускать, сколько экземпляров нужно, сколько CPU и памяти выделять, как проверять здоровье и как обновлять версию. Jenkins после успешных проверок передаёт туда версию образа или применяет Kubernetes/Helm-манифест.

---

# 4. Самое главное запомнить

- Jenkinsfile — pipeline as code; его нужно версионировать и проверять в code review.
- `agent` выбирает среду выполнения, `stages` делят процесс на логические этапы, `steps` содержат команды.
- `environment` содержит несекретные параметры; credentials и Vault выдают секреты во время запуска.
- `when`, `parallel`, labels и shared libraries делают pipeline управляемым в больших командах.
- `post` публикует отчёты и выполняет cleanup/уведомления независимо от результата.
- Конфиг Marathon должен включать конкретный образ, ресурсы, replicas, health checks и стратегию обновления.

---

# 5. Описание

## Устройство Declarative Pipeline

| Блок | Назначение |
|---|---|
| `agent` | Где запускаются steps: любой agent, label, Docker или Kubernetes pod |
| `environment` | Общие переменные для pipeline |
| `stages` / `stage` | Последовательные этапы: build, test, scan, deploy |
| `steps` | Команды и вызовы Jenkins-плагинов |
| `when` | Условный запуск, например деплой только из `main` |
| `parallel` | Параллельные независимые проверки |
| `post` | Публикация JUnit-отчётов, уведомления и cleanup |

Пример ниже показывает структуру, а не готовую для production-конфигурацию. Названия credentials и команд должны соответствовать корпоративному окружению.

```groovy
@Library('bank-pipeline-lib@v3') _

pipeline {
  agent { label 'linux-docker' }

  environment {
    APP_NAME = 'bank-api'
    IMAGE_TAG = "${env.GIT_COMMIT}"
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Сборка') {
      steps { sh 'mvn -B clean package -DskipTests' }
    }

    stage('Проверки') {
      parallel {
        stage('Unit') {
          steps { sh 'mvn -B test' }
        }
        stage('SAST') {
          steps { bankSecurityScan() }
        }
      }
    }

    stage('Публикация образа') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'registry-writer',
          usernameVariable: 'REGISTRY_USER',
          passwordVariable: 'REGISTRY_PASSWORD'
        )]) {
          sh './ci/build-and-push.sh "$IMAGE_TAG"'
        }
      }
    }

    stage('Деплой') {
      when { branch 'main' }
      steps {
        bankDeployHelm(app: env.APP_NAME, imageTag: env.IMAGE_TAG, environment: 'test')
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'target/surefire-reports/*.xml'
      cleanWs()
    }
  }
}
```

Shared library помогает вынести повторяемые и чувствительные части — правила деплоя, сканирование, получение short-lived credentials — из Jenkinsfile каждого сервиса. Её версию лучше фиксировать или обновлять контролируемо: иначе одинаковый commit может вести себя по-разному в разные дни.

## Секреты, права и условия

Нельзя добавлять токены, пароли или приватные ключи в `environment` или shell-скрипты репозитория. Jenkins Credentials маскирует значения в логах, а Vault может выдавать временный секрет непосредственно на время job. Это не отменяет необходимость не печатать переменные и не передавать их в аргументах командной строки.

Production stage запускают только из защищённой ветки и с отдельной service account. Для него можно добавить `input` с одобрением, но одобрение не заменяет автоматические quality gate и политики. `when` не является механизмом авторизации: доступы должны проверяться отдельно через RBAC и права учётной записи.

## Конфигурация Marathon

```json
{
  "id": "/bank-api",
  "instances": 3,
  "cpus": 0.5,
  "mem": 512,
  "container": {
    "type": "DOCKER",
    "docker": {
      "image": "registry.bank.example/bank-api:4f9d8c1",
      "network": "BRIDGE"
    }
  },
  "healthChecks": [
    {
      "protocol": "HTTP",
      "path": "/actuator/health",
      "portIndex": 0,
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

`instances` задаёт желаемое число копий, `cpus` и `mem` не дают одному сервису неконтролируемо занять кластер, а health check определяет, когда экземпляр считается рабочим. Стратегия обновления ограничивает, сколько старых экземпляров можно остановить и сколько новых создать сверх нормы во время rolling update.

## Связка Jenkins и оркестратора

После сборки Jenkins публикует образ с неизменяемым тегом. CD stage подставляет этот тег в Marathon JSON или Helm values и применяет конфигурацию с сервисной учётной записью. Затем pipeline ждёт готовности новых реплик, запускает smoke-тест и при неуспехе возвращает предыдущую известную версию. Сам Jenkins не должен хранить «latest» как единственный способ понять, что именно было развёрнуто.

## Короткий ответ на собеседовании

«Я настраиваю Jenkinsfile как версионируемый declarative pipeline: выбираю изолированный agent, делю процесс на build/test/scan/deploy, публикую отчёты в `post` и запускаю production только по условиям защищённой ветки. Секреты беру из Credentials или Vault, а повторяемую логику — из versioned shared library. В Marathon задаю версию Docker-образа, replicas, CPU/RAM, health checks и rolling-update policy; Jenkins передаёт туда уже проверенный immutable image».

---

# 6. Ссылки

- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins Shared Libraries](https://www.jenkins.io/doc/book/pipeline/shared-libraries/)
- [Marathon Documentation](https://mesosphere.github.io/marathon/)
- [Marathon Application Definition](https://mesosphere.github.io/marathon/docs/application-basics.html)
