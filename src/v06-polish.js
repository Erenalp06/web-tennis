import * as THREE from 'three';

const S = {
  scene: null,
  camera: null,
  playerRacket: null,
  aiRacket: null,
  ball: null,
  athlete: null,
  net: null,
  arm: null,
  hand: null,
  sleeve: null,
  ballGlow: null,
  statsTexture: null,
  statsCanvas: null,
  statsKey: '',
  powerHeld: false,
  powerSamples: [],
  powerValue: 0,
  powerHoldUntil: 0,
  prepared: false,
  opponentBase: null,
};

const clamp = THREE.MathUtils.clamp;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

// Capture gameplay objects before the V0.5 visual layer wraps Scene.add.
const previousSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function v06SceneAdd(...objects) {
  if (!S.scene) S.scene = this;

  for (const object of objects) {
    if (object?.isGroup && object.userData?.rx && object.userData?.ry) {
      if (object.position.z > 5) S.playerRacket = object;
      if (object.position.z < -5) S.aiRacket = object;
    }

    if (object?.isMesh && object.geometry?.type === 'SphereGeometry') {
      const radius = object.geometry.parameters?.radius;
      if (radius > 0.06 && radius < 0.075) S.ball = object;
    }
  }

  return previousSceneAdd.apply(this, objects);
};

// V0.5 wraps renderer after this module. Therefore this callback runs after
// V0.5 updateVisuals() but before the actual frame is rendered, letting V0.6
// correct/supplement the final visual state without touching gameplay physics.
const previousRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function v06Render(scene, camera) {
  S.scene = scene;
  S.camera = camera;
  ensureV06(scene);
  updateV06(scene, camera, this);
  return previousRender.call(this, scene, camera);
};

function injectHud() {
  if (document.querySelector('#powerMeter')) return;

  const meter = document.createElement('div');
  meter.id = 'powerMeter';
  meter.className = 'power-meter';
  meter.innerHTML = `
    <div class="power-head"><span>SWING POWER</span><b id="powerValue">0%</b></div>
    <div class="power-track"><i id="powerFill"></i></div>
    <div class="power-foot"><span>CONTROL</span><span>DRIVE</span><span>MAX</span></div>
  `;
  document.querySelector('#app')?.appendChild(meter);

  const style = document.createElement('style');
  style.textContent = `
    .power-meter {
      --power: 0%;
      position: fixed;
      left: 50%;
      bottom: 126px;
      width: 230px;
      transform: translate(-50%, 8px);
      padding: 9px 11px 8px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(4,13,29,.72);
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 28px rgba(0,0,0,.24);
      opacity: 0;
      pointer-events: none;
      transition: opacity .12s ease, transform .12s ease;
      z-index: 7;
    }
    .power-meter.visible { opacity: 1; transform: translate(-50%, 0); }
    .power-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
    .power-head span { font-size:8px; font-weight:800; letter-spacing:.17em; opacity:.58; }
    .power-head b { font-size:11px; letter-spacing:.05em; }
    .power-track { height:7px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.09); }
    .power-track i {
      display:block; width:var(--power); height:100%; border-radius:inherit;
      background:linear-gradient(90deg,#72d6ff 0%,#d8ff47 58%,#ffbf4c 82%,#ff6b5f 100%);
      box-shadow:0 0 16px rgba(216,255,71,.28);
      transition:width .045s linear;
    }
    .power-foot { display:flex; justify-content:space-between; margin-top:5px; font-size:7px; letter-spacing:.1em; opacity:.34; }
    .shot-flash {
      position:fixed; left:50%; top:44%; width:42px; height:42px; border-radius:50%;
      border:2px solid rgba(219,255,80,.9); transform:translate(-50%,-50%) scale(.5);
      opacity:0; pointer-events:none; z-index:6;
    }
    .shot-flash.pulse { animation:v06ContactFlash .24s ease-out; }
    @keyframes v06ContactFlash { 0%{opacity:.95;transform:translate(-50%,-50%) scale(.45)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.6)} }
    @media (max-width:700px) { .power-meter { bottom:170px; width:200px; } }
  `;
  document.head.appendChild(style);

  const flash = document.createElement('div');
  flash.id = 'shotFlash';
  flash.className = 'shot-flash';
  document.querySelector('#app')?.appendChild(flash);
}

