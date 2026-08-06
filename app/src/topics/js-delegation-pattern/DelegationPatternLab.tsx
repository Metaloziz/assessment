import { useState, type MouseEvent } from 'react'
import { JsLabShell } from '../../components/lab/JsLabShell'
import { LabButton } from '../../components/lab/LabButton'
import shell from '../../components/lab/JsLabShell.module.css'
import { InteractiveCodePanel } from '../../components/lab/InteractiveCodePanel'
import { LabLogView } from '../../components/lab/LabLogView'
import { useLabLog } from '../../components/lab/useLabLog'

const TOPIC_ID = '110-js-delegation-pattern'

type Item = { id: number; label: string }

const INITIAL: Item[] = [
  { id: 1, label: 'Пункт A' },
  { id: 2, label: 'Пункт B' },
  { id: 3, label: 'Пункт C' },
]

export function DelegationPatternLab() {
  const { lines, log, clear } = useLabLog()
  const [items, setItems] = useState<Item[]>(INITIAL)
  const [nextId, setNextId] = useState(4)
  const [blockBubble, setBlockBubble] = useState(false)

  const onListClick = (e: MouseEvent<HTMLUListElement>) => {
    const list = e.currentTarget
    const target = e.target as HTMLElement

    if (blockBubble && target.dataset.role === 'icon') {
      e.stopPropagation()
      log('err', 'stopPropagation на иконке — делегат на ul не сработал')
      return
    }

    const btn = target.closest('[data-action="pick"]') as HTMLElement | null
    if (!btn || !list.contains(btn)) {
      log('info', `мимо: target=<${target.tagName.toLowerCase()}>, currentTarget=<ul>`)
      return
    }

    const row = btn.closest('[data-id]') as HTMLElement | null
    const id = Number(row?.dataset.id)
    log(
      'ok',
      `target=<${target.tagName.toLowerCase()}> → closest(button) → id=${id}; currentTarget=ul`,
    )
  }

  const problem = (
    <div className={shell.panel}>
      <p className={shell.pain}>
        В меню пункты добавляют на лету. Вешать клик на каждый — легко забыть. Один слушатель на
        список ловит всплытие; важно не перепутать <code>target</code> и{' '}
        <code>currentTarget</code> и не оборвать всплытие.
      </p>
      <ol className={shell.steps}>
        <li>
          Слушатель на <code>ul</code>: <code>currentTarget</code> — список,{' '}
          <code>target</code> — что реально кликнули.
        </li>
        <li>
          Клик по иконке внутри кнопки — ищем кнопку через <code>closest</code>.
        </li>
        <li>
          <code>stopPropagation</code> на потомке ломает делегирование выше.
        </li>
      </ol>

      <ul className={shell.list} onClick={onListClick}>
        {items.map((item) => (
          <li key={item.id} className={shell.listItem} data-id={String(item.id)}>
            <span>{item.label}</span>
            <LabButton variant="secondary" data-action="pick">
              <span data-role="icon" aria-hidden>
                ★
              </span>{' '}
              Выбрать
            </LabButton>
          </li>
        ))}
      </ul>

      <div className={shell.row}>
        <LabButton variant="primary" onClick={() => {
            const id = nextId
            setNextId(id + 1)
            setItems((prev) => [...prev, { id, label: `Пункт ${id}` }])
            log('info', `добавили #${id} — новый слушатель не нужен`)
          }}
        >
          Добавить пункт
        </LabButton>
        <label
          className={shell.field}
          style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}
        >
          <input
            type="checkbox"
            checked={blockBubble}
            onChange={(e) => setBlockBubble(e.target.checked)}
          />
          <span>stopPropagation на ★</span>
        </label>
        <LabButton variant="secondary" onClick={clear}>
          Очистить лог
        </LabButton>
      </div>

      <LabLogView lines={lines} />
    </div>
  )

  const code = (
    <InteractiveCodePanel
      topicId={TOPIC_ID}
      intro="Примеры идеи делегирования: `closest`, `contains`, `target` vs `currentTarget`, `stopPropagation`."
      snippets={[
        {
          id: 'delegate',
          label: 'closest + contains',
          code: `function handleClick(event, listEl) {
  const button = event.target.closest('[data-action="pick"]');
  if (!button || !listEl.contains(button)) return;
  console.log('выбрали', button.dataset.id);
}

// клик по иконке внутри кнопки
const button = {
  matches: (s) => s === '[data-action="pick"]',
  closest(s) { return this.matches(s) ? this : null; },
  dataset: { id: '7' },
};
const icon = {
  closest(s) { return button.closest(s); },
};
const list = {
  contains(el) { return el === button; },
};

handleClick({ target: icon }, list);`,
        },
        {
          id: 'target-vs-current',
          label: 'target vs currentTarget',
          note: '`target` — источник события; `currentTarget` — узел с этим обработчиком.',
          code: `function onListClick(event) {
  console.log('target:', event.target.tagName);
  console.log('currentTarget:', event.currentTarget.tagName);
}

onListClick({
  target: { tagName: 'SPAN' },
  currentTarget: { tagName: 'UL' },
});`,
        },
        {
          id: 'stop',
          label: 'stopPropagation',
          code: `let reachedList = false;

function onIcon(e) {
  e.stopPropagation();
  console.log('иконка перехватила клик');
}

function onList() {
  reachedList = true;
  console.log('делегат на ul');
}

const event = {
  stopped: false,
  stopPropagation() { this.stopped = true; },
};

onIcon(event);
if (!event.stopped) onList();
console.log('дошли до ul?', reachedList);`,
        },
        {
          id: 'focusin',
          label: 'focus не всплывает',
          note: 'Для фокуса делегируют `focusin` / `focusout`.',
          code: `const bubbling = {
  click: true,
  focus: false,
  blur: false,
  focusin: true,
  focusout: true,
};

for (const [type, bubbles] of Object.entries(bubbling)) {
  console.log(
    type + ':',
    bubbles ? 'можно делегировать' : 'нужен focusin/focusout или захват',
  );
}`,
        },
      ]}
    />
  )

  return (
    <JsLabShell
      title="Один обработчик на предке"
      lead="Делегирование опирается на всплытие: closest находит нужный потомок, contains проверяет контейнер."
      problem={problem}
      code={code}
    />
  )
}
