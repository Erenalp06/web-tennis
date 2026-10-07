import * as THREE from 'three';

const A = {
  ctx: null,
  master: null,
  ambience: null,
  ambienceSource: null,
  ambienceLfo: null,
  enabled: true,
  initialized: false,
  ball: null,
  lastBallY: null,
  lastBallDy: 0,
  lastBounceAt: 0,
  lastShot: '',
  lastSpeed: 0,
  crowdTarget: 0.022,
};

const clamp = THREE.MathUtils.clamp;

function ensureUi() {
  if (document.querySelector('#audioToggle')) return;
  const button = document.createElement('button');
  button.id = 'audioToggle';
  button.type = 'button';
  button.textContent = 'SES AÇ';
  button.setAttribute('aria-label', 'Sesi aç veya kapat');
  document.body.appendChild(button);

  const style = document.createElement('style');
  style.textContent = `
    #audioToggle {
      position: fixed;
      top: 16px;
      right: 92px;
      z-index: 40;
      border: 1px solid rgba(255,255,255,.15);
      background: rgba(4,14,30,.58);
      color: rgba(255,255,255,.82);
      backdrop-filter: blur(10px);
      border-radius: 999px;
      padding: 8px 12px;
      font: 700 10px/1 system-ui, sans-serif;
      letter-spacing: .12em;
      cursor: pointer;
      transition: background .18s ease, border-color .18s ease, color .18s ease;
    }
    #audioToggle:hover { background: rgba(12,35,64,.8); border-color: rgba(255,255,255,.28); color: #fff; }
    #audioToggle[data-on="true"] { border-color: rgba(217,255,72,.34); color: #d9ff48; }
  `;
  document.head.appendChild(style);

  button.addEventListener('click', async () => {
    if (!A.initialized) await initAudio();
    else setEnabled(!A.enabled);
  });
}

function setEnabled(enabled) {
  A.enabled = enabled;
  const button = document.querySelector('#audioToggle');
  if (button) {
    button.dataset.on = String(enabled && A.initialized);
    button.textContent = enabled && A.initialized ? 'SES AÇIK' : 'SES KAPALI';
  }
  if (A.master && A.ctx) {
    const now = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(now);
    A.master.gain.setTargetAtTime(enabled ? 0.9 : 0.0001, now, 0.035);
  }
}

function noiseBuffer(seconds = 4) {
  const sampleRate = A.ctx.sampleRate;
  const buffer = A.ctx.createBuffer(1, Math.floor(sampleRate * seconds), sampleRate);
  const data = buffer.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    prev = prev * 0.965 + white * 0.035;
    data[i] = prev * 0.9 + white * 0.1;
  }
  return buffer;
}

function createAmbience() {
  const source = A.ctx.createBufferSource();
  source.buffer = noiseBuffer(5.5);
  source.loop = true;

  const high = A.ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 95;

  const low = A.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 1150;
  low.Q.value = 0.35;

  const body = A.ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 330;
  body.Q.value = 0.7;
  body.gain.value = 5;

  const gain = A.ctx.createGain();
  gain.gain.value = 0.0001;

  const lfo = A.ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.075;
  const lfoGain = A.ctx.createGain();
  lfoGain.gain.value = 0.0028;
  lfo.connect(lfoGain).connect(gain.gain);

  source.connect(high).connect(low).connect(body).connect(gain).connect(A.master);
  source.start();
  lfo.start();
  A.ambienceSource = source;
  A.ambience = gain;
  A.ambienceLfo = lfo;
}

