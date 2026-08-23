import { useState, type ReactNode } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'

const TOPIC_ID = '50-dirty-code-properties'

type SmellId = 'comments' | 'args' | 'cohesion'
type CaseId = 'dirty' | 'clean'

const SMELLS: Array<{ id: SmellId; label: string }> = [
  { id: 'comments', label: 'Комментарии' },
  { id: 'args', label: 'Аргументы' },
  { id: 'cohesion', label: 'Связность' },
]

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'dirty', label: 'Грязный' },
  { id: 'clean', label: 'Чистый' },
]

const PAIN: Record<SmellId, ReactNode> = {
  comments: (
    <>
      Комментарий должен объяснять <em>зачем</em>, а не повторять строку кода или оставлять загадку{' '}
      <code>fix</code>.
    </>
  ),
  args: (
    <>
      Длинный список positional-аргументов легко перепутать; объект с именами полей сохраняет тот же
      контракт.
    </>
  ),
  cohesion: (
    <>
      В одном модуле смешаны разные поводы для изменений — правка цены задевает печать и SMS.
    </>
  ),
}

const CASE_BRIEF: Record<SmellId, Record<CaseId, ReactNode>> = {
  comments: {
    dirty: (
      <>
        Комментарии дублируют код и не объясняют скидку 15 % — без контекста непонятно, зачем ветка.
      </>
    ),
    clean: (
      <>
        Имена и константа <code>Role.Manager</code> заменяют шум; комментарий только про бизнес-лимит.
      </>
    ),
  },
  args: {
    dirty: (
      <>
        Семь параметров подряд: перепутать <code>city</code> и <code>zip</code> или забыть{' '}
        <code>sms</code> — один вызов, много риска.
      </>
    ),
    clean: (
      <>
        Те же данные в <code>createUser({'{…}'})</code> — порядок полей не важен, вызов читается как
        форма.
      </>
    ),
  },
  cohesion: {
    dirty: (
      <>
        Один файл считает сумму, печатает чек, шлёт SMS и закрывает смену — любая задача про деньги
        трогает всё.
      </>
    ),
    clean: (
      <>
        Файл только про цену булок; чек и SMS живут в соседних модулях с узким API.
      </>
    ),
  },
}

const CODE_INTRO: Record<SmellId, string> = {
  comments: 'Контраст: шумные и пустые комментарии против имён и одного смыслового пояснения.',
  args: 'Контраст: семь positional-аргументов против объекта параметров с тем же поведением.',
  cohesion: 'Контраст: свалка обязанностей в одном файле против модуля с одним поводом менять код.',
}

