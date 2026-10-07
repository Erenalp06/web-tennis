import * as THREE from 'three';

const R = {
  playerRacket: null,
  aiRacket: null,
  athlete: null,
  net: null,
  powerHeld: false,
  powerSamples: [],
  power: 0,
  holdUntil: 0,
  lastAiYaw: Math.PI - 0.25,
};

const clamp = THREE.MathUtils.clamp;

function ensurePowerHud() {
  const telemetry = document.querySelector('.telemetry');
  if (telemetry && !document.querySelector('#powerTelemetry')) {
    const tile = document.createElement('div');
    tile.id = 'powerTelemetry';
    tile.innerHTML = '<span>Güç</span><b id="powerTelemetryValue">0%</b>';
    telemetry.appendChild(tile);
  }

  if (!document.querySelector('#powerMeterFix')) {
    const meter = document.createElement('div');
    meter.id = 'powerMeterFix';
    meter.innerHTML = `
      <div class="v06p-head"><span>SWING POWER</span><b id="powerMeterFixValue">0%</b></div>
      <div class="v06p-track"><i id="powerMeterFixFill"></i></div>
      <div class="v06p-foot"><span>CONTROL</span><span>DRIVE</span><span>MAX</span></div>
    `;
    document.querySelector('#app')?.appendChild(meter);
  }

  if (!document.querySelector('#v06RuntimeStyles')) {
    const style = document.createElement('style');
    style.id = 'v06RuntimeStyles';
    style.textContent = `
      #powerMeterFix {
        position:fixed; left:50%; bottom:118px; z-index:30; width:260px;
        transform:translate(-50%,10px); opacity:0; pointer-events:none;
        padding:10px 12px 9px; border-radius:13px;
        border:1px solid rgba(255,255,255,.18);
        background:rgba(3,12,27,.82); backdrop-filter:blur(12px);
        box-shadow:0 12px 34px rgba(0,0,0,.28);
        transition:opacity .1s ease, transform .1s ease;
      }
      #powerMeterFix.visible { opacity:1; transform:translate(-50%,0); }
      .v06p-head {display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
      .v06p-head span {font:800 9px/1 system-ui,sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.62)}
      .v06p-head b {font:800 13px/1 system-ui,sans-serif;color:#fff}
      .v06p-track {height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
      .v06p-track i {display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#6fd8ff,#d9ff48 58%,#ffb84a 82%,#ff665c);box-shadow:0 0 18px rgba(217,255,72,.26);transition:width .035s linear}
      .v06p-foot {display:flex;justify-content:space-between;margin-top:6px;font:700 7px/1 system-ui,sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.32)}
      #powerTelemetry b { color:#d9ff48; }
      @media(max-width:700px){#powerMeterFix{bottom:165px;width:220px}}
    `;
    document.head.appendChild(style);
  }
}

function renderPower() {
  ensurePowerHud();
  const pct = Math.round(clamp(R.power, 0, 1) * 100);
  const tele = document.querySelector('#powerTelemetryValue');
  const value = document.querySelector('#powerMeterFixValue');
  const fill = document.querySelector('#powerMeterFixFill');
  const meter = document.querySelector('#powerMeterFix');
  if (tele) tele.textContent = `${pct}%`;
  if (value) value.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;
  if (meter) meter.classList.toggle('visible', R.powerHeld || performance.now() < R.holdUntil);
}

function bindPower() {
  if (document.documentElement.dataset.v06RuntimePower === '1') return;
  document.documentElement.dataset.v06RuntimePower = '1';

  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || document.pointerLockElement?.id !== 'game') return;
    R.powerHeld = true;
    R.powerSamples = [];
    R.power = 0;
    renderPower();
  }, true);

  document.addEventListener('mousemove', (event) => {
    if (!R.powerHeld || document.pointerLockElement?.id !== 'game') return;
    const now = performance.now();
    const distance = Math.hypot(event.movementX, event.movementY);
    R.powerSamples.push({ distance, at: now });
    while (R.powerSamples.length && now - R.powerSamples[0].at > 180) R.powerSamples.shift();
    if (R.powerSamples.length < 2) return;

    const elapsed = Math.max(20, now - R.powerSamples[0].at) / 1000;
    const travelled = R.powerSamples.reduce((sum, sample) => sum + sample.distance, 0);
    const pixelsPerSecond = travelled / elapsed;
    const instant = clamp((pixelsPerSecond - 130) / 1350, 0, 1);
    R.power = Math.max(instant, R.power * 0.82);
    renderPower();
  }, true);

  document.addEventListener('mouseup', (event) => {
    if (event.button !== 0 || !R.powerHeld) return;
    R.powerHeld = false;
    R.holdUntil = performance.now() + 950;
    renderPower();
  }, true);
}

