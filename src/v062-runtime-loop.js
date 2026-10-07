import * as THREE from 'three';

const S = {
  scene: null,
  originalOpponent: null,
  athlete: null,
  playerRacket: null,
  aiRacket: null,
  ball: null,
  lastOpponentX: 0,
  lastAiYaw: Math.PI - 0.25,
  power: 0,
  powerShowUntil: 0,
  powerPlane: null,
  powerCanvas: null,
  powerTexture: null,
  localArm: null,
  ballGlow: null,
  scoreboardKey: '',
  statsKey: '',
};

const clamp = THREE.MathUtils.clamp;

// Kill the obsolete center-screen power meters unconditionally. The persistent
// telemetry tile remains; shot power is rendered inside the racket head.
const style = document.createElement('style');
style.id = 'v062-runtime-style';
style.textContent = '#powerMeterFix,#powerMeter{display:none!important}';
document.head.appendChild(style);

// Capture real gameplay objects while main-v3 creates them. This hook is
// installed before main-v3 is imported, so there is no guessing after the fact.
const nativeSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function v062SceneAdd(...objects) {
  S.scene ||= this;

  for (const object of objects) {
    if (!object) continue;

    if (object.isGroup && object.userData?.rx && object.userData?.ry) {
      if (object.position.z > 5) S.playerRacket = object;
      if (object.position.z < -5) S.aiRacket = object;
    }

    if (
      !S.originalOpponent &&
      object.isGroup &&
      !object.userData?.rx &&
      object.name !== 'polished-opponent' &&
      object.children.length >= 5 &&
      object.position.z < -10.8 &&
      object.position.z > -11.2
    ) {
      S.originalOpponent = object;
    }

    if (object.isMesh && object.geometry?.type === 'SphereGeometry') {
      const radius = object.geometry.parameters?.radius;
      if (radius > 0.06 && radius < 0.075) S.ball = object;
    }
  }

  return nativeSceneAdd.apply(this, objects);
};

function locateFallbacks() {
  if (!S.scene) return;
  S.athlete = S.scene.getObjectByName('polished-opponent') || S.athlete;

  S.scene.traverse((object) => {
    if (!S.playerRacket && object.isGroup && object.userData?.rx && object.position.z > 5) S.playerRacket = object;
    if (!S.aiRacket && object.isGroup && object.userData?.rx && object.position.z < -5) S.aiRacket = object;
    if (!S.ball && object.isMesh && object.geometry?.type === 'SphereGeometry') {
      const r = object.geometry.parameters?.radius;
      if (r > 0.06 && r < 0.075) S.ball = object;
    }
  });
}

function animateOpponent() {
  if (!S.athlete || !S.originalOpponent) return;

  const targetX = S.originalOpponent.position.x;
  const dx = targetX - S.lastOpponentX;
  S.lastOpponentX = targetX;

  let swing = 0;
  let yawDelta = 0;
  if (S.aiRacket) {
    const baseYaw = Math.PI - 0.25;
    let swingYaw = S.aiRacket.rotation.y - baseYaw;
    while (swingYaw > Math.PI) swingYaw -= Math.PI * 2;
    while (swingYaw < -Math.PI) swingYaw += Math.PI * 2;
    swing = clamp(swingYaw / 0.58, -1, 1);
    yawDelta = S.aiRacket.rotation.y - S.lastAiYaw;
    S.lastAiYaw = S.aiRacket.rotation.y;
  }

  // World transform follows the real gameplay opponent, not the visual proxy.
  S.athlete.position.x = targetX;
  S.athlete.position.z = -11;
  S.athlete.position.y = Math.min(0.035, Math.abs(dx) * 0.55 + Math.abs(swing) * 0.012);
  S.athlete.rotation.y = Math.PI + swing * 0.16;
  S.athlete.rotation.z = clamp(-dx * 0.5 - yawDelta * 0.3, -0.12, 0.12);

  const parts = S.athlete.userData.parts || {};
  if (parts.hips) {
    parts.hips.rotation.y = -swing * 0.26;
    parts.hips.rotation.z = clamp(-dx * 0.34, -0.09, 0.09);
  }
  if (parts.torso) {
    parts.torso.rotation.y = swing * 0.72;
    parts.torso.rotation.x = -Math.abs(swing) * 0.1;
    parts.torso.rotation.z = clamp(-dx * 0.58 - swing * 0.06, -0.15, 0.15);
  }
  if (parts.head) parts.head.rotation.y = -swing * 0.22;
  if (parts.racketForearm) {
    parts.racketForearm.rotation.x = swing * 0.48;
    parts.racketForearm.rotation.z = -swing * 0.36;
  }
  if (parts.leftShoe && parts.rightShoe) {
    const step = clamp(dx * 2.4, -0.22, 0.22);
    parts.leftShoe.rotation.y = -0.08 - step;
    parts.rightShoe.rotation.y = 0.08 + step;
  }
}

