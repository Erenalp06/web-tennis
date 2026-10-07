import * as THREE from 'three';

const F = {
  athlete: null,
  aiRacket: null,
  playerRacket: null,
  ball: null,
  net: null,
  arm: null,
  glow: null,
  initialized: false,
  lastAiX: 0,
  lastAiYaw: Math.PI - 0.25,
  powerCanvas: null,
  powerTexture: null,
  powerPlane: null,
  powerValue: 0,
  powerShowUntil: 0,
  powerBound: false,
};

const clamp = THREE.MathUtils.clamp;
const Y = new THREE.Vector3(0, 1, 0);
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();

function locate(scene) {
  F.athlete = scene.getObjectByName('polished-opponent') || F.athlete;
  F.net = scene.getObjectByName('polished-tennis-net') || F.net;
  F.arm = scene.getObjectByName('v06-first-person-arm') || F.arm;

  let player = null;
  let ai = null;
  let ball = null;

  scene.traverse((object) => {
    if (object.isGroup && object.userData?.rx && object.userData?.ry) {
      if (object.position.z > 5) player = object;
      if (object.position.z < -5) ai = object;
    }

    if (!ball && object.isMesh && object.geometry?.type === 'SphereGeometry') {
      const r = object.geometry.parameters?.radius;
      if (r > 0.06 && r < 0.075) ball = object;
    }
  });

  if (player) F.playerRacket = player;
  if (ai) F.aiRacket = ai;
  if (ball) F.ball = ball;
}

function cylinderBetween(parent, from, to, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, 1, 12), material);
  mesh.castShadow = true;
  parent.add(mesh);
  updateCylinder(mesh, from, to);
  return mesh;
}

function updateCylinder(mesh, from, to) {
  a.subVectors(to, from);
  const length = a.length();
  if (length < 0.001) return;
  b.addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(b);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(Y, a.normalize());
}

function ensureArm(scene) {
  if (F.arm || !F.playerRacket) return;

  const root = new THREE.Group();
  root.name = 'v06-first-person-arm';
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98c67, roughness: 0.68 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x153b70, roughness: 0.58 });

  const forearm = cylinderBetween(root, new THREE.Vector3(), new THREE.Vector3(0, 0.5, 0), 0.058, skin);
  const sleeve = cylinderBetween(root, new THREE.Vector3(), new THREE.Vector3(0, 0.32, 0), 0.077, sleeveMat);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 12), skin);
  hand.scale.set(0.82, 1.12, 0.74);
  hand.castShadow = true;
  root.add(hand);
  root.userData = { forearm, sleeve, hand };
  scene.add(root);
  F.arm = root;
}

function updateArm(camera) {
  if (!F.arm || !F.playerRacket || !camera) return;
  const { forearm, sleeve, hand } = F.arm.userData;
  if (!forearm || !sleeve || !hand) return;

  a.set(0, -0.5, 0.01).applyQuaternion(F.playerRacket.quaternion).add(F.playerRacket.position);
  hand.position.copy(a);
  hand.quaternion.copy(F.playerRacket.quaternion);

  b.set(0.34, -0.29, -0.58).applyQuaternion(camera.quaternion).add(camera.position);
  c.set(0.46, -0.43, -0.38).applyQuaternion(camera.quaternion).add(camera.position);
  updateCylinder(forearm, b, a);
  updateCylinder(sleeve, c, b);
}

function ensureBallGlow(scene) {
  if (F.glow || !F.ball) return;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(226,255,70,.9)');
  gradient.addColorStop(0.22, 'rgba(226,255,70,.42)');
  gradient.addColorStop(1, 'rgba(226,255,70,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.58,
  }));
  sprite.name = 'v061-ball-glow';
  sprite.renderOrder = 8;
  scene.add(sprite);
  F.glow = sprite;
}

function updateBallGlow(camera) {
  if (!F.glow || !F.ball) return;
  F.glow.position.copy(F.ball.position);
  const distance = camera ? camera.position.distanceTo(F.ball.position) : 10;
  const size = clamp(0.26 + distance * 0.008, 0.28, 0.42);
  F.glow.scale.setScalar(size);
  F.glow.visible = F.ball.visible;
}

