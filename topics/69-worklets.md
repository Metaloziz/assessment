# 1. Тема

**Worklets**

---

# 2. Главное в одну фразу

Worklet — лёгкий изолированный скрипт браузера для узких задач рендера/аудио (paint, audio, layout…), без доступа к DOM и с упором на низкую задержку.

---

# 3. Суть

> **Worklets** — не «ещё один Web Worker для всего», а специализированные точки расширения: **CSS Paint Worklet** (кастомный `paint()` фон), **AudioWorklet** (обработка звука в realtime), экспериментальные **Layout** / animation worklets.
>
> Контекст **изолирован**: нет DOM/`window` в привычном виде. Код регистрируется (`registerPaint`, `registerProcessor`) и подключается из CSS/Web Audio. Цель — вынести горячие куски с main thread и дать движку оптимизировать цикл.
>
> Поддержка и стабильность API различаются; на практике чаще всего встречаются **AudioWorklet** и **Paint API (Houdini)**. Для обычной бизнес-логики — Worker/обычный JS, не worklet.

---

# 4. Самое главное запомнить

- Узкая специализация (paint/audio/…), не универсальный фон.
- Нет DOM; регистрация через dedicated API.
- Paint: `background: paint(name)`; Audio: `AudioWorkletNode`.
- Поддержка по браузерам проверять отдельно.
- Для тяжёлой бизнес-логики → Web Worker.

| Тип | Назначение |
|---|---|
| Paint Worklet | Кастомная отрисовка в CSS |
| Audio Worklet | DSP / эффекты в Web Audio |
| Layout Worklet | Кастомный layout (ограниченная поддержка) |

---

# 5. Описание

### Paint Worklet (идея)

```javascript
// paint-worklet.js
class StripePainter {
  paint(ctx, geom) {
    ctx.fillStyle = '#69b1ff'
    ctx.fillRect(0, 0, geom.width, geom.height / 2)
  }
}
registerPaint('stripe', StripePainter)
```

```css
.box {
  background-image: paint(stripe);
}
```

```javascript
CSS.paintWorklet.addModule('/paint-worklet.js')
```

### Audio Worklet (идея)

```javascript
class GainProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    for (let c = 0; c < input.length; c++) output[c].set(input[c])
    return true
  }
}
registerProcessor('gain-processor', GainProcessor)
```

```javascript
await audioContext.audioWorklet.addModule('/gain-processor.js')
const node = new AudioWorkletNode(audioContext, 'gain-processor')
```

### Практика

- не тащить тяжёлые аллокации в `process`/`paint` на каждый кадр;
- feature-detect перед использованием;
- отладка через Sources / Performance.

---

# 6. Ссылки

- [MDN — Worklet](https://developer.mozilla.org/en-US/docs/Web/API/Worklet)
- [MDN — CSS Painting API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API)
- [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Chrome — Paint Worklet](https://developer.chrome.com/docs/css-ui/houdini)
