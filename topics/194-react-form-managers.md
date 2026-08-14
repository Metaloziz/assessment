# 1. Тема

**Form managers**

---

# 2. Главное в одну фразу

Form manager ведёт values, валидацию и submit, чтобы форма не превращалась в мешок `useState` и лишних ре-рендеров на каждый символ.

---

# 3. Суть

> **Form manager** — слой вокруг `<form>`: хранит values, пометки dirty/touched, гоняет валидацию и submit, а ошибки отдаёт к полям. В React это чаще всего **React Hook Form**, **Formik** или **React Final Form** — не глобальный store приложения, а узкий store формы.
>
> Зачем: регистрация, чекаут, длинный фильтр. Наивный `useState` на каждое поле делает ввод **controlled**: каждый символ — `setState` и повторный `render` всей формы вместе с соседями. Рядом расползаются проверки, `touched` и разбор ответа 400.
>
> Как: менеджер держит снимок полей. React Hook Form по умолчанию **uncontrolled**: `register('email')` вешает `ref` на native input и читает значение при blur/submit — ввод не гоняет дерево. Formik чаще держит values в React state. Валидация — правила поля или схема (`zod` / `yup` через resolver). `handleSubmit` зовёт колбэк только после клиентской проверки; текст под полем — `formState.errors`. Ответ `{ email: 'already taken' }` кладут туда же через `setError`.
>
> Ловушка: тащить каждое нажатие в Redux или широкий Context — те же лишние render. Кастомный инпут без DOM-`ref` (DatePicker, MUI) подключают через `Controller`. Клиентская схема не заменяет проверку на сервере.

---

# 4. Самое главное запомнить

- `useState` на поле = controlled: символ → `setState` → `render` формы и соседей.
- `register` в React Hook Form = uncontrolled: значение в DOM, store читает при blur/submit.
- `handleSubmit` не зовёт колбэк, пока клиентская валидация не прошла.
- `formState.errors` рисует текст у поля; ответ 400 мапят через `setError`.
- Formik — values в React state; RHF — refs и точечные подписки на `formState`.
- Кастомный контрол без native `ref` — `Controller`, не «ещё один `useState` сбоку».
- Частый ввод не кладут в глобальный Redux/Context.

---

# 5. Описание

```text
input
  ├─ controlled: onChange → useState → render всей формы
  └─ register: ref / DOM value → store читает на blur / submit
                    │
                    ▼
              validate (rules / zod)
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   formState.errors      handleSubmit(values)
                               │
                               ▼
                         POST /signup
                               │
                      400 → setError(field)
```

## Controlled vs `register`

Контролируемое поле — источник истины в React:

```tsx
const [email, setEmail] = useState('');

<input
  value={email}
  onChange={(e) => setEmail(e.target.value)} // ← каждый символ: setState формы
/>
```

Соседний `password` тоже входит в `render`, даже если его value не менялся.

`register` из React Hook Form оставляет значение в DOM:

```tsx
import { useForm } from 'react-hook-form';

type Values = { email: string; password: string };

export const SignupForm = () => {
  const { register, handleSubmit } = useForm<Values>();

  return (
    <form onSubmit={handleSubmit((values) => postSignup(values))}>
      <input {...register('email')} /> {/* ← ref, не value+onChange */}
      <input type="password" {...register('password')} />
      <button type="submit">Отправить</button>
    </form>
  );
};
```

Ввод не обязан вызывать `render` родителя. Store забирает значения, когда они нужны (submit, blur, явный `watch`).

## Валидация

Правила рядом с полем или схема на всю форму.

```tsx
<input
  {...register('email', { required: 'укажите email' })} // ← field-level
/>
{errors.email ? <p>{errors.email.message}</p> : null}
```

Схема (`zod` / `yup`) подключается resolver’ом `useForm({ resolver: zodResolver(schema) })`. Один источник правил удобнее, когда одни и те же ограничения живут на клиенте и в типах.

`handleSubmit(onValid)` вызывает `onValid` только если проверка прошла; иначе заполняется `formState.errors`.

## Ошибки сервера

Клиент пропустил «похожий на email» адрес — сервер отвечает 400 с картой полей. Это те же слоты, что и клиентские ошибки:

```tsx
const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>();

const onSubmit = handleSubmit(async (values) => {
  const res = await postSignup(values);
  if (!res.ok) {
    setError('email', { type: 'server', message: res.errors.email }); // ← 400 → поле
    return;
  }
});
```

Пользователь видит текст под `email`, остальные поля не «краснеют» зря.

## Formik и подписки

| | React Hook Form | Formik |
| --- | --- | --- |
| Values по умолчанию | DOM + refs (`register`) | React state (`values` / `handleChange`) |
| Ре-рендер на символ | нет, пока нет `watch` / `mode: 'onChange'` | да, форма подписана на values |
| Кастомный инпут | `Controller` | `Field` / `useField` |

React Final Form ближе к RHF по идее: поле подписывается только на свой кусок store, а не на весь снимок.

`mode: 'onChange'` в RHF включает проверки и обновления на каждый символ — удобно для живого UI, но снова дороже. Для длинной формы чаще `onSubmit` или `onBlur`.

## `Controller` и где не класть форму

MUI `TextField`, DatePicker и другие контролы без обычного native `ref` не принимают `{...register()}`. Их оборачивают в `Controller`: менеджер даёт `value` / `onChange`, ре-рендер остаётся у этого поля.

Форму с частым вводом не поднимают в Redux «на всякий случай»: глобальный store раздаст обновление широкой подписке. Redux — после успешного submit (созданная сущность), не на каждый keydown.

---

# 6. Ссылки

- [React Hook Form — `useForm`](https://react-hook-form.com/docs/useform)
- [React Hook Form — `register`](https://react-hook-form.com/docs/useform/register)
- [React Hook Form — `setError`](https://react-hook-form.com/docs/useform/seterror)
- [Formik — Overview](https://formik.org/docs/overview)
- [React — controlling an input with state](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable)