function drawPower(value) {
  if (!S.powerCanvas || !S.powerTexture) return;
  const ctx = S.powerCanvas.getContext('2d');
  const size = 512;
  const center = 256;
  const pct = Math.round(clamp(value, 0, 1) * 100);
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * clamp(value, 0, 1);

  ctx.clearRect(0, 0, size, size);
  const glass = ctx.createRadialGradient(center, center, 20, center, center, 220);
  glass.addColorStop(0, 'rgba(2,12,27,.48)');
  glass.addColorStop(.62, 'rgba(2,12,27,.23)');
  glass.addColorStop(1, 'rgba(2,12,27,0)');
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = 'round';
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(center, center, 174, 0, Math.PI * 2);
  ctx.stroke();

  const ring = ctx.createLinearGradient(80, 80, 430, 430);
  ring.addColorStop(0, '#72d8ff');
  ring.addColorStop(.55, '#d9ff48');
  ring.addColorStop(.82, '#ffbc4a');
  ring.addColorStop(1, '#ff655c');
  ctx.strokeStyle = ring;
  ctx.shadowColor = pct >= 85 ? 'rgba(255,101,92,.9)' : 'rgba(217,255,72,.8)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(center, center, 174, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = '800 110px system-ui, sans-serif';
  ctx.fillText(`${pct}%`, center, center - 8);
  ctx.fillStyle = 'rgba(255,255,255,.58)';
  ctx.font = '800 27px system-ui, sans-serif';
  ctx.fillText('POWER', center, center + 82);
  S.powerTexture.needsUpdate = true;
}

function ensureRacketPower() {
  if (!S.playerRacket || S.powerPlane) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.235, 0.305),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  plane.name = 'v062-racket-power';
  plane.position.set(0, 0, 0.02);
  plane.renderOrder = 100;
  S.playerRacket.add(plane);
  S.powerCanvas = canvas;
  S.powerTexture = texture;
  S.powerPlane = plane;
  drawPower(0);
}

function updateRacketPower() {
  if (!S.powerPlane) return;
  const remaining = S.powerShowUntil - performance.now();
  if (remaining <= 0) {
    S.powerPlane.visible = false;
    S.powerPlane.material.opacity = 0;
    return;
  }
  S.powerPlane.visible = true;
  const fadeIn = clamp((1150 - remaining) / 110, 0, 1);
  const fadeOut = clamp(remaining / 260, 0, 1);
  S.powerPlane.material.opacity = Math.min(fadeIn, fadeOut) * 0.96;
  const pulse = 1 + Math.sin((1150 - remaining) * 0.021) * 0.018;
  S.powerPlane.scale.set(pulse, pulse, 1);
}

// Read the already-computed gameplay HUD power after the mouseup listeners run.
document.addEventListener('mouseup', (event) => {
  if (event.button !== 0) return;
  setTimeout(() => {
    const raw = document.querySelector('#powerTelemetryValue')?.textContent || '0';
    const pct = clamp(parseFloat(raw) || 0, 0, 100);
    if (pct <= 0) return;
    S.power = pct / 100;
    S.powerShowUntil = performance.now() + 1150;
    drawPower(S.power);
  }, 0);
}, false);

function ensureLocalArm() {
  if (!S.playerRacket || S.localArm) return;
  const root = new THREE.Group();
  root.name = 'v062-local-arm';
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98c67, roughness: 0.7 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x173d73, roughness: 0.6 });

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), skin);
  hand.position.set(0, -0.50, 0.015);
  hand.scale.set(0.8, 1.15, 0.72);
  root.add(hand);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.48, 12), skin);
  forearm.position.set(0.075, -0.72, 0.035);
  forearm.rotation.z = -0.27;
  root.add(forearm);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.078, 0.25, 12), sleeve);
  cuff.position.set(0.14, -0.99, 0.05);
  cuff.rotation.z = -0.27;
  root.add(cuff);

  S.playerRacket.add(root);
  S.localArm = root;
}

