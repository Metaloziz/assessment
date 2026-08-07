import { useState } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '01-immutability-js'

type User = { name: string; profile: { city: string } }

type Tracked = {
  user: User
  /** Стабильный ярлык ссылки для лога */
  tag: string
}

function makeUser(city: string, tag: string): Tracked {
  return {
    tag,
    user: { name: 'Anna', profile: { city } },
  }
}

function ImmutabilityProblem() {
  const { lines, log, clear } = useLabLog()
  const [tracked, setTracked] = useState(() => makeUser('Berlin', 'ref-A'))
  const [renders, setRenders] = useState(1)
  const [version, setVersion] = useState(1)

  const bumpRender = (reason: string) => {
    const next = renders + 1
    setRenders(next)
    log('ok', `${reason} → новая ссылка, «render» #${next}`)
  }

  return (
    <div className={shell.panel}>
      <p className={shell.pain}>
        Держите UI-state по ссылке. Если изменить поле на месте и отдать тот же объект,{' '}
        <code>memo</code> / React видят <code>prev === next</code> и могут не перерисоваться.
        Нужна новая версия данных.
      </p>
      <ol className={shell.steps}>
        <li>
          Мутация <code>profile.city</code> на месте — tag ссылки тот же, счётчик «render» не растёт.
        </li>
        <li>
          Иммутабельный update с новым <code>profile</code> — новый tag, счётчик +1.
        </li>
        <li>
          Shallow <code>{'{ ...user }'}</code> не клонирует <code>profile</code>: правка города бьёт и
          «старый» объект.
        </li>
      </ol>

      <div className={shell.row}>
        <LabButton
          variant="secondary"
          onClick={() => {
            const same = tracked.user
            same.profile.city = same.profile.city === 'Berlin' ? 'Prague' : 'Berlin'
            setTracked({ user: same, tag: tracked.tag })
            log(
              'err',
              `mutate in-place → tag ${tracked.tag} тот же; render остаётся #${renders} (memo бы молчал)`,
            )
          }}
        >
          Мутация city
        </LabButton>
        <LabButton
          variant="primary"
          onClick={() => {
            const prevTag = tracked.tag
            const nextTag = `ref-${String.fromCharCode(65 + (version % 26))}`
            const nextUser: User = {
              ...tracked.user,
              profile: {
                ...tracked.user.profile,
                city: tracked.user.profile.city === 'Berlin' ? 'Prague' : 'Berlin',
              },
            }
            setTracked({ user: nextUser, tag: nextTag })
            setVersion((v) => v + 1)
            bumpRender(`immutable ${prevTag} → ${nextTag}`)
          }}
        >
          Новый объект (spread)
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            const original = tracked.user
            const shallow: User = { ...original }
            shallow.profile.city = 'Lisbon'
            setTracked({ user: shallow, tag: tracked.tag })
            log(
              'err',
              `shallow { ...user }: profile общий → original.city тоже «${original.profile.city}»`,
            )
          }}
        >
          Ловушка shallow copy
        </LabButton>
        <LabButton
          variant="secondary"
          onClick={() => {
            setTracked(makeUser('Berlin', 'ref-A'))
            setRenders(1)
            setVersion(1)
            clear()
            log('info', 'сброс: Anna / Berlin, ref-A')
          }}
        >
          Сброс
        </LabButton>
      </div>

      <p className={shell.hint}>
        <code>{tracked.user.name}</code>, city <code>{tracked.user.profile.city}</code>, tag{' '}
        <code>{tracked.tag}</code>, «renders» <code>{renders}</code>
      </p>

      <LabLogView lines={lines} />
    </div>
  )
}

export function ImmutabilityLab() {
  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      languageLabel="typescript"
      intro="Эталоны TypeScript / RTK. Живое сравнение ссылок — во вкладке «Решение проблемы»."
      snippets={[
        {
          id: 'mutate-vs-copy',
          label: 'Мутация vs копия',
          executable: false,
          note: 'Та же ссылка → React часто не видит update. Новый объект → `prev !== next`.',
          code: `type User = { name: string; age: number };

let user: User = { name: 'Anna', age: 25 };

// плохо для state: мутация
user.age = 26;
// setUser(user) — ссылка та же

// хорошо: новая версия
user = { ...user, age: 26 };
// setUser(user) — новая ссылка`,
        },
        {
          id: 'shallow',
          label: 'Ловушка shallow copy',
          executable: false,
          note: '`{ ...obj }` не клонирует вложенные объекты — они общие.',
          code: `const a = { profile: { city: 'Berlin' } };
const b = { ...a };
b.profile.city = 'Prague';
// a.profile.city === 'Prague'

// вложенность тоже копируем:
const c = {
  ...a,
  profile: { ...a.profile, city: 'Prague' },
};
// a.profile.city === 'Berlin'`,
        },
        {
          id: 'immer',
          label: 'Immer / createSlice',
          executable: false,
          note: 'В RTK Immer уже внутри `createSlice`: в `draft` пишете «мутабельно», снаружи новый state.',
          code: `import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type State = { user: { name: string; profile: { city: string } } };

const slice = createSlice({
  name: 'user',
  initialState: {
    user: { name: 'Anna', profile: { city: 'Berlin' } },
  } satisfies State,
  reducers: {
    setCity(state, action: PayloadAction<string>) {
      state.user.profile.city = action.payload; // draft → immutable result
    },
  },
});`,
        },
        {
          id: 'when',
          label: 'Когда мутировать ок',
          executable: false,
          note: 'Иммутабельность — дисциплина UI/state, не всего JavaScript.',
          code: `type State = {
  user: { name: string; profile: { city: string } };
};

// иммутабельно: store, React state, всё что шарят подписчики
function nextState(state: State, city: string): State {
  return {
    ...state,
    user: {
      ...state.user,
      profile: { ...state.user.profile, city },
    },
  };
}

// мутабельно ок: локальный буфер в алгоритме
function sumScores(rows: { score: number }[]): number {
  let total = 0;
  for (const row of rows) total += row.score;
  return total;
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Ссылка та же — UI молчит"
      lead="Мутация vs новая версия объекта, ловушка shallow copy и зачем Immer в RTK."
      problem={<ImmutabilityProblem />}
      code={code}
    />
  )
}
