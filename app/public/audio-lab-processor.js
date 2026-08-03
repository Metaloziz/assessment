/* Lab AudioWorklet — gain на потоке (клип → worklet → speakers) */
class LabGainProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'gain', defaultValue: 0.3, minValue: 0, maxValue: 1.5, automationRate: 'k-rate' },
    ]
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output || output.length === 0) return true

    const gainParam = parameters.gain
    const gain = gainParam[0] ?? 0.85

    for (let c = 0; c < output.length; c += 1) {
      const outCh = output[c]
      const inCh = input && input[c] ? input[c] : null
      for (let i = 0; i < outCh.length; i += 1) {
        outCh[i] = inCh ? inCh[i] * gain : 0
      }
    }

    return true
  }
}

registerProcessor('lab-gain', LabGainProcessor)
