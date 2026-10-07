const X = {
  ctx: null,
  master: null,
  initialized: false,
  lastShot: '',
  lastSpeed: 0,
  maxRally: 0,
  lastPlayerStepAt: 0,
  lastPlayerDir: 0,
  moveKeys: new Set(),
};

function soundEnabled() {
  const toggle = document.querySelector('#audioToggle');
  return X.initialized && X.ctx?.state === 'running' && toggle?.dataset.on === 'true';
}

function noiseBuffer(seconds = 0.4) {
  const sampleRate = X.ctx.sampleRate;
  const buffer = X.ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * seconds)), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

async function initExtraAudio() {
  if (X.initialized) {
    if (X.ctx?.state === 'suspended') await X.ctx.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  X.ctx = new AudioCtx();
  X.master = X.ctx.createGain();
  X.master.gain.value = 0.62;
  X.master.connect(X.ctx.destination);
  X.initialized = true;
}

function panNode(pan = 0) {
  const panner = X.ctx.createStereoPanner ? X.ctx.createStereoPanner() : X.ctx.createGain();
  if ('pan' in panner) panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(X.master);
  return panner;
}

function playSqueak(intensity = 0.55, pan = 0) {
  if (!soundEnabled()) return;
  const now = X.ctx.currentTime;
  const level = Math.max(0.2, Math.min(1, intensity));
  const output = panNode(pan);

  const noise = X.ctx.createBufferSource();
  noise.buffer = noiseBuffer(0.11);
  const band = X.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(2450 + level * 850, now);
  band.Q.value = 5.2;
  const gain = X.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.018 + level * 0.038, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085 + level * 0.025);
  noise.connect(band).connect(gain).connect(output);
  noise.start(now);
  noise.stop(now + 0.12);

  const rubber = X.ctx.createOscillator();
  rubber.type = 'triangle';
  rubber.frequency.setValueAtTime(2350 + Math.random() * 350, now);
  rubber.frequency.exponentialRampToValueAtTime(1250 + Math.random() * 220, now + 0.07);
  const rg = X.ctx.createGain();
  rg.gain.setValueAtTime(0.012 + level * 0.022, now);
  rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  rubber.connect(rg).connect(output);
  rubber.start(now);
  rubber.stop(now + 0.09);
}

function playBreath(power = 0.65, recovery = false) {
  if (!soundEnabled()) return;
  const now = X.ctx.currentTime;
  const p = Math.max(0.25, Math.min(1, power));
  const duration = recovery ? 0.42 + p * 0.2 : 0.18 + p * 0.12;
  const noise = X.ctx.createBufferSource();
  noise.buffer = noiseBuffer(duration + 0.05);

  const hp = X.ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = recovery ? 170 : 260;
  const low = X.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = recovery ? 1550 : 1900;
  const body = X.ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 520;
  body.Q.value = 0.8;
  body.gain.value = 5;

  const gain = X.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime((recovery ? 0.025 : 0.014) + p * (recovery ? 0.035 : 0.026), now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(hp).connect(low).connect(body).connect(gain).connect(X.master);
  noise.start(now);
  noise.stop(now + duration + 0.02);

  if (!recovery && p > 0.72) {
    const tone = X.ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(185 + p * 45, now);
    tone.frequency.exponentialRampToValueAtTime(125, now + 0.11);
    const tg = X.ctx.createGain();
    tg.gain.setValueAtTime(0.006 + p * 0.008, now);
    tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    tone.connect(tg).connect(X.master);
    tone.start(now);
    tone.stop(now + 0.14);
  }
}

function playCrowdReaction(rally) {
  if (!soundEnabled()) return;
  const now = X.ctx.currentTime;
  const r = Math.max(1, rally);
  const excitement = Math.min(1, 0.18 + r / 12);
  const duration = 0.65 + excitement * 1.15;

  const crowd = X.ctx.createBufferSource();
  crowd.buffer = noiseBuffer(duration + 0.12);
  const hp = X.ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;
  const low = X.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 1900 + excitement * 650;
  const presence = X.ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 560;
  presence.Q.value = 0.55;
  presence.gain.value = 6 + excitement * 4;
  const g = X.ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.018 + excitement * 0.085, now + 0.09);
  g.gain.exponentialRampToValueAtTime(0.011 + excitement * 0.018, now + duration * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  crowd.connect(hp).connect(low).connect(presence).connect(g).connect(X.master);
  crowd.start(now);
  crowd.stop(now + duration + 0.03);

  if (r >= 6) {
    const voices = Math.min(5, 2 + Math.floor(r / 4));
    for (let i = 0; i < voices; i += 1) {
      const voice = X.ctx.createOscillator();
      voice.type = i % 2 ? 'triangle' : 'sine';
      const base = 260 + Math.random() * 390;
      voice.frequency.setValueAtTime(base, now + 0.02 + i * 0.018);
      voice.frequency.linearRampToValueAtTime(base * (1.08 + Math.random() * 0.12), now + 0.28 + i * 0.018);
      const vg = X.ctx.createGain();
      vg.gain.setValueAtTime(0.0001, now);
      vg.gain.linearRampToValueAtTime(0.003 + excitement * 0.006, now + 0.1 + i * 0.018);
      vg.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + excitement * 0.55);
      voice.connect(vg).connect(X.master);
      voice.start(now + i * 0.018);
      voice.stop(now + 0.62 + excitement * 0.6);
    }
  }
}

