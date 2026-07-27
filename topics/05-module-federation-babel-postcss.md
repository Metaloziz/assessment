# 1. Тема

**Module Federation. Как писать свои плагины для Babel и PostCSS**

---

# 2. Главное в одну фразу

Module Federation загружает модули из других приложений в runtime, а плагины Babel и PostCSS — функции-трансформеры, которые обходят AST и меняют JS или CSS на этапе сборки.

---

# 3. Ответ для собеседования

> «**Module Federation** (Webpack 5) — микрофронтенды: host подгружает remote через `remoteEntry.js`. Remote — `exposes`, host — `remotes`, общие зависимости в `shared` (часто `singleton` для React).
>
> **Babel plugin** — функция с `visitor` по AST-узлам JS.
> **PostCSS plugin** — функция с хуками (`Once`, `Rule`, `Declaration`) по CSS-AST.
>
> Общий принцип обоих: parse → transform AST → generate. Не regex по тексту.»

---

# 4. Самое главное запомнить

- MF = runtime sharing: host / remote / `shared`.
- Babel plugin = `visitor`.
- PostCSS plugin = `postcssPlugin` + хуки.
- Работаем с **AST**, не с текстом.

---

# 5. Описание

## Module Federation

```javascript
new ModuleFederationPlugin({
  name: 'shop',
  filename: 'remoteEntry.js',
  exposes: { './ProductCard': './src/ProductCard' },
  shared: { react: { singleton: true } },
});
```

```javascript
const ProductCard = React.lazy(() => import('shop/ProductCard'));
```

## Babel plugin (минимум)

```javascript
module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression(path) { /* transform */ },
    },
  };
};
```

## PostCSS plugin (минимум)

```javascript
module.exports = () => ({
  postcssPlugin: 'remove-comments',
  Once(root) {
    root.walkComments(c => c.remove());
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