function bindPowerInput() {
  if (document.documentElement.dataset.v06PowerBound) return;
  document.documentElement.dataset.v06PowerBound = '1';

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || document.pointerLockElement?.id !== 'game') return;
    S.powerHeld = true;
    S.powerSamples.length = 0;
    S.powerValue = 0;
    document.querySelector('#powerMeter')?.classList.add('visible');
  });

  document.addEventListener('mousemove', (e) => {
    if (!S.powerHeld || document.pointerLockElement?.id !== 'game') return;
    const now = performance.now();
    const d = Math.hypot(e.movementX, e.movementY);
    S.powerSamples.push({ d, at: now });
    while (S.powerSamples.length && now - S.powerSamples[0].at > 170) S.powerSamples.shift();

    if (S.powerSamples.length > 1) {
      const elapsed = Math.max(16, now - S.powerSamples[0].at) / 1000;
      const distance = S.powerSamples.reduce((sum, s) => sum + s.d, 0);
      const speedPx = distance / elapsed;
      const normalized = clamp((speedPx - 170) / 1280, 0, 1);
      S.powerValue = Math.max(S.powerValue * 0.88, normalized);
      renderPower();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || !S.powerHeld) return;
    S.powerHeld = false;
    S.powerHoldUntil = performance.now() + 720;
    renderPower();
  });
}

function renderPower() {
  const meter = document.querySelector('#powerMeter');
  const fill = document.querySelector('#powerFill');
  const value = document.querySelector('#powerValue');
  if (!meter || !fill || !value) return;
  const pct = Math.round(S.powerValue * 100);
  meter.style.setProperty('--power', `${pct}%`);
  value.textContent = `${pct}%`;
  meter.dataset.tier = pct > 85 ? 'max' : pct > 55 ? 'drive' : 'control';
  if (S.powerHeld || performance.now() < S.powerHoldUntil) meter.classList.add('visible');
}

function createCylinderBetween(parent, a, b, radius, material) {
  const geometry = new THREE.CylinderGeometry(radius * 0.9, radius, 1, 12);
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  parent.add(m);
  updateCylinderBetween(m, a, b);
  return m;
}

function updateCylinderBetween(mesh, a, b) {
  tmpA.subVectors(b, a);
  const length = tmpA.length();
  if (length < 0.001) return;
  tmpB.addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(tmpB);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, tmpA.normalize());
}

function createFirstPersonArm(scene) {
  const root = new THREE.Group();
  root.name = 'v06-first-person-arm';
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98c67, roughness: 0.68 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x153b70, roughness: 0.58 });

  const forearm = createCylinderBetween(root, new THREE.Vector3(), new THREE.Vector3(0, .5, 0), 0.055, skin);
  const sleeve = createCylinderBetween(root, new THREE.Vector3(), new THREE.Vector3(0, .3, 0), 0.073, sleeveMat);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), skin);
  hand.scale.set(0.82, 1.12, 0.72);
  hand.castShadow = true;
  root.add(hand);
  root.userData = { forearm, sleeve, hand };
  scene.add(root);
  return root;
}

function createBallGlow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(226,255,70,.78)');
  g.addColorStop(.24, 'rgba(226,255,70,.32)');
  g.addColorStop(1, 'rgba(226,255,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.scale.set(0.34, 0.34, 0.34);
  sprite.renderOrder = 4;
  scene.add(sprite);
  return sprite;
}

function createStatsRibbon(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 110;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  S.statsCanvas = canvas;
  S.statsTexture = texture;

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 0.78),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
  );
  panel.position.set(0, 3.32, -19.96);
  scene.add(panel);
  updateStatsRibbon(true);
}

function updateStatsRibbon(force = false) {
  if (!S.statsCanvas || !S.statsTexture) return;
  const shot = document.querySelector('#shotType')?.textContent || 'READY';
  const racket = document.querySelector('#racketSpeed')?.textContent || '0.0 m/s';
  const spin = document.querySelector('#spinValue')?.textContent || '0 rpm';
  const key = `${shot}|${racket}|${spin}`;
  if (!force && key === S.statsKey) return;
  S.statsKey = key;

  const ctx = S.statsCanvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 110);
  ctx.fillStyle = 'rgba(3,11,25,.94)';
  ctx.fillRect(0, 0, 1024, 110);
  ctx.fillStyle = '#3187d8';
  ctx.fillRect(0, 0, 1024, 5);
  ctx.textBaseline = 'middle';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillStyle = '#8db7df';
  ctx.textAlign = 'left';
  ctx.fillText('LAST SHOT', 40, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 31px system-ui, sans-serif';
  ctx.fillText(String(shot).toUpperCase(), 190, 56);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d8ff47';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(`${racket}  ·  ${spin}`, 984, 56);
  S.statsTexture.needsUpdate = true;
}

