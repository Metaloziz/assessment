import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '109-js-private-static-fields'

class LeakyWallet {
  balance = 0
  deposit(n: number) {
    this.balance += n
  }
}

class SafeWallet {
  static #opened = 0
  #balance = 0

  constructor() {
    SafeWallet.#opened++
  }

  deposit(n: number) {
    this.#balance += n
  }

  getBalance() {
    return this.#balance
  }

  static opened() {
    return SafeWallet.#opened
  }
}

export function PrivateStaticFieldsLab() {
  const { lines, log, clear } = useLabLog()
  const [leaky, setLeaky] = useState<LeakyWallet | null>(null)
  const [safe, setSafe] = useState<SafeWallet | null>(null)
  const [, bump] = useState(0)

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Кошелёк хранит баланс, но чужой код пишет <code>wallet.balance = 1_000_000</code> и ломает
        инвариант. Нужно спрятать баланс внутри класса и отдельно посчитать, сколько кошельков
        открыли.
      </p>
      <ol className={shell.steps}>
        <li>
          Плохо: публичное <code>balance</code> — любой может прочитать и перезаписать.
        </li>
        <li>
          Хорошо: <code>#balance</code> — снаружи не достучаться, только через методы класса.
        </li>
        <li>
          <code>static #opened</code> — счётчик на всём классе, не на экземпляре.
        </li>
      </ol>

      <div className={shell.row}>
        <button
          type="button"
          className={shell.btn}
          onClick={() => {
            const w = new LeakyWallet()
            w.deposit(50)
            w.balance = 1_000_000
            setLeaky(w)
            log('err', `публичный balance → ${w.balance} (перезаписали снаружи)`)
          }}
        >
          Плохо: хак balance
        </button>
        <button
          type="button"
          className={shell.btnPrimary}
          onClick={() => {
            const w = new SafeWallet()
            w.deposit(50)
            setSafe(w)
            log('ok', `SafeWallet: deposit(50), getBalance() → ${w.getBalance()}`)
            log('ok', `SafeWallet.opened() → ${SafeWallet.opened()}`)
            log('ok', `'#balance' in w → ${'#balance' in w} (приватное поле — не свойство объекта)`)
          }}
        >
          Хорошо: #balance + static
        </button>
        <button
          type="button"
          className={shell.btn}
          disabled={!safe}
          onClick={() => {
            if (!safe) return
            safe.deposit(10)
            bump((n) => n + 1)
            log('ok', `ещё +10 → getBalance() = ${safe.getBalance()}`)
          }}
        >
          +10 через метод
        </button>
        <button type="button" className={shell.btn} onClick={clear}>
          Очистить лог
        </button>
      </div>

      {leaky ? (
        <p className={shell.hint}>
          Дырявый кошелёк: <code>balance = {leaky.balance}</code>
        </p>
      ) : null}
      {safe ? (
        <p className={shell.hint}>
          Защищённый: <code>getBalance() = {safe.getBalance()}</code>, открыто кошельков:{' '}
          <code>{SafeWallet.opened()}</code>
        </p>
      ) : null}

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Правите примеры с # и static — результат и console.log появятся в консоли внизу."
      snippets={[
        {
          id: 'private-balance',
          label: 'Приватный баланс',
          code: `class Wallet {
  #balance = 0;

  deposit(amount) {
    this.#balance += amount;
  }

  getBalance() {
    return this.#balance;
  }
}

const w = new Wallet();
w.deposit(100);
console.log(w.getBalance()); // 100

// снаружи поля нет:
console.log('#balance' in w); // false
console.log(Object.keys(w));  // []`,
        },
        {
          id: 'static-count',
          label: 'static-счётчик',
          note: 'static #opened общий для класса; this в static-методе — сам класс.',
          code: `class ConnectionPool {
  static #opened = 0;
  #closed = false;

  constructor() {
    ConnectionPool.#opened++;
  }

  close() {
    this.#closed = true;
  }

  static get opened() {
    return this.#opened;
  }
}

const a = new ConnectionPool();
const b = new ConnectionPool();
console.log(ConnectionPool.opened); // 2
b.close();
console.log(ConnectionPool.opened); // 2 — close не уменьшает счётчик`,
        },
        {
          id: 'subclass-brand',
          label: 'Подкласс не видит # родителя',
          note: 'Одинаковое написание #x в двух классах — разные поля (разный brand).',
          code: `class Parent {
  #secret = 'parent';
  reveal() {
    return this.#secret;
  }
}

class Child extends Parent {
  #secret = 'child';
  own() {
    return this.#secret;
  }
  // parentSecret() { return this.#secret } — это Child.#secret, не Parent
}

const c = new Child();
console.log(c.reveal()); // parent
console.log(c.own());    // child`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Баланс, который нельзя переписать снаружи"
      lead="Поле с # доступно только коду своего класса; static-члены живут на конструкторе, а не на экземпляре."
      problem={problem}
      code={code}
    />
  )
}
