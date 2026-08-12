import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '12-sql-injection'

type Scenario = 'login' | 'union' | 'blind' | 'defend'

export function SqlInjectionLab() {
  const { lines, log, clear } = useLabLog()
  const [scenario, setScenario] = useState<Scenario>('login')
  const [hint, setHint] = useState<string | null>(null)

  const run = () => {
    clear()

    if (scenario === 'login') {
      log('info', "email = ' OR '1'='1' --")
      log(
        'err',
        "SQL: WHERE email = '' OR '1'='1' --' AND password_hash = …",
      )
      log('err', 'условие всегда истинно → строка «найдена», логин обойдён')
      log('warn', 'причина: конкатенация ввода в текст запроса')
      setHint("обход auth через OR '1'='1'")
      return
    }

    if (scenario === 'union') {
      log('info', "id = 1 UNION SELECT username, password_hash FROM users--")
      log('err', 'второй SELECT дописан в тот же результат')
      log('err', 'в ответе API — чужие учётки / хеши')
      log('ok', 'при $1 bind UNION из id не «вклеится» в SQL')
      setHint('UNION / in-band: данные в том же ответе')
      return
    }

    if (scenario === 'blind') {
      log('info', "id = 1 AND IF(ASCII(SUBSTRING(password,1,1))>90, SLEEP(3), 0)")
      log('warn', 'ответ пустой, но задержка ~3s → угадали символ')
      log('err', 'blind time-based: схема и данные по битам')
      log('ok', 'параметры + least privilege режут и этот класс')
      setHint('blind: истина/ложь или время, без «видимого» дампа')
      return
    }

    log('info', 'защита')
    log('ok', 'pool.query(sql, [values]) — структура SQL фиксирована')
    log('ok', 'ORDER BY / имена таблиц — только whitelist')
    log('ok', 'DB user без DROP/FILE; SQL-ошибки → логи, не JSON клиенту')
    log('warn', 'knex.raw / ORM raw с интерполяцией снова = SQLi')
    setHint('prepared statements + least privilege')
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Ввод склеивают с SQL — атакующий меняет запрос: обход логина, утечка через{' '}
        <code>UNION</code>, слепой перебор. Лечится плейсхолдерами, а не «экранированием кавычек
        вручную».
      </p>
      <ol className={shell.steps}>
        <li>Выберите сценарий: login, UNION, blind или защита.</li>
        <li>Прогоните и посмотрите, как меняется SQL в логе.</li>
        <li>
          В «Код»: <code>login.js</code>, <code>posts.js</code>, <code>mongo.js</code>.
        </li>
      </ol>

      <div className={shell.row}>
        {(
          [
            ['login', 'Login bypass'],
            ['union', 'UNION'],
            ['blind', 'Blind'],
            ['defend', 'Защита'],
          ] as const
        ).map(([id, label]) => (
          <LabButton
            key={id}
            variant="ghost"
            size="sm"
            active={scenario === id}
            onClick={() => setScenario(id)}
          >
            {label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={run}>
          Прогнать
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            clear()
            setHint(null)
            setScenario('login')
          }}
        >
          Сброс
        </LabButton>
      </div>

      {hint ? (
        <p className={shell.hint}>
          Итог: <code>{hint}</code>
        </p>
      ) : (
        <p className={shell.hint}>Выберите сценарий.</p>
      )}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Конкатенация vs `$1` / `?`; whitelist для ORDER BY; намёк на NoSQL."
      snippets={[
        {
          id: 'login',
          label: 'login.js',
          note: 'Обход логина: только parameterized query.',
          executable: false,
          code: `import pg from 'pg';

const pool = new pg.Pool();

export async function login(email, passwordHash) {
  // ═══════════════════════════════════════════
  // ПЛОХО ← SQL Injection
  // ═══════════════════════════════════════════
  // const { rows } = await pool.query(
  //   \`SELECT id FROM users
  //    WHERE email = '\${email}' AND password_hash = '\${passwordHash}'\`,
  // );

  // ═══════════════════════════════════════════
  // ХОРОШО ← значения отдельно от SQL
  // ═══════════════════════════════════════════
  const { rows } = await pool.query(
    \`SELECT id FROM users
     WHERE email = $1 AND password_hash = $2\`, // ←
    [email, passwordHash],
  );

  return rows[0] ?? null;
}`,
        },
        {
          id: 'posts',
          label: 'posts.js',
          note: 'Значения — bind; имена колонок — whitelist.',
          executable: false,
          code: `import pg from 'pg';

const pool = new pg.Pool();
const SORTS = new Set(['id', 'created_at', 'title']); // ←

export async function listPosts(authorId, sortKey) {
  const sort = SORTS.has(sortKey) ? sortKey : 'id';

  // ПЛОХО: ORDER BY \${sortKey} из query string без проверки
  // ПЛОХО: WHERE author_id = \${authorId}

  const { rows } = await pool.query(
    \`SELECT id, title FROM posts
     WHERE author_id = $1
     ORDER BY \${sort} DESC\`, // ← sort уже из whitelist
    [authorId], // ←
  );
  return rows;
}`,
        },
        {
          id: 'mongo',
          label: 'mongo.js',
          note: 'NoSQL: не принимать операторы из JSON тела как есть.',
          executable: false,
          code: `// Плохо: password: { "$gt": "" } из req.body обходит проверку
// users.findOne({ username: req.body.username, password: req.body.password })

export async function findUser(users, username, password) {
  // ═══════════════════════════════════════════
  // ХОРОШО ← явные строки + сравнение хеша в коде
  // ═══════════════════════════════════════════
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new TypeError('invalid credentials shape'); // ←
  }

  const user = await users.findOne({ username }); // ← без сырого объекта с клиента
  if (!user) return null;
  // compare(password, user.passwordHash) …
  return user;
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="SQL Injection"
      lead="Обход логина, UNION, blind и защита prepared statements."
      problem={problem}
      code={code}
    />
  )
}
