# 1. Тема

**Jenkins**

---

# 2. Главное в одну фразу

Jenkins — открытый сервер автоматизации, который запускает описанный в Jenkinsfile CI/CD-конвейер от коммита до развёртывания.

---

# 3. Суть

> Jenkins получает событие из Git и запускает pipeline: собирает проект, выполняет тесты и проверки качества, собирает артефакт или контейнер, а затем может развернуть его в целевой среде.
>
> Pipeline хранится рядом с кодом в Jenkinsfile, поэтому правила выпуска версионируются и проверяются через code review. Тяжёлые задачи выполняют агенты, а контроллер координирует запуски, хранит конфигурацию и результаты.
>
> В банке Jenkins ценят за гибкость, self-hosted-развёртывание, интеграцию с корпоративными системами и журналирование. Но за эту гибкость нужно платить: обновлять Jenkins и плагины, изолировать агентов, ограничивать права и не хранить секреты в Jenkinsfile.

---

# 4. Самое главное запомнить

- Jenkins — CI/CD-сервер с открытым исходным кодом и большой экосистемой плагинов.
- Jenkinsfile описывает pipeline как код; Declarative Pipeline обычно проще читать и поддерживать.
- Controller управляет заданиями, agents исполняют их в нужном окружении.
- Jenkins интегрируется с Git, Maven/Gradle, Docker, Kubernetes, SonarQube, JUnit, Postman, Snyk и Vault.
- Секреты получают через Credentials/Vault, а не записывают в репозиторий.
- Нужны RBAC, аудит, обновления и контроль плагинов: Jenkins нельзя считать безопасным «из коробки».

---

# 5. Описание

## Как работает Jenkins

После push или merge request webhook запускает job. Job забирает конкретный commit, выделяет agent, выполняет stages и публикует отчёты. Результат привязан к ревизии: можно узнать, какой код и какие проверки попали в релиз.

Для воспроизводимости agent обычно запускают в контейнере или Kubernetes pod с заранее подготовленными инструментами. Это лучше, чем устанавливать всё на один постоянный сервер и позволять сборкам влиять друг на друга.

## Пример Declarative Jenkinsfile

```groovy
pipeline {
  agent { label 'linux-docker' }

  environment {
    IMAGE = "registry.example.com/payments:${env.GIT_COMMIT}"
  }

  stages {
    stage('Сборка') {
      steps { sh 'mvn -B clean package -DskipTests' }
    }

    stage('Тестирование') {
      steps {
        sh 'mvn -B test'
        sh 'newman run tests/payment-api.postman_collection.json'
      }
      post { always { junit 'target/surefire-reports/*.xml' } }
    }

    stage('SonarQube') {
      steps {
        withSonarQubeEnv('sonarqube') {
          sh 'mvn -B sonar:sonar'
        }
      }
    }

    stage('Деплой') {
      when { branch 'main' }
      steps {
        sh 'helm upgrade --install payment-api ./chart --set image.tag=$GIT_COMMIT'
      }
    }
  }

  post {
    failure { echo 'Сборка или проверка завершилась ошибкой' }
  }
}
```

Конкретные шаги зависят от подключённых плагинов и окружения. Например, `kubernetesDeploy` — шаг соответствующего плагина, а Helm можно запускать как обычную CLI-команду на agent. В production pipeline обычно добавляют quality gate, ручное одобрение, smoke-проверку и стратегию rollback.

## Безопасность и корпоративная эксплуатация

Jenkins должен иметь минимально необходимые права: RBAC разделяет администрирование, запуск и изменение pipeline. Доступ к Kubernetes и registry лучше выдавать короткоживущими токенами через Vault или workload identity. Нельзя печатать секреты в shell-командах и логах.

Для банковских процессов важны артефакты аудита: commit SHA, версия образа, отчёт о тестах, результат SonarQube, кто одобрил деплой и в какую среду он прошёл. Это также ускоряет расследование инцидента и откат.

## Jenkins и альтернативы

| Система | Когда Jenkins выглядит сильнее | Что может быть удобнее у альтернативы |
|---|---|---|
| GitLab CI/CD | Нужны нестандартные шаги и интеграции через плагины | Pipeline и репозиторий в одном продукте |
| Azure DevOps | Нужна независимость от конкретного облака и гибкая self-hosted-схема | Глубокая интеграция с Azure и Boards |
| Travis CI | Нужен сложный корпоративный конвейер | Быстрый старт для небольшого облачного проекта |

## Короткий ответ на собеседовании

«Jenkins — это self-hosted CI/CD-сервер. Я описываю конвейер в Jenkinsfile: checkout, сборка, unit/API-тесты, SonarQube, создание образа и деплой Helm или Kubernetes. Jenkins хорошо подходит для корпоративного контура благодаря плагинам и интеграциям, но требует эксплуатации: обновления плагинов, изоляции агентов, RBAC и выдачи секретов через Vault».

---

# 6. Ссылки

- [Jenkins](https://www.jenkins.io/)
- [Pipeline documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Using a Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Jenkins Security](https://www.jenkins.io/doc/book/security/)