function createArenaExtras(scene) {
  // Emissive LED ribbons give the stadium bowl a more continuous night-session feel.
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b62a7, emissive: 0x0b62a7, emissiveIntensity: 1.15, roughness: 0.45 });
  for (const side of [-1, 1]) {
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 34), mat);
    ribbon.position.set(side * 11.72, 3.43, 0);
    scene.add(ribbon);
  }
  for (const end of [-1, 1]) {
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.16, 0.045), mat);
    ribbon.position.set(0, 3.43, end * 19.35);
    scene.add(ribbon);
  }

  // Subtle aisle lights near the court walls.
  const aisleMat = new THREE.MeshBasicMaterial({ color: 0x74b9ff, toneMapped: false });
  for (const side of [-1, 1]) {
    for (let z = -12; z <= 12; z += 3) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.34), aisleMat);
      lamp.position.set(side * 7.62, 0.38, z);
      scene.add(lamp);
    }
  }
}

function tuneScene(scene, renderer) {
  if (scene.userData.v06Tuned) return;
  scene.userData.v06Tuned = true;

  scene.traverse((o) => {
    if (o.isSpotLight && o.intensity > 50) o.intensity *= 0.72;
    if (o.isPointLight && o.intensity > 12) o.intensity *= 0.68;

    if (o.isMesh && o.geometry?.type === 'BoxGeometry') {
      const p = o.geometry.parameters || {};
      if (p.width > 10.7 && p.width < 11.3 && p.depth > 23 && p.depth < 25 && p.height < 0.08) {
        if (o.material?.color) o.material.color.set(0xc8e1ed);
        if (o.material) o.material.roughness = 0.84;
      }
    }
  });

  renderer.toneMappingExposure = 0.98;
  createArenaExtras(scene);
  createStatsRibbon(scene);
}

function tuneNet(scene) {
  const net = scene.getObjectByName('polished-tennis-net');
  if (!net || net.userData.v06Tuned) return;
  net.userData.v06Tuned = true;
  S.net = net;

  net.traverse((o) => {
    if (o.isLineSegments) {
      o.material.color.set(0x14243a);
      o.material.opacity = 0.88;
      o.material.transparent = true;
      o.material.depthWrite = false;
    }
    if (o.isMesh && o.geometry?.type === 'BoxGeometry') {
      const p = o.geometry.parameters || {};
      if (p.height < 0.07 && p.width > 0.2) {
        o.material.color.set(0xffffff);
        o.material.emissive = new THREE.Color(0x8795a2);
        o.material.emissiveIntensity = 0.16;
      }
    }
  });

  // A barely visible backing plane increases mesh contrast against the bright court.
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(11.7, 0.93),
    new THREE.MeshBasicMaterial({ color: 0x081422, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false }),
  );
  veil.position.set(0, 0.515, 0.008);
  net.add(veil);
}

function locateObjects(scene) {
  const athlete = scene.getObjectByName('polished-opponent');
  if (athlete) S.athlete = athlete;

  // Recover rackets robustly even if the monkey-patched add order changes.
  scene.traverse((o) => {
    if (o.isGroup && o.userData?.rx && o.userData?.ry) {
      if (o.position.z > 5) S.playerRacket = o;
      else if (o.position.z < -5) S.aiRacket = o;
    }
    if (!S.ball && o.isMesh && o.geometry?.type === 'SphereGeometry') {
      const r = o.geometry.parameters?.radius;
      if (r > 0.06 && r < 0.075) S.ball = o;
    }
  });
}

function ensureV06(scene) {
  injectHud();
  bindPowerInput();
  locateObjects(scene);
  tuneNet(scene);

  if (!S.arm && S.playerRacket) S.arm = createFirstPersonArm(scene);
  if (!S.ballGlow && S.ball) S.ballGlow = createBallGlow(scene);
}

