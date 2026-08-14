import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import gsap from 'gsap'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel, type InteractiveSnippet } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'
import { LabField, LabInput } from '../../components/lab/LabField'
import { LabVizPanel } from '../../components/lab/LabViz'
import styles from './ReactFormManagersLab.module.css'

const TOPIC_ID = '194-react-form-managers'
const STEP = 0.6
const TAKEN_EMAIL = 'taken@mail.test'

type CaseId = 'state' | 'register' | 'server'
type Phase = 'idle' | 'typing' | 'fill' | 'submit' | 'done'

const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'state', label: 'useState' },
  { id: 'register', label: 'register' },
  { id: 'server', label: 'setError' },
]

const CODE_INTRO: Record<CaseId, string> = {
  state: 'Контролируемые поля: каждый символ — `setState` всей `SignupForm`.',
  register: '`register` вешает `ref` на input; значение читается на submit, не на каждый символ.',
  server: '`handleSubmit` зовёт API; 400 мапится в поле через `setError`.',
}

const SNIPPET_STATE_FORM: InteractiveSnippet = {
  id: 'signup-state',
  label: 'src/forms/SignupForm.tsx',
  note: '`useState` на каждое поле — controlled: ввод в `email` перерисовывает всю форму.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useState } from 'react';

type Values = { email: string; password: string };

export const SignupForm = () => {
  const [values, setValues] = useState<Values>({ email: '', password: '' });

  // ═══════════════════════════════════════════
  // CONTROLLED ← каждый символ: setState формы
  // ═══════════════════════════════════════════
  const onEmail = (email: string) => {
    setValues((prev) => ({ ...prev, email })); // ← render SignupForm + PasswordField
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void postSignup(values);
      }}
    >
      <EmailField value={values.email} onChange={onEmail} />
      <PasswordField
        value={values.password}
        onChange={(password) => setValues((prev) => ({ ...prev, password }))}
      />
      <button type="submit">Отправить</button>
    </form>
  );
};`,
}

const SNIPPET_STATE_FIELD: InteractiveSnippet = {
  id: 'password-field-state',
  label: 'src/forms/PasswordField.tsx',
  note: 'Сосед не менялся, но входит в `render` родителя вместе с `email`.',
  executable: false,
  languageLabel: 'tsx',
  code: `type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const PasswordField = ({ value, onChange }: Props) => (
  <label>
    Пароль
    <input
      type="password"
      value={value} // ← controlled из родителя
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);`,
}

const SNIPPET_RHF_FORM: InteractiveSnippet = {
  id: 'signup-register',
  label: 'src/forms/SignupForm.tsx',
  note: '`register` пишет в DOM; `handleSubmit` забирает values, когда они нужны.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useForm } from 'react-hook-form';

type Values = { email: string; password: string };

export const SignupForm = () => {
  const { register, handleSubmit } = useForm<Values>();

  // ═══════════════════════════════════════════
  // REGISTER ← ref на native input, не value+onChange
  // ═══════════════════════════════════════════
  return (
    <form onSubmit={handleSubmit((values) => postSignup(values))}>
      <input {...register('email')} />
      <input type="password" {...register('password')} />
      <button type="submit">Отправить</button>
    </form>
  );
};`,
}

