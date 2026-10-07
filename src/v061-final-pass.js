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
  ensureArm(scene);
  ensureBallGlow(scene);
  fixNet();
  fixScoreboard(scene);
  animateOpponent();
  updateArm(camera);
  updateBallGlow(camera);
}

// Imported before all other visual wrappers. Therefore this wrapper becomes
// the innermost render hook and runs after V0.5/V0.6 have finished mutating
// the scene, immediately before WebGLRenderer actually draws the frame.
const baseRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function v061FinalRender(scene, camera) {
  finalPass(scene, camera);
  return baseRender.call(this, scene, camera);
};