function updateOpponent() {
  if (!S.athlete || !S.aiRacket) return;

  // The AI racket is the reliable live anchor: updateAI() always moves it.
  // Its x is player center + 0.32, so drive the body from that instead of the
  // hidden V0.4 placeholder that could be misidentified by the V0.5 layer.
  const targetX = S.aiRacket.position.x - 0.32;
  const previousX = S.athlete.position.x;
  S.athlete.position.x = THREE.MathUtils.lerp(previousX, targetX, 0.82);
  S.athlete.position.z = -11;

  const velocityHint = targetX - previousX;
  S.athlete.rotation.z = clamp(-velocityHint * 0.42, -0.12, 0.12);

  const parts = S.athlete.userData.parts;
  if (!parts) return;

  if (!S.opponentBase) {
    S.opponentBase = {
      torsoQ: parts.torso.quaternion.clone(),
      forearmQ: parts.racketForearm?.quaternion.clone(),
      headQ: parts.head.quaternion.clone(),
    };
  }

  const swingDelta = THREE.MathUtils.euclideanModulo(S.aiRacket.rotation.y - (Math.PI - 0.25) + Math.PI, Math.PI * 2) - Math.PI;
  parts.torso.rotation.y = clamp(-swingDelta * 0.22, -0.2, 0.2);
  parts.torso.rotation.z += clamp(-velocityHint * 0.12, -0.035, 0.035);

  if (parts.racketForearm && S.opponentBase.forearmQ) {
    tmpQ.setFromEuler(new THREE.Euler(clamp(swingDelta * 0.24, -0.38, 0.38), 0, clamp(-swingDelta * 0.18, -0.28, 0.28)));
    parts.racketForearm.quaternion.copy(S.opponentBase.forearmQ).multiply(tmpQ);
  }
}

function updateFirstPersonArm(camera) {
  if (!S.arm || !S.playerRacket || !camera) return;
  const { forearm, sleeve, hand } = S.arm.userData;

  // Hand follows the bottom of the racket grip in world space.
  tmpA.set(0, -0.54, 0).applyQuaternion(S.playerRacket.quaternion).add(S.playerRacket.position);
  hand.position.copy(tmpA);
  hand.quaternion.copy(S.playerRacket.quaternion);

  // Elbow/upper sleeve live just below-right of the camera, giving a subtle
  // first-person arm without blocking the ball or court.
  tmpB.set(0.31, -0.34, -0.24).applyQuaternion(camera.quaternion).add(camera.position);
  tmpC.set(0.42, -0.48, -0.05).applyQuaternion(camera.quaternion).add(camera.position);
  updateCylinderBetween(forearm, tmpB, tmpA);
  updateCylinderBetween(sleeve, tmpC, tmpB);
}

function updateBallVisual() {
  if (!S.ball) return;
  if (S.ball.material) {
    S.ball.material.emissive = new THREE.Color(0x627900);
    S.ball.material.emissiveIntensity = 0.24;
    S.ball.material.roughness = 0.62;
  }
  if (S.ballGlow) {
    S.ballGlow.position.copy(S.ball.position);
    const cameraDistance = S.camera ? S.camera.position.distanceTo(S.ball.position) : 10;
    const scale = clamp(0.26 + cameraDistance * 0.008, 0.27, 0.42);
    S.ballGlow.scale.setScalar(scale);
    S.ballGlow.material.opacity = S.ball.visible ? 0.72 : 0;
  }
}

function updatePowerVisibility() {
  const meter = document.querySelector('#powerMeter');
  if (!meter) return;
  if (S.powerHeld || performance.now() < S.powerHoldUntil) {
    meter.classList.add('visible');
  } else {
    meter.classList.remove('visible');
    S.powerValue *= 0.9;
  }
}

function updateContactFlash() {
  const message = document.querySelector('#message');
  const flash = document.querySelector('#shotFlash');
  if (!message || !flash) return;
  const text = message.textContent || '';
  const hit = /sweet spot|temas/i.test(text);
  if (hit && message.classList.contains('visible') && flash.dataset.lastText !== text) {
    flash.dataset.lastText = text;
    flash.classList.remove('pulse');
    void flash.offsetWidth;
    flash.classList.add('pulse');
  }
  if (!message.classList.contains('visible')) flash.dataset.lastText = '';
}

function updateV06(scene, camera, renderer) {
  locateObjects(scene);
  tuneNet(scene);
  tuneScene(scene, renderer);

  // V0.5 sets exposure once in its outer render wrapper; enforce the V0.6
  // balanced value here immediately before the actual frame render.
  renderer.toneMappingExposure = 0.98;

  updateOpponent();
  updateFirstPersonArm(camera);
  updateBallVisual();
  updateStatsRibbon();
  updatePowerVisibility();
  updateContactFlash();
}
