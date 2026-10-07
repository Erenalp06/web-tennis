import * as THREE from 'three';

const F = {
  scene: null,
  athlete: null,
  parts: null,
  leftThigh: null,
  leftShin: null,
  rightThigh: null,
  rightShin: null,
  leftShoe: null,
  rightShoe: null,
  lengths: new Map(),
  lastX: 0,
  lastTime: performance.now(),
  velocity: 0,
  phase: 0,
  lastStepIndex: -1,
  wasMoving: false,
  plantTimer: 0,
  hitTimer: 0,
};

const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const mid = new THREE.Vector3();
const clamp = THREE.MathUtils.clamp;

const nativeSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function v071FootworkSceneAdd(...objects) {
  F.scene ||= this;
  return nativeSceneAdd.apply(this, objects);
};

function locate() {
  if (!F.scene) return false;
  if (!F.athlete) F.athlete = F.scene.getObjectByName('polished-opponent');
  if (!F.athlete) return false;

  F.parts = F.athlete.userData.parts || {};
  if (F.leftThigh) return true;

  const legCylinders = F.athlete.children.filter((object) => (
    object.isMesh &&
    object.geometry?.type === 'CylinderGeometry' &&
    object.position.y < 0.75 &&
    Math.abs(object.position.x) > 0.08
  ));

  const left = legCylinders.filter((m) => m.position.x < 0).sort((a, b) => b.position.y - a.position.y);
  const right = legCylinders.filter((m) => m.position.x > 0).sort((a, b) => b.position.y - a.position.y);
  [F.leftThigh, F.leftShin] = left;
  [F.rightThigh, F.rightShin] = right;

  const shoes = F.athlete.children.filter((object) => (
    object.isMesh && object.geometry?.type === 'BoxGeometry' && object.position.y < 0.12 && Math.abs(object.position.x) > 0.12
  ));
  F.leftShoe = shoes.find((m) => m.position.x < 0) || F.parts.leftShoe;
  F.rightShoe = shoes.find((m) => m.position.x > 0) || F.parts.rightShoe;

  for (const limb of [F.leftThigh, F.leftShin, F.rightThigh, F.rightShin]) {
    if (limb) F.lengths.set(limb, limb.geometry.parameters?.height || 0.35);
  }

  F.lastX = F.athlete.position.x;
  return Boolean(F.leftThigh && F.leftShin && F.rightThigh && F.rightShin && F.leftShoe && F.rightShoe);
}

function setLimb(mesh, from, to) {
  if (!mesh) return;
  dir.subVectors(to, from);
  const length = Math.max(0.001, dir.length());
  mid.addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(up, dir.normalize());
  const base = F.lengths.get(mesh) || length;
  mesh.scale.set(1, length / base, 1);
}

function stepEvent(side, intensity = 0.55, plant = false) {
  window.dispatchEvent(new CustomEvent('webtennis:opponent-step', {
    detail: { side, intensity: clamp(intensity, 0.2, 1), plant },
  }));
}

