/** Sound + haptics for dramatic moments. No audio assets: everything is synthesized. */

let ctx: AudioContext | null = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("lp-muted", value ? "1" : "0");
  }
}

export function loadMuted() {
  if (typeof window === "undefined") return false;
  muted = window.localStorage.getItem("lp-muted") === "1";
  return muted;
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.12, delay = 0) {
  const ac = audio();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + delay);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + delay + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export const sfx = {
  press() {
    tone(160, 0.09, "square", 0.09);
    tone(420, 0.14, "triangle", 0.08, 0.03);
    vibrate(28);
  },
  reset() {
    tone(880, 0.1, "square", 0.07);
    tone(1320, 0.12, "square", 0.06, 0.07);
    tone(220, 0.4, "sawtooth", 0.05, 0.12);
    vibrate([18, 40, 60]);
  },
  tick() {
    tone(1200, 0.035, "square", 0.045);
  },
  warn() {
    tone(320, 0.2, "sawtooth", 0.06);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, "triangle", 0.09, i * 0.13));
    vibrate([40, 60, 40, 60, 200]);
  },
};
