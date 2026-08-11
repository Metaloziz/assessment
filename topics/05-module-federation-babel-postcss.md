# 1. Тема

**Module Federation · Как писать свои плагины для Babel и PostCSS**

---

# 2. Главное в одну фразу

Module Federation подгружает модули другого приложения в runtime; плагины Babel и PostCSS обходят AST и меняют JS или CSS на этапе сборки — не через regex по тексту.

---

# 3. Суть

> **Module Federation** (Webpack 5) склеивает приложения в runtime: host подтягивает remote по `remoteEntry.js`, remote отдаёт модули через `exposes`, host прописывает их в `remotes`. Общие зависимости (React, react-dom) кладут в `shared` — часто с `singleton: true`, чтобы не оказалось двух копий React и сломанного контекста.
>
> Рядом по теме — свои плагины трансформации. **Babel plugin** возвращает `visitor`: колбэки по типам узлов JS-AST (`Identifier`, `CallExpression`, …). **PostCSS plugin** — объект с `postcssPlugin` и хуками по CSS-AST (`Once`, `Rule`, `Declaration`). Оба идут по одному пайплайну: parse → правка дерева → generate.
>
> Зачем так: MF даёт независимый деплой кусков UI без монолитного бандла; AST-плагины — предсказуемые правки кода и стилей (автофиксы, директивы, кодоген), а не хрупкий regex по тексту файла. Отладка Babel — через AST Explorer.
>
> Ловушки: в MF — разные major shared без согласования и забытый `singleton` для React; в плагинах — «найти-заменить» строкой вместо обхода дерева (ломается на комментариях, строках, вложенности).

---

# 4. Самое главное запомнить

- MF: host / remote / `shared` / `remoteEntry.js`.
- Babel plugin = `visitor` на JS-AST.
- PostCSS plugin = `postcssPlugin` + хуки по CSS-AST.
- Работаем с деревом, не с текстом файла.
- `shared.singleton` критичен для React.

---

# 5. Описание

## Module Federation

```javascript
new ModuleFederationPlugin({
  name: 'shop',
  filename: 'remoteEntry.js',
  exposes: { './ProductCard': './src/ProductCard' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
```

```javascript
const ProductCard = React.lazy(() => import('shop/ProductCard'));
```

```text
Host ──fetch remoteEntry.js──► Remote
  │                               │
  └── shared react (одна копия) ──┘
```

## Babel plugin (минимум)

```javascript
module.exports = function ({ types: t }) {
  return {
    visitor: {
      Identifier(path) {
        if (path.node.name === 'OLD') path.node.name = 'NEW';
      },
    },
  };
};
```

Отладка: [AST Explorer](https://astexplorer.net/).

## PostCSS plugin (минимум)

```javascript
module.exports = () => ({
  postcssPlugin: 'remove-comments',
  Once(root) {
    root.walkComments((c) => c.remove());
  },
});
module.exports.postcss = true;
```

---

# 6. Ссылки

- [Webpack — Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Babel Plugin Handbook](https://github.com/babel/babel/blob/main/docs/plugin-handbook.md)
- [AST Explorer](https://astexplorer.net/)
- [PostCSS — Write a Plugin](https://postcss.org/docs/writing-a-postcss-plugin)