function drawRacketPower(value) {
  if (!F.powerCanvas || !F.powerTexture) return;
  const ctx = F.powerCanvas.getContext('2d');
  const size = F.powerCanvas.width;
  const center = size / 2;
  const pct = Math.round(clamp(value, 0, 1) * 100);
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * clamp(value, 0, 1);

  ctx.clearRect(0, 0, size, size);

  // Soft glass disc keeps the strings visible while giving the number contrast.
  const bg = ctx.createRadialGradient(center, center, 28, center, center, 210);
  bg.addColorStop(0, 'rgba(2,12,27,.42)');
  bg.addColorStop(0.62, 'rgba(2,12,27,.22)');
  bg.addColorStop(1, 'rgba(2,12,27,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = 'round';
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(255,255,255,.13)';
  ctx.beginPath();
  ctx.arc(center, center, 174, 0, Math.PI * 2);
  ctx.stroke();

  const ring = ctx.createLinearGradient(92, 92, 420, 420);
  ring.addColorStop(0, '#6fd8ff');
  ring.addColorStop(0.55, '#d9ff48');
  ring.addColorStop(0.82, '#ffbd4a');
  ring.addColorStop(1, '#ff665c');
  ctx.strokeStyle = ring;
  ctx.shadowColor = pct >= 85 ? 'rgba(255,102,92,.8)' : 'rgba(217,255,72,.72)';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(center, center, 174, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 112px system-ui, sans-serif';
  ctx.fillText(`${pct}%`, center, center - 10);
  ctx.fillStyle = 'rgba(255,255,255,.58)';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('POWER', center, center + 82);

  F.powerTexture.needsUpdate = true;
}

function ensureRacketPower() {
  if (!F.playerRacket || F.powerPlane) return;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.238, 0.31),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      opacity: 0,
    }),
  );
  plane.name = 'racket-power-display';
  plane.position.set(0, 0, 0.018);
  plane.renderOrder = 50;
  F.playerRacket.add(plane);

  F.powerCanvas = canvas;
  F.powerTexture = texture;
  F.powerPlane = plane;
  drawRacketPower(0);
}

function bindRacketPower() {
  if (F.powerBound) return;
  F.powerBound = true;

  // Hide the old center-screen meters. Persistent telemetry stays visible.
  const style = document.createElement('style');
  style.id = 'v061-racket-power-style';
  style.textContent = '#powerMeterFix,#powerMeter{display:none!important}';
  document.head.appendChild(style);

  document.addEventListener('mouseup', (event) => {
    if (event.button !== 0 || document.pointerLockElement?.id !== 'game') return;

    // Runtime power listeners update their values in the same event. Read on
    // the next task so the racket receives the final shot percentage.
    setTimeout(() => {
      const raw = document.querySelector('#powerTelemetryValue')?.textContent || '0';
      const pct = clamp(parseFloat(raw) || 0, 0, 100);
      if (pct <= 0) return;
      F.powerValue = pct / 100;
      F.powerShowUntil = performance.now() + 1050;
      drawRacketPower(F.powerValue);
    }, 0);
  }, true);
}

function updateRacketPower() {
  if (!F.powerPlane) return;
  const remaining = F.powerShowUntil - performance.now();
  if (remaining <= 0) {
    F.powerPlane.material.opacity = 0;
    F.powerPlane.visible = false;
    return;
  }

  F.powerPlane.visible = true;
  const fadeIn = clamp((1050 - remaining) / 120, 0, 1);
  const fadeOut = clamp(remaining / 260, 0, 1);
  F.powerPlane.material.opacity = Math.min(fadeIn, fadeOut) * 0.95;
  const pulse = 1 + Math.sin((1050 - remaining) * 0.022) * 0.015;
  F.powerPlane.scale.set(pulse, pulse, 1);
}

