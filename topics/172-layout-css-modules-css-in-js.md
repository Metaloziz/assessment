# 1. Тема

**Современные подходы к организации стилей:** CSS Modules · CSS-in-JS

---

# 2. Главное в одну фразу

CSS Modules локализуют классы на этапе сборки через хеши; CSS-in-JS описывает стили рядом с компонентом и часто решает динамику в рантайме — оба подхода бьют по глобальным коллизиям `.btn`.

---

# 3. Суть

> В большом UI глобальные селекторы вроде `.button` и `.title` рано или поздно сталкиваются: два компонента объявили одно имя — побеждает тот CSS, что подключился последним, и стили «протекают» между экранами. **CSS Modules** и **CSS-in-JS** — два рабочих ответа на эту боль: изолировать стили компонента так, чтобы чужой класс не перекрашивал ваш.

> Зачем это нужно на практике: команда растит UI-кит, фичи параллельно, имена классов короткие и похожие. Без изоляции рефакторинг «поправить кнопку» ломает соседний виджет. Локальные стили держат контракт «этот файл стилей принадлежит этому компоненту».

> **CSS Modules** — это обычный CSS (или SCSS), но сборщик (`css-loader`, Vite) превращает локальные классы в уникальные: `.root` → `Button_root_a3f2`. В JS импортируют объект `styles` и пишут `className={styles.root}`. Глобаль оставляют явно (`:global`). **CSS-in-JS** (styled-components, Emotion, vanilla-extract и др.) держит стили в JS/TS рядом с компонентом: проще прокинуть `props` / тему в правила; часть решений генерирует классы на этапе сборки, часть — вставляет `<style>` в рантайме.

> Ловушка: Modules не отменяют каскад и specificity — `:global(.ant-btn)` снова открывает дверь коллизиям. CSS-in-JS с тяжёлым runtime раздувает бандл и усложняет SSR (FOUC, hydration). Выбор — про изоляцию и динамику, а не про «какой синтаксис моднее».

---

# 4. Самое главное запомнить

- Глобальный `.btn` в двух файлах — одна область имён; Modules/CSS-in-JS дают локальные имена.
- CSS Modules: `import styles from './X.module.css'` → `styles.root` уже с хешем после сборки.
- `:global(...)` в Modules — осознанный выход из изоляции; без нужды не трогать.
- CSS-in-JS удобен, когда стиль зависит от `props` / темы; цена — runtime или сложнее SSR.
- Zero-runtime варианты (vanilla-extract, Linaria, Pigment) ближе к Modules по модели «классы на билде».
- Изоляция классов ≠ дизайн-система: токены и один primary — отдельный слой поверх любого подхода.

---

# 5. Описание

```text
  Глобальный CSS                 CSS Modules                    CSS-in-JS
  ─────────────                  ───────────                    ─────────
  .btn { … }                     .root { … }                    const Btn = styled.button`
  везде одно имя                   │                              ${p => p.$primary && …}`
       │                           ▼                                    │
       ▼                     Button_root_x7k2                           ▼
  коллизии / leak            className={styles.root}            класс / style на билде
                                                                  или в runtime
```

## Проблема глобальных стилей

Браузер не знает про «компонент React». Любой `.card` из `A.css` и `.card` из `B.css` — один селектор в документе. Порядок `<link>` / импортов решает, чьи правила победят. БЭМ и длинные префиксы снижают риск вручную; Modules и CSS-in-JS делают изоляцию инструментом.

## CSS Modules

Файл `Button.module.css` (суффикс `.module` — сигнал сборщику):

```css
.root {
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

/* ← редкий случай: чужой глобальный класс */
.root :global(.icon) {
  margin-inline-end: 0.35rem;
}
```

```tsx
import styles from './Button.module.css';

export function Button({ children }: { children: React.ReactNode }) {
  return <button type="button" className={styles.root}>{children}</button>;
}
```

После сборки в DOM что-то вроде `class="Button_root_a3f2"`. Второй компонент с локальным `.root` получит **другой** хеш — коллизии нет.

Композиция: `composes: base from './shared.module.css'` (или `@value` в старых гайдах) — переиспользование без копипасты селекторов. Composition API зависит от лоадера; в Vite/css-loader смотрите актуальную доки.

## CSS-in-JS

Два семейства:

| Семейство | Когда стили появляются | Примеры |
| --- | --- | --- |
| Runtime | при исполнении JS, часто `<style>` в `<head>` | styled-components, Emotion |
| Zero-runtime / build-time | на сборке, как Modules | vanilla-extract, Linaria, Pigment CSS |

Runtime-пример (идея styled-components / Emotion):

```tsx
const Button = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  background: ${(p) => (p.$primary ? 'var(--accent)' : 'transparent')};
`;
```

Плюс: стиль и логика варианта рядом, тема через `ThemeProvider`. Минус runtime: стоимость на клиенте, аккуратность с SSR (критический CSS, совпадение классов при hydration).

Build-time CSS-in-JS ближе к Modules: пишете в TS, на выходе — статические классы и CSS-файл, без генерации в браузере.

## Что выбрать

| Ситуация | Частый выбор |
| --- | --- |
| Много статичного UI, знаком CSS/SCSS | CSS Modules (+ токены) |
| Сильная зависимость стиля от props / темы в JS | CSS-in-JS (лучше zero-runtime, если важны perf/SSR) |
| Уже Ant Design / MUI со своими классами | Modules/`:global` точечно или CSS-in-JS поверх темы либы |
| Нужна дизайн-система | любой подход + **токены**; изоляция классов сама по себе токены не заменяет |

## Типичные ловушки

```text
Modules + :global(.btn) везде     → снова общая помойка имён
CSS-in-JS: style={{ margin: n }}  → на каждый рендер новый объект; лучше класс / css``
Два подхода вперемешку без правил → непонятно, где править «ту синюю кнопку»
```

---

# 6. Ссылки

- [CSS Modules — спецификация / гайд](https://github.com/css-modules/css-modules)
- [Vite — CSS Modules](https://vitejs.dev/guide/features.html#css-modules)
- [webpack css-loader — modules](https://webpack.js.org/loaders/css-loader/#modules)
- [styled-components — docs](https://styled-components.com/docs)
- [Emotion — docs](https://emotion.sh/docs/introduction)
- [vanilla-extract — docs](https://vanilla-extract.style/)
