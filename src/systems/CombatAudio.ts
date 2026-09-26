import type { WeaponId } from '../data/weapons';

/** One quiet, synthesized voice per volley keeps large squads from multiplying volume. */
export class CombatAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private noise?: AudioBuffer;
  private lastImpact = -Infinity;
  muted = false;

  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = this.muted ? 0 : 0.22;
        this.output.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Sound is optional when the browser or device cannot provide audio. */ }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.output && this.context) this.output.gain.setTargetAtTime(this.muted ? 0 : 0.22, this.context.currentTime, 0.015);
  }

  private voice(frequency: number, end: number, duration: number, volume: number, noise = false) {
    const ctx = this.context;
    if (!ctx || !this.output || this.muted || ctx.state !== 'running' || document.hidden) return;
    const source = noise ? ctx.createBufferSource() : ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = noise ? frequency : 3500;
    if (source instanceof AudioBufferSourceNode) source.buffer = this.noise!;
    else {
      source.type = 'triangle';
      source.frequency.setValueAtTime(frequency, ctx.currentTime);
      source.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + duration);
    }
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter).connect(envelope).connect(this.output);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start();
    source.stop(ctx.currentTime + duration + 0.01);
  }

  fire(weapon: WeaponId) {
    switch (weapon) {
      case 'pistol': this.voice(800, 110, 0.09, 0.5); this.voice(4000, 1, 0.045, 0.4, true); break;
      case 'machine-gun': this.voice(550, 90, 0.065, 0.4); this.voice(3200, 1, 0.06, 0.45, true); break;
      case 'shotgun': this.voice(150, 40, 0.22, 0.7); this.voice(2400, 1, 0.2, 0.8, true); break;
      case 'rocket-launcher': this.voice(210, 45, 0.3, 0.6); this.voice(700, 1, 0.32, 0.7, true); break;
    }
  }

  impact(armored: boolean, explosion: boolean) {
    const now = this.context?.currentTime ?? 0;
    if (now - this.lastImpact < (explosion ? 0.12 : 0.07)) return;
    this.lastImpact = now;
    if (explosion) { this.voice(95, 25, 0.4, 0.9); this.voice(900, 1, 0.35, 0.8, true); }
    else this.voice(armored ? 1800 : 180, armored ? 400 : 55, 0.07, 0.22);
  }

  warning() { this.voice(660, 880, 0.2, 0.4); }
  strike() { this.voice(100, 25, 0.35, 0.8); this.voice(650, 1, 0.25, 0.6, true); }
}

export const combatAudio = new CombatAudio();