function currentPower() {
  const raw = document.querySelector('#powerTelemetryValue')?.textContent || '60';
  return Math.max(0.2, Math.min(1, (parseFloat(raw) || 60) / 100));
}

const shotType = document.querySelector('#shotType');
if (shotType) {
  const react = () => {
    const value = shotType.textContent.trim();
    if (!value || value === X.lastShot) return;
    X.lastShot = value;
    const lower = value.toLowerCase();
    if (lower.includes('forehand') || lower.includes('backhand')) {
      const power = currentPower();
      if (power > 0.5 || X.maxRally >= 4) playBreath(Math.max(power, 0.45 + X.maxRally * 0.025), false);
    }
  };
  new MutationObserver(react).observe(shotType, { childList: true, subtree: true, characterData: true });
}

const rallyEl = document.querySelector('#rallyCount');
if (rallyEl) {
  const readRally = () => {
    const value = parseInt(rallyEl.textContent, 10) || 0;
    X.maxRally = Math.max(X.maxRally, value);
  };
  new MutationObserver(readRally).observe(rallyEl, { childList: true, subtree: true, characterData: true });
  readRally();
}

window.addEventListener('webtennis:opponent-step', (event) => {
  const detail = event.detail || {};
  const pan = detail.side === 'left' ? -0.13 : -0.05;
  playSqueak((detail.intensity || 0.5) * (detail.plant ? 1 : 0.78), pan);
});

const moveCodes = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
function movementDirection() {
  const left = X.moveKeys.has('KeyA') || X.moveKeys.has('ArrowLeft');
  const right = X.moveKeys.has('KeyD') || X.moveKeys.has('ArrowRight');
  return (right ? 1 : 0) - (left ? 1 : 0);
}

document.addEventListener('keydown', (event) => {
  if (!moveCodes.has(event.code)) return;
  const before = movementDirection();
  X.moveKeys.add(event.code);
  const after = movementDirection();
  const now = performance.now();
  if (!event.repeat && document.pointerLockElement?.id === 'game') {
    const reversal = before && after && before !== after;
    if (reversal || now - X.lastPlayerStepAt > 150) {
      playSqueak(reversal ? 0.95 : 0.58, after * 0.12);
      X.lastPlayerStepAt = now;
    }
  }
  X.lastPlayerDir = after;
});

document.addEventListener('keyup', (event) => {
  if (!moveCodes.has(event.code)) return;
  X.moveKeys.delete(event.code);
  if (document.pointerLockElement?.id === 'game' && performance.now() - X.lastPlayerStepAt > 120) {
    playSqueak(0.45, X.lastPlayerDir * 0.1);
    X.lastPlayerStepAt = performance.now();
  }
});

function audioFrame() {
  requestAnimationFrame(audioFrame);
  if (!soundEnabled()) return;
  const locked = document.pointerLockElement?.id === 'game';
  const speed = Math.max(0, parseFloat(document.querySelector('#ballSpeed')?.textContent || '0') || 0);
  const now = performance.now();

  if (locked && X.moveKeys.size && now - X.lastPlayerStepAt > 330) {
    const dir = movementDirection();
    playSqueak(0.34 + (dir ? 0.12 : 0), dir * 0.12);
    X.lastPlayerStepAt = now;
  }

  if (locked && X.lastSpeed > 18 && speed <= 1.5) {
    const rally = Math.max(1, X.maxRally);
    setTimeout(() => playCrowdReaction(rally), 55);
    if (rally >= 5) setTimeout(() => playBreath(Math.min(1, 0.45 + rally * 0.055), true), 190);
    X.maxRally = 0;
  }
  X.lastSpeed = speed;
}

const startButton = document.querySelector('#startButton');
startButton?.addEventListener('click', () => initExtraAudio(), { capture: true });
document.querySelector('#audioToggle')?.addEventListener('click', () => initExtraAudio(), { capture: true });

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM' && !X.initialized) initExtraAudio();
});

requestAnimationFrame(audioFrame);
