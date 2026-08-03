/* Lab Paint Worklet — полоски для background: paint(lab-stripes) */
class LabStripesPainter {
  static get inputProperties() {
    return ['--lab-stripe-color', '--lab-stripe-gap', '--lab-stripe-angle']
  }

  /**
   * @param {PaintRenderingContext2D} ctx
   * @param {{ width: number, height: number }} geom
   * @param {StylePropertyMapReadOnly} props
   */
  paint(ctx, geom, props) {
    const color = String(props.get('--lab-stripe-color') || '').trim() || '#69b1ff'
    const gapRaw = parseFloat(String(props.get('--lab-stripe-gap') || ''))
    const gap = Number.isFinite(gapRaw) && gapRaw > 2 ? gapRaw : 14
    const angleRaw = parseFloat(String(props.get('--lab-stripe-angle') || ''))
    const angle = Number.isFinite(angleRaw) ? angleRaw : 25

    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, geom.width, geom.height)

    ctx.save()
    ctx.translate(geom.width / 2, geom.height / 2)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.translate(-geom.width / 2, -geom.height / 2)

    ctx.fillStyle = color
    const diag = Math.hypot(geom.width, geom.height) * 2
    for (let x = -diag; x < diag; x += gap * 2) {
      ctx.fillRect(x, -diag, gap, diag * 2)
    }
    ctx.restore()
  }
}

registerPaint('lab-stripes', LabStripesPainter)