function fixNet() {
  if (!F.net) return;

  F.net.traverse((object) => {
    if (object.isLineSegments) {
      object.material.color.set(0x12243a);
      object.material.opacity = 0.96;
      object.material.transparent = true;
      object.material.depthWrite = true;
    }
  });

  if (!F.net.getObjectByName('v061-net-veil')) {
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(11.72, 0.94),
      new THREE.MeshBasicMaterial({
        color: 0x07131f,
        transparent: true,
        opacity: 0.105,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    veil.name = 'v061-net-veil';
    veil.position.set(0, 0.515, 0.012);
    F.net.add(veil);
  }
}

function fixScoreboard(scene) {
  scene.traverse((object) => {
    if (!object.isMesh || object.geometry?.type !== 'PlaneGeometry') return;
    const p = object.geometry.parameters || {};

    // Hide the old V0.4 NEW YORK sign which sits in front of the dynamic board.
    if (p.width > 6.7 && p.width < 6.9 && p.height > 1.6 && p.height < 1.8 && object.position.z < -19.5) {
      object.visible = false;
    }

    // Dynamic main scoreboard.
    if (p.width > 7.3 && p.width < 7.5 && p.height > 2.9 && p.height < 3.2 && object.position.z < -19) {
      object.position.z = -19.62;
      object.renderOrder = 12;
      if (object.material) {
        object.material.depthWrite = false;
        object.material.depthTest = true;
      }
    }

    // Last-shot stats ribbon: bring it in front of the stadium fascia.
    if (p.width > 7.1 && p.width < 7.3 && p.height > 0.7 && p.height < 0.85 && object.position.z < -19) {
      object.position.set(0, 3.12, -19.55);
      object.renderOrder = 13;
      if (object.material) object.material.depthWrite = false;
    }
  });
}

function animateOpponent() {
  if (!F.athlete || !F.aiRacket) return;

  const targetX = F.aiRacket.position.x - 0.32;
  const dx = targetX - F.lastAiX;
  F.lastAiX = targetX;

  const baseYaw = Math.PI - 0.25;
  let swingYaw = F.aiRacket.rotation.y - baseYaw;
  while (swingYaw > Math.PI) swingYaw -= Math.PI * 2;
  while (swingYaw < -Math.PI) swingYaw += Math.PI * 2;
  const swing = clamp(swingYaw / 0.58, -1, 1);
  const yawDelta = F.aiRacket.rotation.y - F.lastAiYaw;
  F.lastAiYaw = F.aiRacket.rotation.y;

  // Final world transform. This runs after the V0.5/V0.6 visual wrappers.
  F.athlete.position.x = targetX;
  F.athlete.position.z = -11;
  F.athlete.position.y = Math.min(0.025, Math.abs(dx) * 0.7 + Math.abs(swing) * 0.01);
  F.athlete.rotation.y = Math.PI + swing * 0.14;
  F.athlete.rotation.z = clamp(-dx * 0.4 - yawDelta * 0.28, -0.11, 0.11);

  const parts = F.athlete.userData.parts || {};
  if (parts.hips) {
    parts.hips.rotation.y = -swing * 0.24;
    parts.hips.rotation.z = clamp(-dx * 0.25, -0.08, 0.08);
  }
  if (parts.torso) {
    parts.torso.rotation.y = swing * 0.68;
    parts.torso.rotation.x = -Math.abs(swing) * 0.09;
    parts.torso.rotation.z = clamp(-dx * 0.48 - swing * 0.05, -0.14, 0.14);
  }
  if (parts.head) parts.head.rotation.y = -swing * 0.22;
  if (parts.racketForearm) {
    parts.racketForearm.rotation.x = swing * 0.46;
    parts.racketForearm.rotation.z = -swing * 0.34;
  }
  if (parts.leftShoe && parts.rightShoe) {
    const step = clamp(dx * 1.8, -0.18, 0.18);
    parts.leftShoe.rotation.y = -0.08 - step;
    parts.rightShoe.rotation.y = 0.08 + step;
  }
}

function finalPass(scene, camera) {
  locate(scene);
  bindRacketPower();
  ensureRacketPower();
  ensureArm(scene);
  ensureBallGlow(scene);
  fixNet();
  fixScoreboard(scene);
  animateOpponent();
  updateArm(camera);
  updateBallGlow(camera);
  updateRacketPower();
}

// Imported before all other visual wrappers. Therefore this wrapper becomes
// the innermost render hook and runs after V0.5/V0.6 have finished mutating
// the scene, immediately before WebGLRenderer actually draws the frame.
const baseRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function v061FinalRender(scene, camera) {
  finalPass(scene, camera);
  return baseRender.call(this, scene, camera);
};
