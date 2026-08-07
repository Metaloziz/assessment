import { useMemo, useState } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import {
  configureStore,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '02-normalize-immutable-libs'

type Author = { id: number; name: string }
type NestedPost = {
  id: number
  title: string
  author: Author
}

const NESTED_FEED: NestedPost[] = [
  { id: 1, title: 'Immer в RTK', author: { id: 7, name: 'Ada' } },
  { id: 2, title: 'Entity adapter', author: { id: 7, name: 'Ada' } },
  { id: 3, title: 'Normalizr schema', author: { id: 9, name: 'Grace' } },
]

type NestedState = { posts: NestedPost[] }

const nestedSlice = createSlice({
  name: 'nested',
  initialState: { posts: NESTED_FEED } satisfies NestedState as NestedState,
  reducers: {
    renameAuthorEverywhere(state, action: PayloadAction<{ authorId: number; name: string }>) {
      // Вложенный стейт: правим копии автора в каждом посте
      for (const post of state.posts) {
        if (post.author.id === action.payload.authorId) {
          post.author.name = action.payload.name
        }
      }
    },
  },
})

type PostEntity = { id: number; title: string; authorId: number }

const usersAdapter = createEntityAdapter<Author>()
const postsAdapter = createEntityAdapter<PostEntity>()

function normalizeFeed(posts: NestedPost[]) {
  const users = usersAdapter.getInitialState()
  const postState = postsAdapter.getInitialState()
  for (const p of posts) {
    usersAdapter.upsertOne(users, p.author)
    postsAdapter.addOne(postState, {
      id: p.id,
      title: p.title,
      authorId: p.author.id,
    })
  }
  return { users, posts: postState }
}

const normalizedSlice = createSlice({
  name: 'normalized',
  initialState: normalizeFeed(NESTED_FEED),
  reducers: {
    renameUser(state, action: PayloadAction<{ id: number; name: string }>) {
      usersAdapter.updateOne(state.users, {
        id: action.payload.id,
        changes: { name: action.payload.name },
      })
    },
  },
})

function createLabStore() {
  return configureStore({
    reducer: {
      nested: nestedSlice.reducer,
      normalized: normalizedSlice.reducer,
    },
  })
}

type LabStore = ReturnType<typeof createLabStore>
type RootState = ReturnType<LabStore['getState']>
type AppDispatch = LabStore['dispatch']

function useAppDispatch() {
  return useDispatch<AppDispatch>()
}

function useAppSelector<T>(sel: (s: RootState) => T) {
  return useSelector(sel)
}

function NormalizeProblem() {
  const { lines, log, clear } = useLabLog()
  const dispatch = useAppDispatch()
  const nestedPosts = useAppSelector((s) => s.nested.posts)
  const users = useAppSelector((s) => s.normalized.users.entities)
  const postEntities = useAppSelector((s) => s.normalized.posts.entities)
  const postIds = useAppSelector((s) => s.normalized.posts.ids)
  const [name, setName] = useState('Ada Lovelace')

  const nestedAuthorCopies = nestedPosts.filter((p) => p.author.id === 7).length
  const normalizedUser = users[7]

  return (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В ленте один автор <code>Ada</code> вложен в несколько постов. Переименовать её во
        вложенном state — пройтись по всем постам. В нормализованном — одна запись в{' '}
        <code>entities.users</code>.
      </p>
      <ol className={shell.steps}>
        <li>
          Посмотрите вложенный feed: сколько копий автора <code>id: 7</code>.
        </li>
        <li>
          Переименуйте через nested-reducer — правятся все вложенные <code>author</code>.
        </li>
        <li>
          Переименуйте через <code>createEntityAdapter.updateOne</code> — одна сущность, посты
          хранят только <code>authorId</code>.
        </li>
      </ol>

      <div className={shell.row}>
        <label className={shell.field}>
          <span>новое имя (user 7)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <LabButton
          variant="secondary"
          onClick={() => {
            dispatch(nestedSlice.actions.renameAuthorEverywhere({ authorId: 7, name }))
            log(
              'err',
              `nested: прошлись по постам, копий author#7 ≈ ${nestedAuthorCopies}`,
            )
          }}
        >
          Nested: rename везде
        </LabButton>
        <LabButton
          variant="primary"
          onClick={() => {
            dispatch(normalizedSlice.actions.renameUser({ id: 7, name }))
            log('ok', `normalized: usersAdapter.updateOne(7) → «${name}»`)
          }}
        >
          Normalized: updateOne
        </LabButton>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <p className={shell.hint}>
        Nested копий author#7 в постах: <code>{nestedAuthorCopies}</code>. Normalized user#7:{' '}
        <code>{normalizedUser?.name ?? '—'}</code>
      </p>

      <ul className={shell.steps}>
        <li>
          <strong>Nested titles:</strong>{' '}
          {nestedPosts.map((p) => `${p.title} (${p.author.name})`).join(' · ')}
        </li>
        <li>
          <strong>Normalized posts:</strong>{' '}
          {postIds
            .map((id) => {
              const p = postEntities[id as number]
              const a = p ? users[p.authorId] : undefined
              return p ? `${p.title} → user#${p.authorId} (${a?.name ?? '?'})` : ''
            })
            .join(' · ')}
        </li>
      </ul>

      <LabLogView lines={lines} />
    </div>
  )
}

export function NormalizeImmutableLibsLab() {
  const store = useMemo(() => createLabStore(), [])

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      languageLabel="typescript"
      intro="Эталоны React + TypeScript + RTK. Живая нормализация — во вкладке «Решение проблемы»."
      snippets={[
        {
          id: 'shape',
          label: 'Вложено → entities',
          executable: false,
          note: 'Один `author` не копируется в каждый post — только `authorId`.',
          code: `// было (вложено)
type NestedPost = {
  id: number;
  title: string;
  author: { id: number; name: string };
};

// стало (нормализовано)
type State = {
  users: { ids: number[]; entities: Record<number, { id: number; name: string }> };
  posts: {
    ids: number[];
    entities: Record<number, { id: number; title: string; authorId: number }>;
  };
};`,
        },
        {
          id: 'normalizr',
          label: 'Normalizr schema',
          executable: false,
          note: '`normalize` разбирает API; `denormalize` собирает дерево для UI.',
          code: `import { normalize, schema } from 'normalizr';

const user = new schema.Entity('users');
const post = new schema.Entity('posts', { author: user });

const data = [
  { id: 1, title: 'Hello', author: { id: 7, name: 'Ada' } },
  { id: 2, title: 'RTK', author: { id: 7, name: 'Ada' } },
];

const normalized = normalize(data, [post]);
// entities.users[7] — одна запись
// entities.posts[1].author === 7`,
        },
        {
          id: 'adapter',
          label: 'createEntityAdapter',
          executable: false,
          note: 'RTK: ids + entities + addOne / updateOne / setAll из коробки.',
          code: `import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

type User = { id: number; name: string };
const usersAdapter = createEntityAdapter<User>();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    userAdded: usersAdapter.addOne,
    userUpdated: usersAdapter.updateOne,
    usersReceived: usersAdapter.setAll,
  },
});

export const { selectAll, selectById } = usersAdapter.getSelectors(
  (state: { users: ReturnType<typeof usersSlice.reducer> }) => state.users,
);`,
        },
        {
          id: 'immer',
          label: 'Immer update',
          executable: false,
          note: 'Immer не нормализует — упрощает immutable-правки `entities`.',
          code: `import { produce } from 'immer';

type State = {
  entities: { users: Record<number, { id: number; name: string }> };
};

const next = produce(state, (draft) => {
  draft.entities.users[7].name = 'Ada Lovelace';
});
// state !== next, нетронутые ветки шарят ссылки`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Один автор — одна запись в entities"
      lead="React + TypeScript + RTK: сравните nested rename и createEntityAdapter.updateOne."
      problem={
        <Provider store={store}>
          <NormalizeProblem />
        </Provider>
      }
      code={code}
    />
  )
}