const CODE_SNIPPETS: Record<SmellId, Record<CaseId, InteractiveSnippet[]>> = {
  comments: {
    dirty: [
      {
        id: 'checkout-noisy',
        label: 'src/checkoutNoisy.ts',
        note: 'Комментарии повторяют код или не объясняют «fix» и магическую роль.',
        executable: false,
        languageLabel: 'ts',
        code: `type Cart = { lines: Array<{ rub: number }> };

// ═══════════════════════════════════════════
// NOISY ← комментарии не помогают
// ═══════════════════════════════════════════
export function total(cart: Cart) {
  let sum = 0;
  for (const line of cart.lines) {
    sum += line.rub; // ← прибавляем цену (дубль кода)
  }
  return sum;
}

export function loyaltyDiscount(user: { role: number }) {
  // fix ← не ясно зачем
  if (user.role === 3) return 0.15;
  return 0;
}`,
      },
    ],
    clean: [
      {
        id: 'checkout-clear',
        label: 'src/checkoutClear.ts',
        note: 'Имена и enum вместо шума; комментарий только про правило, которого нет в типах.',
        executable: false,
        languageLabel: 'ts',
        code: `type Cart = { lines: Array<{ rub: number }> };

const Role = { Manager: 3 } as const;

function sumLines(lines: Array<{ rub: number }>) {
  return lines.reduce((acc, line) => acc + line.rub, 0);
}

// ═══════════════════════════════════════════
// CLEAR ← намерение в коде
// ═══════════════════════════════════════════
export function cartTotal(cart: Cart) {
  return sumLines(cart.lines); // ← имя функции вместо комментария
}

export function managerLoyaltyRate(role: number) {
  if (role === Role.Manager) return 0.15; // ← лимит программы лояльности, не «fix»
  return 0;
}`,
      },
    ],
  },
  args: {
    dirty: [
      {
        id: 'register-dirty',
        label: 'src/registerUserDirty.ts',
        note: 'Семь параметров подряд — легко ошибиться в порядке при вызове.',
        executable: false,
        languageLabel: 'ts',
        code: `// ═══════════════════════════════════════════
// MANY ARGS ← positional-лотерея
// ═══════════════════════════════════════════
export function createUser(
  name: string,
  email: string,
  emailNotify: boolean,
  smsNotify: boolean,
  country: string,
  city: string,
  zip: string, // ← city и zip рядом — типичная ошибка
) {
  return { name, email, emailNotify, smsNotify, country, city, zip };
}

// вызов: createUser('Ann', 'a@x.com', true, false, 'RU', '101000', 'Moscow') — перепутали city/zip
`,
      },
    ],
    clean: [
      {
        id: 'register-clean',
        label: 'src/registerUserClean.ts',
        note: 'Parameter object: те же поля, порядок при вызове не критичен.',
        executable: false,
        languageLabel: 'ts',
        code: `type UserInput = {
  name: string;
  email: string;
  notify: { email: boolean; sms: boolean };
  address: { country: string; city: string; zip: string };
};

// ═══════════════════════════════════════════
// PARAM OBJECT ← именованные поля
// ═══════════════════════════════════════════
export function createUser(input: UserInput) {
  return {
    name: input.name,
    email: input.email,
    ...input.notify,
    ...input.address,
  };
}

// createUser({ name: 'Ann', email: 'a@x.com', notify: { email: true, sms: false },
//   address: { country: 'RU', city: 'Moscow', zip: '101000' } })
`,
      },
    ],
  },
  cohesion: {
    dirty: [
      {
        id: 'bakery-junk',
        label: 'src/bakeryJunk.ts',
        note: 'Цена, чек, SMS и закрытие смены — разные поводы менять один файл.',
        executable: false,
        languageLabel: 'ts',
        code: `type Line = { name: string; rub: number };

// ═══════════════════════════════════════════
// JUNK DRAWER ← свалка обязанностей
// ═══════════════════════════════════════════
export function breadTotal(lines: Line[]) {
  return lines.reduce((s, l) => s + l.rub, 0); // ← деньги
}

export function printReceipt(total: number) {
  return \`чек: \${total} ₽\`; // ← печать
}

export function smsReady(phone: string) {
  return \`SMS \${phone}: заказ готов\`; // ← уведомление
}

export function closeShop() {
  /* выключить печь, помыть пол */ // ← смена
}`,
      },
    ],
    clean: [
      {
        id: 'bread-price',
        label: 'src/breadPrice.ts',
        note: 'Один повод: сумма и скидка за хлеб; остальное — в других файлах.',
        executable: false,
        languageLabel: 'ts',
        code: `type Line = { name: string; rub: number };

function sum(lines: Line[]) {
  return lines.reduce((s, l) => s + l.rub, 0);
}

function roundRub(n: number) {
  return Math.round(n);
}

// ═══════════════════════════════════════════
// ONE JOB ← только цена
// ═══════════════════════════════════════════
export function breadTotal(lines: Line[], discount = 0) {
  return roundRub(sum(lines) * (1 - discount)); // ← один повод менять файл
}

// printReceipt → receipts.ts, smsReady → notify.ts
`,
      },
    ],
  },
}

function SmellSwitch({
  value,
  onChange,
}: {
  value: SmellId
  onChange: (id: SmellId) => void
}) {
  return (
    <div className={shell.row}>
      {SMELLS.map((s) => (
        <LabButton
          key={s.id}
          variant="ghost"
          size="sm"
          active={value === s.id}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </LabButton>
      ))}
    </div>
  )
}

function CaseSwitch({ value, onChange }: { value: CaseId; onChange: (id: CaseId) => void }) {
  return (
    <div className={shell.row}>
      {CASES.map((c) => (
        <LabButton
          key={c.id}
          variant="ghost"
          size="sm"
          active={value === c.id}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </LabButton>
      ))}
    </div>
  )
}

export function DirtyCodePropertiesLab() {
  const [smellId, setSmellId] = useState<SmellId>('comments')
  const [caseId, setCaseId] = useState<CaseId>('dirty')

  const problem = (
    <div className={shell.panel}>
      <SmellSwitch value={smellId} onChange={setSmellId} />
      <CaseSwitch value={caseId} onChange={setCaseId} />

      <p className={shell.pain}>{PAIN[smellId]}</p>
      <p className={shell.hint}>{CASE_BRIEF[smellId][caseId]}</p>
    </div>
  )

  const code = (
    <div className={shell.codePane}>
      <SmellSwitch value={smellId} onChange={setSmellId} />
      <CaseSwitch value={caseId} onChange={setCaseId} />
      <InteractiveCodePanel
        key={`${smellId}-${caseId}`}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[smellId]}
        snippets={CODE_SNIPPETS[smellId][caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Признаки грязного кода"
      lead="Три запаха — комментарии, аргументы, связность; переключайте грязный и чистый вариант."
      problem={problem}
      code={code}
    />
  )
}