const SNIPPET_RHF_FIELD: InteractiveSnippet = {
  id: 'email-register',
  label: 'src/forms/EmailField.tsx',
  note: 'Поле не подписано на values соседа — ввод в пароль его не будит.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useFormContext } from 'react-hook-form';

type Values = { email: string; password: string };

export const EmailField = () => {
  const { register } = useFormContext<Values>();
  return (
    <label>
      Email
      <input {...register('email')} /> {/* ← без value из родителя */}
    </label>
  );
};`,
}

const SNIPPET_SERVER_FORM: InteractiveSnippet = {
  id: 'signup-seterror',
  label: 'src/forms/SignupForm.tsx',
  note: 'Клиентский проход зовёт API; карта 400 идёт в `setError` того же поля.',
  executable: false,
  languageLabel: 'tsx',
  code: `import { useForm } from 'react-hook-form';
import { postSignup } from '../api/signup';

type Values = { email: string; password: string };

export const SignupForm = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>();

  // ═══════════════════════════════════════════
  // SETERROR ← 400 сервера в слот поля
  // ═══════════════════════════════════════════
  const onSubmit = handleSubmit(async (values) => {
    const res = await postSignup(values);
    if (!res.ok) {
      setError('email', { type: 'server', message: res.errors.email });
      return;
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...register('email', { required: 'укажите email' })} />
      {errors.email ? <p>{errors.email.message}</p> : null}
      <input type="password" {...register('password', { minLength: 8 })} />
      <button type="submit" disabled={isSubmitting}>
        Отправить
      </button>
    </form>
  );
};`,
}

const SNIPPET_SERVER_API: InteractiveSnippet = {
  id: 'signup-api',
  label: 'src/api/signup.ts',
  note: 'Контракт 400: ключи = имена полей, не общий `message` на всю форму.',
  executable: false,
  languageLabel: 'ts',
  code: `type Values = { email: string; password: string };

type SignupResult =
  | { ok: true }
  | { ok: false; errors: Partial<Values> };

export const postSignup = async (values: Values): Promise<SignupResult> => {
  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (res.status === 400) {
    const errors = (await res.json()) as Partial<Values>;
    return { ok: false, errors }; // ← { email: 'уже занят' }
  }
  return { ok: true };
};`,
}

const CODE_SNIPPETS: Record<CaseId, InteractiveSnippet[]> = {
  state: [SNIPPET_STATE_FORM, SNIPPET_STATE_FIELD],
  register: [SNIPPET_RHF_FORM, SNIPPET_RHF_FIELD],
  server: [SNIPPET_SERVER_FORM, SNIPPET_SERVER_API],
}

const PAIN =
  'Форма с несколькими полями не должна перерисовывать всё дерево на каждый символ. Менеджер держит values, валидацию и ошибки submit.'

const CASE_BRIEF: Record<CaseId, ReactNode> = {
  state: (
    <>
      Controlled <code>useState</code>: ввод в email поднимает <code>render</code> формы и пароля.
    </>
  ),
  register: (
    <>
      <code>register</code> пишет в DOM; счётчики формы и соседа на символ не растут.
    </>
  ),
  server: (
    <>
      Ответ 400 мапится в <code>setError('email')</code> — текст только у занятого поля.
    </>
  ),
}

type Values = { email: string; password: string }
type FieldErrors = Partial<Values>
type SignupResult = { ok: true } | { ok: false; errors: FieldErrors }

const postSignup = async (values: Values): Promise<SignupResult> => {
  await new Promise((r) => setTimeout(r, 280))
  if (values.email === TAKEN_EMAIL) {
    return { ok: false, errors: { email: 'уже занят' } }
  }
  return { ok: true }
}

const useRenderCount = () => {
  const n = useRef(0)
  n.current += 1
  return n.current
}

const readForm = (form: HTMLFormElement | null): Values => {
  const data = form ? new FormData(form) : null
  return {
    email: String(data?.get('email') ?? ''),
    password: String(data?.get('password') ?? ''),
  }
}

type PlayHandle = {
  typeEmail: (value: string) => void
  fillTaken: () => void
  submit: () => void
}

type ControlledFieldProps = {
  label: string
  name: keyof Values
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
}

const ControlledField = ({ label, name, type = 'text', value, onChange, error }: ControlledFieldProps) => {
  const renders = useRenderCount()
  return (
    <div className={[styles.fieldBlock, error ? styles.fieldBlockErr : ''].filter(Boolean).join(' ')}>
      <LabField
        label={
          <span className={styles.fieldLabel}>
            {label}
            <span className={styles.renderBadge}>render {renders}</span>
          </span>
        }
      >
        <LabInput
          name={name}
          type={type}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </LabField>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
}

type IsolatedFieldProps = {
  label: string
  name: keyof Values
  type?: string
  error?: string
}

const IsolatedField = memo(function IsolatedField({
  label,
  name,
  type = 'text',
  error,
}: IsolatedFieldProps) {
  const renders = useRenderCount()
  return (
    <div className={[styles.fieldBlock, error ? styles.fieldBlockErr : ''].filter(Boolean).join(' ')}>
      <LabField
        label={
          <span className={styles.fieldLabel}>
            {label}
            <span className={styles.renderBadge}>render {renders}</span>
          </span>
        }
      >
        <LabInput name={name} type={type} autoComplete="off" defaultValue="" aria-invalid={error ? true : undefined} />
      </LabField>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
})

const StateForm = memo(
  forwardRef<PlayHandle>(function StateForm(_props, ref) {
    const [values, setValues] = useState<Values>({ email: '', password: '' })
    const [status, setStatus] = useState('idle')
    const renders = useRenderCount()

    useImperativeHandle(ref, () => ({
      typeEmail: (email: string) => setValues((prev) => ({ ...prev, email })),
      fillTaken: () => setValues({ email: TAKEN_EMAIL, password: 'secret12' }),
      submit: () => setStatus(`values · ${values.email || '∅'}`),
    }))

    return (
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault()
          setStatus(`values · ${values.email || '∅'}`)
        }}
      >
        <div className={styles.formHead}>
          <p className={styles.formTitle}>Signup</p>
          <span className={styles.formMeter}>form render {renders}</span>
        </div>
        <ControlledField
          label="Email"
          name="email"
          value={values.email}
          onChange={(email) => setValues((prev) => ({ ...prev, email }))}
        />
        <ControlledField
          label="Пароль"
          name="password"
          type="password"
          value={values.password}
          onChange={(password) => setValues((prev) => ({ ...prev, password }))}
        />
        <div className={styles.actions}>
          <LabButton variant="primary" size="sm" type="submit">
            Отправить
          </LabButton>
          <p className={styles.status}>{status}</p>
        </div>
      </form>
    )
  }),
)

const RegisterForm = memo(
  forwardRef<PlayHandle>(function RegisterForm(_props, ref) {
    const formRef = useRef<HTMLFormElement>(null)
    const [status, setStatus] = useState('idle')
    const renders = useRenderCount()

    const setEmailDom = (value: string) => {
      const el = formRef.current?.elements.namedItem('email')
      if (el instanceof HTMLInputElement) el.value = value
    }

    useImperativeHandle(ref, () => ({
      typeEmail: setEmailDom,
      fillTaken: () => {
        setEmailDom(TAKEN_EMAIL)
        const pwd = formRef.current?.elements.namedItem('password')
        if (pwd instanceof HTMLInputElement) pwd.value = 'secret12'
      },
      submit: () => {
        const { email } = readForm(formRef.current)
        setStatus(`FormData · ${email || '∅'}`)
      },
    }))

    return (
      <form
        ref={formRef}
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault()
          const { email } = readForm(e.currentTarget)
          setStatus(`FormData · ${email || '∅'}`)
        }}
      >
        <div className={styles.formHead}>
          <p className={styles.formTitle}>Signup</p>
          <span className={styles.formMeter}>form render {renders}</span>
        </div>
        <IsolatedField label="Email" name="email" />
        <IsolatedField label="Пароль" name="password" type="password" />
        <div className={styles.actions}>
          <LabButton variant="primary" size="sm" type="submit">
            Отправить
          </LabButton>
          <p className={styles.status}>{status}</p>
        </div>
      </form>
    )
  }),
)

const ServerForm = memo(
  forwardRef<PlayHandle>(function ServerForm(_props, ref) {
    const formRef = useRef<HTMLFormElement>(null)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [status, setStatus] = useState<'idle' | 'pending' | 'ok' | 'err'>('idle')
    const renders = useRenderCount()

    const fillDom = (email: string, password: string) => {
      const form = formRef.current
      if (!form) return
      const emailEl = form.elements.namedItem('email')
      const pwdEl = form.elements.namedItem('password')
      if (emailEl instanceof HTMLInputElement) emailEl.value = email
      if (pwdEl instanceof HTMLInputElement) pwdEl.value = password
    }

    const send = () => {
      const values = readForm(formRef.current)
      if (reducedMotion()) {
        if (values.email === TAKEN_EMAIL) {
          setErrors({ email: 'уже занят' })
          setStatus('err')
        } else {
          setErrors({})
          setStatus('ok')
        }
        return
      }
      setStatus('pending')
      setErrors({})
      void postSignup(values).then((res) => {
        if (!res.ok) {
          setErrors(res.errors)
          setStatus('err')
          return
        }
        setStatus('ok')
      })
    }

    useImperativeHandle(ref, () => ({
      typeEmail: (email: string) => fillDom(email, ''),
      fillTaken: () => fillDom(TAKEN_EMAIL, 'secret12'),
      submit: send,
    }))

    const statusText =
      status === 'pending' ? 'POST /signup…' : status === 'ok' ? '201 · создан' : status === 'err' ? '400 · email' : 'idle'

    return (
      <form
        ref={formRef}
        className={styles.fields}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <div className={styles.formHead}>
          <p className={styles.formTitle}>Signup</p>
          <span className={styles.formMeter}>form render {renders}</span>
        </div>
        <IsolatedField label="Email" name="email" error={errors.email} />
        <IsolatedField label="Пароль" name="password" type="password" error={errors.password} />
        <div className={styles.actions}>
          <LabButton variant="primary" size="sm" type="submit" disabled={status === 'pending'}>
            Отправить
          </LabButton>
          <p
            className={[
              styles.status,
              status === 'ok' ? styles.statusOk : '',
              status === 'err' ? styles.statusErr : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {statusText}
          </p>
        </div>
      </form>
    )
  }),
)

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playTimeline(
  tlRef: MutableRefObject<gsap.core.Timeline | null>,
  steps: Array<() => void>,
  motion: ((tl: gsap.core.Timeline) => void) | null,
  onDone: () => void,
) {
  tlRef.current?.kill()
  if (reducedMotion()) {
    for (const step of steps) step()
    onDone()
    return
  }
  const tl = gsap.timeline({
    defaults: { duration: 0.55, ease: 'power2.inOut' },
    onComplete: onDone,
  })
  tlRef.current = tl
  steps.forEach((step, i) => {
    tl.call(step, undefined, i * STEP)
  })
  motion?.(tl)
}

const FormViz = ({
  caseId,
  phase,
  playRef,
  shellRef,
}: {
  caseId: CaseId
  phase: Phase
  playRef: MutableRefObject<PlayHandle | null>
  shellRef: MutableRefObject<HTMLDivElement | null>
}) => {
  const meta =
    phase === 'idle'
      ? 'до ввода'
      : phase === 'typing'
        ? 'ввод в email'
        : phase === 'fill'
          ? 'values готовы'
          : phase === 'submit'
            ? 'POST /signup'
            : caseId === 'state'
              ? 'все поля в render'
              : caseId === 'register'
                ? 'DOM, без setState'
                : 'ошибка у email'

  const cardClass = [
    styles.card,
    phase === 'typing' || phase === 'fill' ? styles.cardTyping : '',
    phase === 'done' && caseId === 'register' ? styles.cardOk : '',
    phase === 'done' && caseId === 'state' ? styles.cardTyping : '',
    phase === 'done' && caseId === 'server' ? styles.cardErr : '',
    phase === 'submit' ? styles.cardTyping : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <LabVizPanel title="Signup" meta={meta}>
      <div ref={shellRef} className={cardClass}>
        {caseId === 'state' ? (
          <StateForm ref={playRef} />
        ) : caseId === 'register' ? (
          <RegisterForm ref={playRef} />
        ) : (
          <ServerForm ref={playRef} />
        )}
      </div>
    </LabVizPanel>
  )
}

export const ReactFormManagersLab = () => {
  const { lines, log, clear } = useLabLog()
  const [caseId, setCaseId] = useState<CaseId>('state')
  const [hint, setHint] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [formKey, setFormKey] = useState(0)

  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const playRef = useRef<PlayHandle | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const pendingPlay = useRef(false)

  const selectCase = (next: CaseId) => {
    tlRef.current?.kill()
    pendingPlay.current = false
    setBusy(false)
    setCaseId(next)
    clear()
    setPhase('idle')
    setHint(null)
    setFormKey((k) => k + 1)
  }

  const pulseCard = (tl: gsap.core.Timeline, at: number) => {
    tl.call(
      () => {
        const el = shellRef.current
        if (!el) return
        gsap.fromTo(
          el,
          { opacity: 0.72, y: 6 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.inOut' },
        )
      },
      undefined,
      at,
    )
  }

  useEffect(() => {
    if (!pendingPlay.current) return
    pendingPlay.current = false
    const play = playRef.current
    if (!play) {
      setBusy(false)
      return
    }

    if (caseId === 'server') {
      playTimeline(
        tlRef,
        [
          () => {
            setPhase('fill')
            play.fillTaken()
            log('info', `email=${TAKEN_EMAIL}`)
          },
          () => {
            setPhase('submit')
            play.submit()
            log('info', 'POST /signup')
          },
          () => {
            setPhase('done')
            log('err', "400 → setError('email'): уже занят")
            setHint(
              <>
                400 лег в <code>setError('email')</code>, пароль без ошибки
              </>,
            )
          },
        ],
        (tl) => pulseCard(tl, STEP * 2 + 0.05),
        () => setBusy(false),
      )
      return
    }

    playTimeline(
      tlRef,
      [
        () => {
          setPhase('typing')
          play.typeEmail('a')
          log('info', caseId === 'state' ? 'setState email="a"' : 'DOM email="a"')
        },
        () => {
          play.typeEmail('alex')
          log('info', caseId === 'state' ? 'setState email="alex"' : 'DOM email="alex"')
        },
        () => {
          setPhase('done')
          if (caseId === 'state') {
            log('warn', 'form + email + password в render')
            setHint(
              <>
                один <code>setState</code> — <code>render</code> у формы и обоих полей
              </>,
            )
          } else {
            log('ok', 'счётчики render не выросли')
            setHint(
              <>
                значение в DOM, без <code>setState</code> родителя
              </>,
            )
          }
        },
      ],
      (tl) => pulseCard(tl, STEP * 2 + 0.05),
      () => setBusy(false),
    )
  }, [formKey, caseId, log])

  const run = () => {
    tlRef.current?.kill()
    clear()
    setHint(null)
    setPhase('idle')
    pendingPlay.current = true
    setBusy(true)
    setFormKey((k) => k + 1)
  }

  const reset = () => {
    tlRef.current?.kill()
    pendingPlay.current = false
    setBusy(false)
    clear()
    setCaseId('state')
    setPhase('idle')
    setHint(null)
    setFormKey((k) => k + 1)
  }

  const problem = (
    <div className={shell.panel}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            disabled={busy}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>

      <div className={shell.row}>
        <LabButton variant="primary" disabled={busy} onClick={run}>
          Запустить
        </LabButton>
        <LabButton variant="secondary" disabled={busy} onClick={reset}>
          Сброс
        </LabButton>
      </div>

      <p className={shell.pain}>{PAIN}</p>
      <p className={shell.hint}>{CASE_BRIEF[caseId]}</p>

      <FormViz key={formKey} caseId={caseId} phase={phase} playRef={playRef} shellRef={shellRef} />

      {hint ? (
        <p className={shell.hint}>
          Итог: {hint}
        </p>
      ) : null}
      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <div className={styles.codePane}>
      <div className={shell.row}>
        {CASES.map((c) => (
          <LabButton
            key={c.id}
            variant="ghost"
            size="sm"
            active={caseId === c.id}
            onClick={() => selectCase(c.id)}
          >
            {c.label}
          </LabButton>
        ))}
      </div>
      <InteractiveCodePanel
        key={caseId}
        topicId={TOPIC_ID}
        intro={CODE_INTRO[caseId]}
        snippets={CODE_SNIPPETS[caseId]}
      />
    </div>
  )

  return (
    <JsLabShell
      title="Form managers"
      lead="`useForm` + `register`: values и ошибки полей без `useState` на каждый input."
      problem={problem}
      code={code}
    />
  )
}