async function initAudio() {
  if (A.initialized) {
    if (A.ctx?.state === 'suspended') await A.ctx.resume();
    setEnabled(true);
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  A.ctx = new AudioCtx();
  A.master = A.ctx.createGain();
  A.master.gain.value = 0.9;
  A.master.connect(A.ctx.destination);
  createAmbience();
  A.initialized = true;
  setEnabled(true);
}

function routeWithPan(pan = 0) {
  const panner = A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : A.ctx.createGain();
  if ('pan' in panner) panner.pan.value = clamp(pan, -1, 1);
  panner.connect(A.master);
  return panner;
}

function playRacketImpact(power = 0.65, pan = 0, distant = false) {
  if (!A.initialized || !A.enabled || A.ctx.state !== 'running') return;
  const now = A.ctx.currentTime;
  const p = clamp(power, 0.18, 1);
  const output = routeWithPan(pan);
  const bus = A.ctx.createGain();
  bus.gain.value = distant ? 0.52 : 1;
  bus.connect(output);

  // String-bed snap: very short filtered noise burst.
  const noise = A.ctx.createBufferSource();
  noise.buffer = noiseBuffer(0.075);
  const band = A.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1750 + p * 1250;
  band.Q.value = 0.72;
  const snap = A.ctx.createGain();
  snap.gain.setValueAtTime(0.0001, now);
  snap.gain.exponentialRampToValueAtTime(0.16 + p * 0.22, now + 0.002);
  snap.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  noise.connect(band).connect(snap).connect(bus);
  noise.start(now);
  noise.stop(now + 0.07);

  // Racket/body thump gives the impact its tennis 'pop'.
  const thump = A.ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(175 + p * 45, now);
  thump.frequency.exponentialRampToValueAtTime(92 + p * 18, now + 0.045);
  const thumpGain = A.ctx.createGain();
  thumpGain.gain.setValueAtTime(0.13 + p * 0.13, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
  thump.connect(thumpGain).connect(bus);
  thump.start(now);
  thump.stop(now + 0.075);

  // Tiny high-frequency click from strings/frame.
  const click = A.ctx.createOscillator();
  click.type = 'triangle';
  click.frequency.value = 850 + p * 480;
  const clickGain = A.ctx.createGain();
  clickGain.gain.setValueAtTime(0.035 + p * 0.045, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
  click.connect(clickGain).connect(bus);
  click.start(now);
  click.stop(now + 0.022);
}

function playBounce(intensity = 0.55) {
  if (!A.initialized || !A.enabled || A.ctx.state !== 'running') return;
  const now = A.ctx.currentTime;
  const p = clamp(intensity, 0.2, 1);
  const bus = A.ctx.createGain();
  bus.gain.value = 0.55;
  bus.connect(A.master);

  const noise = A.ctx.createBufferSource();
  noise.buffer = noiseBuffer(0.045);
  const hp = A.ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 700;
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.07 + p * 0.06, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  noise.connect(hp).connect(g).connect(bus);
  noise.start(now);
  noise.stop(now + 0.04);

  const tone = A.ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(145 + p * 35, now);
  tone.frequency.exponentialRampToValueAtTime(95, now + 0.035);
  const tg = A.ctx.createGain();
  tg.gain.setValueAtTime(0.05 + p * 0.04, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
  tone.connect(tg).connect(bus);
  tone.start(now);
  tone.stop(now + 0.05);
}

function cheer() {
  if (!A.initialized || !A.enabled || A.ctx.state !== 'running') return;
  const now = A.ctx.currentTime;
  const src = A.ctx.createBufferSource();
  src.buffer = noiseBuffer(1.2);
  const band = A.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 620;
  band.Q.value = 0.5;
  const gain = A.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.085, now + 0.11);
  gain.gain.exponentialRampToValueAtTime(0.018, now + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  src.connect(band).connect(gain).connect(A.master);
  src.start(now);
  src.stop(now + 1.18);
}

function locateBall(scene) {
  if (A.ball) return;
  scene.traverse((object) => {
    if (A.ball || !object.isMesh || object.geometry?.type !== 'SphereGeometry') return;
    const r = object.geometry.parameters?.radius;
    if (r > 0.06 && r < 0.075) A.ball = object;
  });
}

const nativeSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function audioSceneAdd(...objects) {
  const result = nativeSceneAdd.apply(this, objects);
  locateBall(this);
  return result;
};

function currentPower() {
  const raw = document.querySelector('#powerTelemetryValue')?.textContent || '65';
  return clamp((parseFloat(raw) || 65) / 100, 0.18, 1);
}

function observeShots() {
  const shot = document.querySelector('#shotType');
  if (!shot) return;
  const react = () => {
    const value = shot.textContent.trim();
    if (!value || value === A.lastShot) return;
    A.lastShot = value;
    const lower = value.toLowerCase();
    if (lower.includes('forehand') || lower.includes('backhand')) {
      playRacketImpact(currentPower(), 0.18, false);
    } else if (lower.includes('ai return') || lower.includes('ai feed')) {
      playRacketImpact(0.58, -0.16, true);
    }
  };
  new MutationObserver(react).observe(shot, { childList: true, subtree: true, characterData: true });
  react();
}

function updateAudioFrame() {
  requestAnimationFrame(updateAudioFrame);
  if (!A.initialized) return;

  const speedText = document.querySelector('#ballSpeed')?.textContent || '0';
  const speed = Math.max(0, parseFloat(speedText) || 0);
  const locked = document.pointerLockElement?.id === 'game';
  const rallying = locked && speed > 4;
  const target = !locked ? 0.004 : rallying ? 0.0015 : 0.022;

  if (A.ambience) {
    A.crowdTarget += (target - A.crowdTarget) * 0.08;
    const now = A.ctx.currentTime;
    A.ambience.gain.cancelScheduledValues(now);
    A.ambience.gain.setTargetAtTime(A.crowdTarget, now, 0.09);
  }

  if (locked && A.lastSpeed > 18 && speed <= 1.5) cheer();
  A.lastSpeed = speed;

  if (A.ball) {
    const y = A.ball.position.y;
    if (A.lastBallY != null) {
      const dy = y - A.lastBallY;
      const nowMs = performance.now();
      if (A.lastBallDy < -0.002 && dy > 0.002 && y < 0.16 && nowMs - A.lastBounceAt > 100) {
        A.lastBounceAt = nowMs;
        playBounce(clamp(Math.abs(A.lastBallDy) * 60, 0.25, 1));
      }
      A.lastBallDy = dy;
    }
    A.lastBallY = y;
  }
}

ensureUi();
observeShots();
requestAnimationFrame(updateAudioFrame);

const startButton = document.querySelector('#startButton');
startButton?.addEventListener('click', () => initAudio(), { capture: true });

document.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyM') return;
  if (!A.initialized) initAudio();
  else setEnabled(!A.enabled);
});
