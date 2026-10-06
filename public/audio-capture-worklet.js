/**
 * J.A.R.V.I.S. Executive OS — Real-Time 16kHz Mono PCM AudioWorklet Processor
 */
console.log('[AudioWorklet] Global scope detected, registering jarvis-pcm-capture-processor');

class JarvisAudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.chunkSamples = 640; // 40ms at 16kHz
    this.pcmBuffer = new Int16Array(this.chunkSamples);
    this.bufferOffset = 0;
    this.hasLoggedFirstChunk = false;
    console.log('[AudioWorklet] Processor instance created. Target: 16kHz');
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0];
    const inRate = sampleRate || 48000;
    
    // Exact ratio for precision
    const ratio = inRate / this.targetSampleRate;

    if (!this.hasLoggedFirstChunk) {
      console.log(`[AudioWorklet] Resampling active. Input: ${inRate}Hz -> Output: ${this.targetSampleRate}Hz. Mono PCM16 LE.`);
    }

    // Process all input samples using linear interpolation for resampling
    for (let i = 0; i < channelData.length; i++) {
      // Logic: we want to sample at target intervals.
      // However, simplified linear stream is often more robust for live audio.
      // We'll use a source-pointer based approach to avoid drift.
    }

    // REWRITING process loop for high-fidelity resampling
    const sourceData = channelData;
    let sourceIdx = 0;

    // Use a persistent source pointer to avoid phase drift across process blocks
    if (this.sourcePtr === undefined) this.sourcePtr = 0;

    while (this.sourcePtr < sourceData.length) {
      const idx0 = Math.floor(this.sourcePtr);
      const idx1 = Math.min(sourceData.length - 1, idx0 + 1);
      const frac = this.sourcePtr - idx0;
      
      const sample = sourceData[idx0] * (1 - frac) + sourceData[idx1] * frac;
      
      // Calculate RMS for telemetry
      this.rmsSum = (this.rmsSum || 0) + sample * sample;
      this.rmsCount = (this.rmsCount || 0) + 1;

      // Convert to Int16 LE
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      
      this.pcmBuffer[this.bufferOffset++] = int16;

      if (this.bufferOffset >= this.chunkSamples) {
        const frameCopy = new Int16Array(this.pcmBuffer);
        const rms = Math.sqrt(this.rmsSum / this.rmsCount);
        
        this.port.postMessage(
          {
            type: 'pcm16',
            buffer: frameCopy.buffer,
            rms,
            sampleRate: this.targetSampleRate,
            samples: this.chunkSamples
          },
          [frameCopy.buffer]
        );
        
        this.bufferOffset = 0;
        this.rmsSum = 0;
        this.rmsCount = 0;
        this.hasLoggedFirstChunk = true;
      }

      this.sourcePtr += ratio;
    }

    // Adjust pointer for next block
    this.sourcePtr -= sourceData.length;

    return true;
  }
}

registerProcessor('jarvis-pcm-capture-processor', JarvisAudioCaptureProcessor);