function updateFootwork(nowMs) {
  requestAnimationFrame(updateFootwork);
  if (!locate()) return;

  const dt = clamp((nowMs - F.lastTime) / 1000, 1 / 240, 0.05);
  F.lastTime = nowMs;

  const x = F.athlete.position.x;
  const rawVelocity = (x - F.lastX) / dt;
  F.lastX = x;
  F.velocity = THREE.MathUtils.lerp(F.velocity, rawVelocity, 1 - Math.exp(-11 * dt));

  const speed = Math.abs(F.velocity);
  const moving = speed > 0.18;
  const direction = Math.sign(F.velocity) || 1;

  if (moving) {
    F.phase += dt * (7.2 + clamp(speed * 1.45, 0, 8.5));
    const stepIndex = Math.floor((F.phase + Math.PI * 0.15) / Math.PI);
    if (stepIndex !== F.lastStepIndex) {
      F.lastStepIndex = stepIndex;
      const side = stepIndex % 2 === 0 ? 'left' : 'right';
      stepEvent(side, clamp(0.38 + speed * 0.12, 0.38, 0.92), false);
    }
  } else {
    F.phase += dt * 2.0;
  }

  if (F.wasMoving && !moving) {
    F.plantTimer = 0.22;
    stepEvent(direction > 0 ? 'right' : 'left', clamp(0.58 + speed * 0.1, 0.58, 1), true);
  }
  F.wasMoving = moving;
  F.plantTimer = Math.max(0, F.plantTimer - dt);
  F.hitTimer = Math.max(0, F.hitTimer - dt);

  const cycleL = Math.sin(F.phase);
  const cycleR = Math.sin(F.phase + Math.PI);
  const stride = moving ? clamp(0.075 + speed * 0.025, 0.08, 0.24) : 0.025;
  const liftL = moving ? Math.max(0, cycleL) * clamp(0.035 + speed * 0.012, 0.04, 0.105) : Math.max(0, cycleL) * 0.008;
  const liftR = moving ? Math.max(0, cycleR) * clamp(0.035 + speed * 0.012, 0.04, 0.105) : Math.max(0, cycleR) * 0.008;
  const crouch = moving ? clamp(0.028 + speed * 0.006, 0.03, 0.075) : 0.022 + Math.abs(Math.sin(nowMs * 0.0042)) * 0.008;
  const hitLoad = F.hitTimer > 0 ? Math.sin((F.hitTimer / 0.28) * Math.PI) * 0.035 : 0;
  const plantLoad = F.plantTimer > 0 ? Math.sin((F.plantTimer / 0.22) * Math.PI) * 0.045 : 0;

  const lateralL = moving ? cycleL * stride * direction : -0.015;
  const lateralR = moving ? cycleR * stride * direction : 0.015;
  const zStepL = moving ? -Math.abs(cycleL) * 0.035 : 0.01;
  const zStepR = moving ? -Math.abs(cycleR) * 0.035 : 0.01;

  const hipL = new THREE.Vector3(-0.11, 0.78 - crouch - hitLoad * 0.4, 0);
  const hipR = new THREE.Vector3(0.11, 0.78 - crouch - hitLoad * 0.4, 0);
  const ankleL = new THREE.Vector3(-0.19 + lateralL, 0.095 + liftL, 0.045 + zStepL);
  const ankleR = new THREE.Vector3(0.19 + lateralR, 0.095 + liftR, 0.045 + zStepR);

  const kneeOut = moving ? 0.045 + clamp(speed * 0.005, 0, 0.035) : 0.035;
  const kneeL = new THREE.Vector3(
    THREE.MathUtils.lerp(hipL.x, ankleL.x, 0.52) - kneeOut,
    0.44 - crouch * 0.6 + liftL * 0.48 - plantLoad * 0.22,
    0.055 + zStepL * 0.45,
  );
  const kneeR = new THREE.Vector3(
    THREE.MathUtils.lerp(hipR.x, ankleR.x, 0.52) + kneeOut,
    0.44 - crouch * 0.6 + liftR * 0.48 - plantLoad * 0.22,
    0.055 + zStepR * 0.45,
  );

  setLimb(F.leftThigh, hipL, kneeL);
  setLimb(F.leftShin, kneeL, ankleL);
  setLimb(F.rightThigh, hipR, kneeR);
  setLimb(F.rightShin, kneeR, ankleR);

  F.leftShoe.position.set(ankleL.x - 0.005, 0.045 + liftL, ankleL.z + 0.055);
  F.rightShoe.position.set(ankleR.x + 0.005, 0.045 + liftR, ankleR.z + 0.055);
  F.leftShoe.rotation.x = -0.04 + liftL * 1.3;
  F.rightShoe.rotation.x = -0.04 + liftR * 1.3;
  F.leftShoe.rotation.y = -0.08 + (moving ? direction * cycleL * 0.16 : 0);
  F.rightShoe.rotation.y = 0.08 + (moving ? direction * cycleR * 0.16 : 0);
  F.leftShoe.rotation.z = clamp(-F.velocity * 0.012, -0.1, 0.1);
  F.rightShoe.rotation.z = clamp(-F.velocity * 0.012, -0.1, 0.1);

  if (F.parts?.hips) F.parts.hips.position.y = 0.86 - crouch * 0.42 - hitLoad * 0.22;
  if (F.parts?.torso) F.parts.torso.position.y = 1.28 - crouch * 0.22 - hitLoad * 0.12;
}

const shotType = document.querySelector('#shotType');
if (shotType) {
  new MutationObserver(() => {
    const value = shotType.textContent.toLowerCase();
    if (value.includes('ai return') || value.includes('ai feed')) F.hitTimer = 0.28;
  }).observe(shotType, { childList: true, subtree: true, characterData: true });
}

requestAnimationFrame(updateFootwork);