function ensureBallGlow() {
  if (!S.ball || S.ballGlow) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(226,255,70,.78)');
  g.addColorStop(.24, 'rgba(226,255,70,.30)');
  g.addColorStop(1, 'rgba(226,255,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.62,
  }));
  sprite.scale.setScalar(0.32);
  sprite.renderOrder = 90;
  S.ball.add(sprite);
  S.ballGlow = sprite;
}

function fixNet() {
  const net = S.scene?.getObjectByName('polished-tennis-net');
  if (!net) return;
  net.traverse((object) => {
    if (object.isLineSegments) {
      object.material.color.set(0x102238);
      object.material.opacity = 0.92;
      object.material.transparent = true;
      object.material.depthWrite = true;
    }
  });
  if (!net.getObjectByName('v062-net-veil')) {
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(11.72, 0.94),
      new THREE.MeshBasicMaterial({ color: 0x07131f, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    );
    veil.name = 'v062-net-veil';
    veil.position.set(0, 0.515, 0.01);
    net.add(veil);
  }
}

function drawMainBoard(board) {
  const canvas = board?.material?.map?.image;
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const rally = document.querySelector('#rallyCount')?.textContent || '0';
  const ballSpeed = document.querySelector('#ballSpeed')?.textContent || '0 km/h';
  const shot = document.querySelector('#shotType')?.textContent || 'READY';
  const key = `${rally}|${ballSpeed}|${shot}`;
  if (key === S.scoreboardKey) return;
  S.scoreboardKey = key;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#030b18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#2d87db';
  ctx.lineWidth = 10;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.fillStyle = '#74b9ff';
  ctx.font = '700 32px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WEB TENNIS OPEN', 52, 62);
  ctx.fillStyle = '#9fb1c5';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('NIGHT SESSION', canvas.width - 52, 62);
  ctx.strokeStyle = '#173556';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(52, 90);
  ctx.lineTo(canvas.width - 52, 90);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = '800 48px system-ui, sans-serif';
  ctx.fillText('PLAYER', 62, 178);
  ctx.fillText('CPU', 62, 258);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d9ff48';
  ctx.font = '900 70px system-ui, sans-serif';
  ctx.fillText(rally, canvas.width - 62, 178);
  ctx.fillStyle = '#fff';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(ballSpeed, canvas.width - 62, 258);
  ctx.fillStyle = '#8ea3bb';
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(shot).toUpperCase(), 62, 350);
  board.material.map.needsUpdate = true;
}

function fixScoreboard() {
  if (!S.scene) return;
  let dynamicBoard = null;
  S.scene.traverse((object) => {
    if (!object.isMesh || object.geometry?.type !== 'PlaneGeometry') return;
    const p = object.geometry.parameters || {};
    if (p.width > 6.7 && p.width < 6.9 && p.height > 1.6 && p.height < 1.8 && object.position.z < -19.5) {
      object.visible = false;
    }
    if (p.width > 7.3 && p.width < 7.5 && p.height > 2.9 && p.height < 3.2 && object.position.z < -19) {
      dynamicBoard = object;
      object.position.z = -19.45;
      object.renderOrder = 200;
      object.material.depthTest = false;
      object.material.depthWrite = false;
    }
    if (p.width > 7.1 && p.width < 7.3 && p.height > 0.7 && p.height < 0.85 && object.position.z < -19) {
      object.position.set(0, 3.25, -19.42);
      object.renderOrder = 201;
      object.material.depthTest = false;
      object.material.depthWrite = false;
    }
  });
  if (dynamicBoard) drawMainBoard(dynamicBoard);
}

function postFrame() {
  locateFallbacks();
  if (!S.scene) return;
  ensureRacketPower();
  ensureLocalArm();
  ensureBallGlow();
  animateOpponent();
  fixNet();
  fixScoreboard();
  updateRacketPower();
}

// WebGLRenderer.render is an instance method in this Three.js build. Wrapping
// its prototype was the reason V0.6 visual animation never ran. Drive the
// visual pass from the browser animation loop instead. Changes made here are
// visible on the following frame (one-frame latency, imperceptible at 60Hz).
const nativeRAF = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = function v062RAF(callback) {
  return nativeRAF((time) => {
    try {
      callback(time);
    } finally {
      postFrame();
    }
  });
};