function locate(scene) {
  R.athlete = scene.getObjectByName('polished-opponent') || R.athlete;
  R.net = scene.getObjectByName('polished-tennis-net') || R.net;

  let playerCandidate = null;
  let aiCandidate = null;
  scene.traverse((object) => {
    if (!object.isGroup || !object.userData?.rx || !object.userData?.ry) return;
    if (object.position.z > 5) playerCandidate = object;
    if (object.position.z < -5) aiCandidate = object;
  });
  if (playerCandidate) R.playerRacket = playerCandidate;
  if (aiCandidate) R.aiRacket = aiCandidate;
}

function strengthenNet() {
  if (!R.net || R.net.userData.runtimeContrast) return;
  R.net.userData.runtimeContrast = true;

  R.net.traverse((object) => {
    if (object.isLineSegments) {
      object.material.color.set(0x102033);
      object.material.opacity = 1;
      object.material.transparent = false;
      object.material.depthWrite = true;
    }
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(11.75, 0.92),
    new THREE.MeshBasicMaterial({
      color: 0x06101c,
      transparent: true,
      opacity: 0.105,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shadow.position.set(0, 0.52, 0.018);
  shadow.renderOrder = -1;
  R.net.add(shadow);

  const darkCord = new THREE.Mesh(
    new THREE.BoxGeometry(11.7, 0.018, 0.026),
    new THREE.MeshBasicMaterial({ color: 0x17263a }),
  );
  darkCord.position.set(0, 0.08, 0.028);
  R.net.add(darkCord);
}

function animateOpponent() {
  if (!R.athlete || !R.aiRacket) return;

  const baseYaw = Math.PI - 0.25;
  let swingYaw = R.aiRacket.rotation.y - baseYaw;
  while (swingYaw > Math.PI) swingYaw -= Math.PI * 2;
  while (swingYaw < -Math.PI) swingYaw += Math.PI * 2;

  const centerX = R.aiRacket.position.x - 0.32;
  R.athlete.position.x = THREE.MathUtils.lerp(R.athlete.position.x, centerX, 0.7);
  R.athlete.position.z = -11;

  const parts = R.athlete.userData.parts || {};
  const swingAmount = clamp(swingYaw / 0.6, -1, 1);
  const deltaYaw = swingYaw - (R.lastAiYaw - baseYaw);
  R.lastAiYaw = R.aiRacket.rotation.y;

  // Deliberately visible body mechanics: hips counter-rotate while shoulders
  // follow the racket so the CPU no longer looks like a static mannequin.
  R.athlete.rotation.y = Math.PI + swingAmount * 0.12;
  R.athlete.rotation.z = clamp(-deltaYaw * 0.9, -0.085, 0.085);
  R.athlete.position.y = Math.abs(swingAmount) * 0.015;

  if (parts.hips) {
    parts.hips.rotation.y = -swingAmount * 0.2;
    parts.hips.rotation.z = swingAmount * 0.025;
  }
  if (parts.torso) {
    parts.torso.rotation.y = swingAmount * 0.62;
    parts.torso.rotation.x = -Math.abs(swingAmount) * 0.08;
    parts.torso.rotation.z = -swingAmount * 0.06;
  }
  if (parts.head) {
    parts.head.rotation.y = -swingAmount * 0.18;
  }
  if (parts.racketForearm) {
    parts.racketForearm.rotation.x = swingAmount * 0.42;
    parts.racketForearm.rotation.z = -swingAmount * 0.32;
  }
  if (parts.leftShoe && parts.rightShoe) {
    parts.leftShoe.rotation.y = -0.08 - swingAmount * 0.08;
    parts.rightShoe.rotation.y = 0.08 + swingAmount * 0.08;
  }
}

function tick(scene) {
  ensurePowerHud();
  bindPower();
  locate(scene);
  strengthenNet();
  animateOpponent();
  renderPower();
}

ensurePowerHud();
bindPower();

// This module is imported after main-v3 has created the renderer. Replacing
// the prototype here affects subsequent animation frames on the existing
// renderer instance and gives us direct access to the final scene state.
const previousRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function runtimeSafeV06Render(scene, camera) {
  tick(scene);
  return previousRender.call(this, scene, camera);
};
