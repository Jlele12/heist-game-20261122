// Original sound, synthesized with Web Audio — no files, no samples: a soft tick when loot is
// taken, a rising two-tone sting when the vault cracks, a sharp alarm klaxon when caught, and
// a low whoosh for the sprint noise ping. All tones are this entry's own.

export class Sfx {
  constructor() {
    /** @type {AudioContext} */
    this.ctx = null;
    this.muted = false;
  }

  /** The context is created on first use: browsers only allow audio after a user gesture. */
  ac() {
    if (!this.ctx) this.ctx = new (window.AudioContext ?? window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** One enveloped oscillator tone. */
  tone(freq, seconds, type = 'sine', gain = 0.12, when = 0) {
    if (this.muted) return;
    const ac = this.ac();
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(env).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  gem() { this.tone(880, 0.12, 'triangle'); this.tone(1320, 0.16, 'triangle', 0.08, 0.07); }
  vault() { this.tone(220, 0.5, 'square', 0.06); this.tone(440, 0.5, 'square', 0.05, 0.18); this.tone(660, 0.7, 'triangle', 0.1, 0.36); }
  alarm() {
    for (let i = 0; i < 3; i += 1) {
      this.tone(740, 0.22, 'sawtooth', 0.1, i * 0.3);
      this.tone(520, 0.22, 'sawtooth', 0.1, i * 0.3 + 0.14);
    }
  }
  noise() { this.tone(140, 0.25, 'sine', 0.08); }
  clear() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, i * 0.12)); }
}
