// Every sound is synthesized with WebAudio oscillators and noise: no audio
// files, nothing loaded. The context is created on the first user gesture
// (browsers block audio before one) and stays muted until then.
export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq = 440, to = null, type = 'sine', dur = 0.1, vol = 0.2, delay = 0, attack = 0.004 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.15, vol = 0.2, delay = 0, low = 400, high = 4000 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (low + high) / 2;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
  }

  function startPad() {
    if (!ctx || padNodes || muted) return;
    // A slow, quiet two-oscillator night drone under everything.
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 82.4;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 123.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(gain.gain);
    o1.connect(gain); o2.connect(gain); gain.connect(master);
    o1.start(); o2.start(); lfo.start();
    padNodes = { gain, o1, o2, lfo };
  }

  function stopPad() {
    if (!padNodes) return;
    try { padNodes.o1.stop(); padNodes.o2.stop(); padNodes.lfo.stop(); } catch { /* already stopped */ }
    padNodes = null;
  }

  return {
    get muted() { return muted; },
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (ensure()) {
        if (ctx.state === 'suspended') ctx.resume();
        startPad();
      }
    },
    toggleMute() {
      muted = !muted;
      if (muted) stopPad();
      else if (unlocked && ensure()) startPad();
      return muted;
    },
    shoot() { tone({ freq: 880, to: 220, type: 'square', dur: 0.07, vol: 0.08 }); },
    hit() { noise({ dur: 0.05, vol: 0.12, low: 900, high: 3000 }); },
    enemyDie() {
      tone({ freq: 320, to: 60, type: 'sawtooth', dur: 0.18, vol: 0.14 });
      noise({ dur: 0.12, vol: 0.1, low: 300, high: 1200 });
    },
    bigDie() {
      tone({ freq: 180, to: 40, type: 'sawtooth', dur: 0.4, vol: 0.22 });
      noise({ dur: 0.35, vol: 0.2, low: 150, high: 800 });
    },
    pickup() { tone({ freq: 1046, to: 1568, type: 'sine', dur: 0.09, vol: 0.12 }); },
    heart() {
      tone({ freq: 523, type: 'sine', dur: 0.1, vol: 0.14 });
      tone({ freq: 784, type: 'sine', dur: 0.16, vol: 0.14, delay: 0.09 });
    },
    hurt() {
      tone({ freq: 160, to: 70, type: 'square', dur: 0.16, vol: 0.18 });
      noise({ dur: 0.1, vol: 0.12, low: 200, high: 700 });
    },
    lighthouseHit() {
      tone({ freq: 220, to: 110, type: 'sawtooth', dur: 0.3, vol: 0.2 });
      tone({ freq: 233, to: 116, type: 'sawtooth', dur: 0.3, vol: 0.16, delay: 0.02 });
    },
    dash() { noise({ dur: 0.14, vol: 0.1, low: 1200, high: 5000 }); },
    waveStart() {
      tone({ freq: 196, type: 'triangle', dur: 0.35, vol: 0.18 });
      tone({ freq: 294, type: 'triangle', dur: 0.35, vol: 0.18, delay: 0.12 });
    },
    upgrade() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.14, vol: 0.13, delay: i * 0.07 }));
    },
    click() { tone({ freq: 660, type: 'sine', dur: 0.05, vol: 0.1 }); },
    bossRoar() {
      tone({ freq: 90, to: 45, type: 'sawtooth', dur: 0.9, vol: 0.25 });
      tone({ freq: 135, to: 60, type: 'square', dur: 0.9, vol: 0.12, delay: 0.05 });
    },
    win() {
      [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.15, delay: i * 0.11 }));
    },
    lose() {
      [330, 294, 247, 196].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.16, delay: i * 0.18 }));
    },
  };
}
