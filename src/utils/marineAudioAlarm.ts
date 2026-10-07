/**
 * Système d'Alerte Sonore de Passerelle Maritime (Norme IMO / IEC 62288 ECDIS)
 * Génère des signaux d'avertissement acoustiques anti-collision via la Web Audio API.
 */

class MarineAudioAlarmService {
  private audioCtx: AudioContext | null = null;
  private isAlarmPlaying: boolean = false;
  private alarmInterval: any = null;
  private isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Joue un train d'impulsions acoustiques de collision (Bip bitonal d'urgence IMO : 960Hz / 770Hz)
   */
  public playCollisionBurst(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Impulsion 1 (Aiguë : 960 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(960, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);

      // Impulsion 2 (Grave : 770 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(770, now + 0.25);

      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.25);
      osc2.stop(now + 0.55);

      // Impulsion 3 (Aiguë de confirmation)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'square';
      osc3.frequency.setValueAtTime(1040, now + 0.58);

      gain3.gain.setValueAtTime(0, now + 0.58);
      gain3.gain.linearRampToValueAtTime(0.2, now + 0.61);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc3.start(now + 0.58);
      osc3.stop(now + 0.8);
    } catch (e) {
      console.warn('Audio non disponible', e);
    }
  }

  /**
   * Démarre la sonnerie d'alarme périodique (toutes les 3,5 secondes) si un danger persiste
   */
  public startEmergencyAlarm(): void {
    if (this.isAlarmPlaying || this.isMuted) return;
    this.isAlarmPlaying = true;
    this.playCollisionBurst();

    this.alarmInterval = setInterval(() => {
      if (this.isAlarmPlaying && !this.isMuted) {
        this.playCollisionBurst();
      }
    }, 3500);
  }

  /**
   * Arrêt / Acquittement de l'alarme sonore
   */
  public stopAlarm(): void {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarm();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const marineAudioAlarm = new MarineAudioAlarmService();
