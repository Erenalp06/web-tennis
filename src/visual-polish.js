import * as THREE from 'three';

const state = {
  scene: null,
  originalOpponent: null,
  aiRacket: null,
  athlete: null,
  injected: false,
  lastX: 0,
  scoreboardTexture: null,
  scoreboardCanvas: null,
  lastScoreText: '',
};

const originalSceneAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function patchedSceneAdd(...objects) {
  if (!state.scene) state.scene = this;

  for (const object of objects) {
    if (!object?.isGroup) continue;

    // The procedural V0.4 opponent is the first character group added around z=-11.
    if (!state.originalOpponent && object.children.length >= 5 && object.position.z < -10.8 && object.position.z > -11.2) {
      state.originalOpponent = object;
    } else if (!state.aiRacket && object.children.length >= 3 && object.position.z < -10.6 && object.position.z > -11.1) {
      state.aiRacket = object;
    }
  }

  const result = originalSceneAdd.apply(this, objects);
  queueMicrotask(() => maybeInject(this));
  return result;
};

const originalRender = THREE.WebGLRenderer.prototype.render;
THREE.WebGLRenderer.prototype.render = function polishedRender(scene, camera) {
  if (!this.userData.visualPolishApplied) {
    this.userData.visualPolishApplied = true;
    this.toneMapping = THREE.ACESFilmicToneMapping;
    this.toneMappingExposure = 1.13;
    this.shadowMap.enabled = true;
    this.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  updateVisuals();
  return originalRender.call(this, scene, camera);
};

function standard(color, roughness = 0.75, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, size, pos, color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  return addMesh(parent, new THREE.BoxGeometry(size.x, size.y, size.z), material, pos.x, pos.y, pos.z);
}

function makeSurfaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2785b4';
  ctx.fillRect(0, 0, 256, 256);

  const image = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = Math.floor((Math.random() - 0.5) * 10);
    image.data[i] = Math.max(0, Math.min(255, image.data[i] + n));
    image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + n));
    image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + n));
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 9);
  texture.anisotropy = 4;
  return texture;
}

function polishExistingCourt(scene) {
  const surfaceTexture = makeSurfaceTexture();

  scene.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;

    const p = object.geometry.parameters || {};
    if (object.geometry.type === 'BoxGeometry' && p.width > 10.7 && p.width < 11.3 && p.depth > 23 && p.depth < 25 && p.height < 0.08) {
      object.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: surfaceTexture,
        roughness: 0.76,
        metalness: 0.01,
      });
      object.receiveShadow = true;
    }

    // Hide the old coarse wireframe net. V0.5 draws a dedicated sagging net.
    if (object.geometry.type === 'PlaneGeometry' && object.material?.wireframe && Math.abs(object.position.z) < 0.05) {
      object.visible = false;
    }
  });
}

function createPolishedNet(scene) {
  const group = new THREE.Group();
  group.name = 'polished-tennis-net';
  const halfWidth = 5.86;
  const postTop = 1.07;
  const centerTop = 0.91;
  const bottom = 0.055;
  const positions = [];

  const sagY = (x) => centerTop + (postTop - centerTop) * Math.pow(Math.abs(x) / halfWidth, 1.75);

  for (let i = 0; i <= 38; i += 1) {
    const x = -halfWidth + (i / 38) * halfWidth * 2;
    positions.push(x, bottom, 0, x, sagY(x) - 0.045, 0);
  }

  for (let row = 0; row <= 10; row += 1) {
    for (let i = 0; i < 38; i += 1) {
      const x1 = -halfWidth + (i / 38) * halfWidth * 2;
      const x2 = -halfWidth + ((i + 1) / 38) * halfWidth * 2;
      const y1 = bottom + (sagY(x1) - bottom - 0.045) * (row / 10);
      const y2 = bottom + (sagY(x2) - bottom - 0.045) * (row / 10);
      positions.push(x1, y1, 0, x2, y2, 0);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const threads = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xe9eef4, transparent: true, opacity: 0.56 }),
  );
  group.add(threads);

  const tapeMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f6f4, roughness: 0.58 });
  const segments = 30;
  for (let i = 0; i < segments; i += 1) {
    const x1 = -halfWidth + (i / segments) * halfWidth * 2;
    const x2 = -halfWidth + ((i + 1) / segments) * halfWidth * 2;
    const cx = (x1 + x2) / 2;
    const cy = (sagY(x1) + sagY(x2)) / 2;
    const length = x2 - x1 + 0.012;
    addMesh(group, new THREE.BoxGeometry(length, 0.052, 0.04), tapeMaterial, cx, cy, 0);
  }

  addBox(group, { x: 0.035, y: centerTop, z: 0.045 }, { x: 0, y: centerTop / 2, z: 0.015 }, 0xf4f1e8, { roughness: 0.62 });

  for (const x of [-halfWidth - 0.08, halfWidth + 0.08]) {
    const post = addMesh(
      group,
      new THREE.CylinderGeometry(0.047, 0.055, 1.18, 18),
      new THREE.MeshStandardMaterial({ color: 0xe8ecee, roughness: 0.4, metalness: 0.34 }),
      x,
      0.59,
      0,
    );
    post.castShadow = true;
  }

  scene.add(group);
}

function limb(parent, from, to, radius, material) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const mesh = addMesh(parent, new THREE.CylinderGeometry(radius * 0.88, radius, length, 12), material, mid.x, mid.y, mid.z);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createAthlete() {
  const root = new THREE.Group();
  root.name = 'polished-opponent';

  const skin = standard(0xc8895e, 0.68);
  const skinLight = standard(0xd69b70, 0.7);
  const shirt = standard(0xf4f6f8, 0.56);
  const shirtAccent = standard(0x1959a6, 0.52);
  const shorts = standard(0x102744, 0.66);
  const shoe = standard(0xf4f5f2, 0.62);
  const hair = standard(0x1c1512, 0.84);

  const hips = addMesh(root, new THREE.CapsuleGeometry(0.17, 0.18, 6, 12), shorts, 0, 0.86, 0);
  hips.scale.set(1.05, 0.9, 0.82);

  const torso = addMesh(root, new THREE.CapsuleGeometry(0.2, 0.48, 8, 14), shirt, 0, 1.28, 0);
  torso.scale.set(1.02, 1, 0.68);
  addBox(root, { x: 0.39, y: 0.075, z: 0.24 }, { x: 0, y: 1.43, z: 0.01 }, 0x1959a6, { roughness: 0.5 });

  const neck = addMesh(root, new THREE.CylinderGeometry(0.06, 0.065, 0.12, 12), skin, 0, 1.63, 0);
  const head = addMesh(root, new THREE.SphereGeometry(0.115, 20, 16), skinLight, 0, 1.78, 0);
  head.scale.set(0.9, 1.08, 0.92);
  const hairCap = addMesh(root, new THREE.SphereGeometry(0.118, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.805, -0.005);
  hairCap.scale.set(0.92, 0.65, 0.94);

  const leftHip = new THREE.Vector3(-0.11, 0.78, 0);
  const rightHip = new THREE.Vector3(0.11, 0.78, 0);
  const leftKnee = new THREE.Vector3(-0.16, 0.45, 0.03);
  const rightKnee = new THREE.Vector3(0.16, 0.45, 0.03);
  const leftAnkle = new THREE.Vector3(-0.19, 0.1, 0.04);
  const rightAnkle = new THREE.Vector3(0.19, 0.1, 0.04);
  limb(root, leftHip, leftKnee, 0.055, skin);
  limb(root, leftKnee, leftAnkle, 0.047, skin);
  limb(root, rightHip, rightKnee, 0.055, skin);
  limb(root, rightKnee, rightAnkle, 0.047, skin);

  const leftShoe = addMesh(root, new THREE.BoxGeometry(0.13, 0.075, 0.25), shoe, -0.2, 0.045, 0.075);
  const rightShoe = addMesh(root, new THREE.BoxGeometry(0.13, 0.075, 0.25), shoe, 0.2, 0.045, 0.075);
  leftShoe.rotation.x = -0.04;
  rightShoe.rotation.x = -0.04;

  const shoulderL = new THREE.Vector3(-0.22, 1.49, 0);
  const elbowL = new THREE.Vector3(-0.34, 1.25, 0.06);
  const handL = new THREE.Vector3(-0.22, 1.08, 0.1);
  const shoulderR = new THREE.Vector3(0.22, 1.49, 0);
  const elbowR = new THREE.Vector3(0.38, 1.31, 0.08);
  const handR = new THREE.Vector3(0.34, 1.1, 0.13);
  limb(root, shoulderL, elbowL, 0.052, shirtAccent);
  limb(root, elbowL, handL, 0.043, skin);
  limb(root, shoulderR, elbowR, 0.052, shirtAccent);
  const racketForearm = limb(root, elbowR, handR, 0.043, skin);

  const wrist = addMesh(root, new THREE.SphereGeometry(0.052, 12, 10), skin, handR.x, handR.y, handR.z);

  root.userData.parts = { torso, hips, head, hairCap, racketForearm, wrist, leftShoe, rightShoe };
  root.position.set(0, 0, -11);
  return root;
}

function makeScoreboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 420;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  state.scoreboardCanvas = canvas;
  state.scoreboardTexture = texture;
  drawScoreboard(true);
  return texture;
}

function drawScoreboard(force = false) {
  if (!state.scoreboardCanvas || !state.scoreboardTexture) return;
  const rally = document.querySelector('#rallyCount')?.textContent || '0';
  const ballSpeed = document.querySelector('#ballSpeed')?.textContent || '0 km/h';
  const key = `${rally}|${ballSpeed}`;
  if (!force && key === state.lastScoreText) return;
  state.lastScoreText = key;

  const c = state.scoreboardCanvas;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#040b18';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#2d87db';
  ctx.lineWidth = 10;
  ctx.strokeRect(9, 9, c.width - 18, c.height - 18);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#74b9ff';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('WEB TENNIS OPEN', 55, 68);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fb1c5';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText('NIGHT SESSION', 970, 66);

  ctx.strokeStyle = '#173556';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(55, 94);
  ctx.lineTo(970, 94);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 54px system-ui, sans-serif';
  ctx.fillText('PLAYER', 70, 185);
  ctx.fillText('CPU', 70, 275);
  ctx.fillStyle = '#d8ff47';
  ctx.font = '800 74px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(rally, 925, 185);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('•', 925, 275);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8ea3bb';
  ctx.font = '600 25px system-ui, sans-serif';
  ctx.fillText('RALLY', 70, 355);
  ctx.textAlign = 'right';
  ctx.fillText(`BALL ${ballSpeed}`, 925, 355);
  state.scoreboardTexture.needsUpdate = true;
}

function createScoreboard(scene) {
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 3.05),
    new THREE.MeshBasicMaterial({ map: makeScoreboardTexture(), side: THREE.DoubleSide, toneMapped: false }),
  );
  board.position.set(0, 5.15, -20.08);
  scene.add(board);

  addBox(scene, { x: 7.75, y: 3.35, z: 0.18 }, { x: 0, y: 5.15, z: -20.22 }, 0x07101f, { roughness: 0.44, metalness: 0.28 });
  board.position.z = -20.1;
}

function makeBanner(text, background = '#0b2b5a', foreground = '#dbeeff') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = foreground;
  ctx.font = '700 46px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCourtSideDetails(scene) {
  const banners = [
    ['WEB TENNIS', -4.7],
    ['NIGHT SESSION', 0],
    ['CENTER COURT', 4.7],
  ];
  for (const [text, x] of banners) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.9, 0.68),
      new THREE.MeshBasicMaterial({ map: makeBanner(text), side: THREE.DoubleSide, toneMapped: false }),
    );
    panel.position.set(x, 0.64, -14.23);
    scene.add(panel);
  }

  // Umpire chair and small courtside equipment.
  const chair = new THREE.Group();
  chair.position.set(6.3, 0, 0.35);
  addBox(chair, { x: 0.08, y: 2.05, z: 0.08 }, { x: -0.32, y: 1.02, z: 0 }, 0xd6dfe6, { metalness: 0.48, roughness: 0.42 });
  addBox(chair, { x: 0.08, y: 2.05, z: 0.08 }, { x: 0.32, y: 1.02, z: 0 }, 0xd6dfe6, { metalness: 0.48, roughness: 0.42 });
  addBox(chair, { x: 0.72, y: 0.08, z: 0.62 }, { x: 0, y: 1.72, z: 0 }, 0x1c4d82, { roughness: 0.65 });
  addBox(chair, { x: 0.72, y: 0.58, z: 0.08 }, { x: 0, y: 2.03, z: 0.27 }, 0x1c4d82, { roughness: 0.65 });
  for (let i = 0; i < 5; i += 1) {
    addBox(chair, { x: 0.62, y: 0.045, z: 0.12 }, { x: 0, y: 0.38 + i * 0.27, z: 0.12 }, 0xdfe6eb, { metalness: 0.35, roughness: 0.48 });
  }
  scene.add(chair);

  // Benches and equipment boxes.
  for (const x of [-5.85, 5.85]) {
    addBox(scene, { x: 1.15, y: 0.08, z: 0.46 }, { x, y: 0.38, z: 3.4 }, 0x164976, { roughness: 0.62 });
    addBox(scene, { x: 0.08, y: 0.4, z: 0.08 }, { x: x - 0.42, y: 0.19, z: 3.4 }, 0xd6dfe6, { metalness: 0.35 });
    addBox(scene, { x: 0.08, y: 0.4, z: 0.08 }, { x: x + 0.42, y: 0.19, z: 3.4 }, 0xd6dfe6, { metalness: 0.35 });
  }
}

function createArenaPolish(scene) {
  // Upper fascia gives the stands a continuous stadium bowl silhouette.
  for (const side of [-1, 1]) {
    addBox(scene, { x: 0.38, y: 1.05, z: 37 }, { x: side * 12.45, y: 3.9, z: 0 }, 0x071326, { roughness: 0.76 });
  }
  for (const end of [-1, 1]) {
    addBox(scene, { x: 25.2, y: 1.05, z: 0.38 }, { x: 0, y: 3.9, z: end * 20.1 }, 0x071326, { roughness: 0.76 });
  }

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9f6ff,
    emissive: 0xd8efff,
    emissiveIntensity: 3.3,
    roughness: 0.28,
  });
  for (const [x, z] of [[-10, -13], [10, -13], [-10, 13], [10, 13]]) {
    for (let i = -3; i <= 3; i += 1) {
      addMesh(scene, new THREE.BoxGeometry(0.26, 0.09, 0.12), lightMaterial, x + i * 0.31, 8.03, z);
    }
    const glow = new THREE.PointLight(0xd8eeff, 19, 23, 1.9);
    glow.position.set(x, 7.75, z);
    scene.add(glow);
  }

  const courtFill = new THREE.DirectionalLight(0xf5fbff, 0.42);
  courtFill.position.set(4, 11, 7);
  courtFill.castShadow = false;
  scene.add(courtFill);

  scene.fog = new THREE.Fog(0x071526, 35, 78);
  scene.background = new THREE.Color(0x071526);
}

function maybeInject(scene) {
  if (state.injected || !scene || !state.originalOpponent) return;
  state.injected = true;

  polishExistingCourt(scene);
  createPolishedNet(scene);
  createArenaPolish(scene);
  createCourtSideDetails(scene);
  createScoreboard(scene);

  state.originalOpponent.visible = false;
  state.athlete = createAthlete();
  scene.add(state.athlete);
}

function updateVisuals() {
  if (!state.injected) {
    if (state.scene) maybeInject(state.scene);
    return;
  }

  drawScoreboard();

  if (!state.athlete || !state.originalOpponent) return;
  const now = performance.now() * 0.001;
  const sourceX = state.originalOpponent.position.x;
  const dx = sourceX - state.lastX;
  state.lastX = THREE.MathUtils.lerp(state.lastX, sourceX, 0.32);

  state.athlete.position.x = sourceX;
  state.athlete.position.z = -11;
  state.athlete.position.y = Math.abs(Math.sin(now * 4.6)) * 0.014;
  state.athlete.rotation.y = Math.PI;
  state.athlete.rotation.z = clamp(-dx * 0.13, -0.09, 0.09);

  const parts = state.athlete.userData.parts;
  if (parts) {
    parts.torso.rotation.z = Math.sin(now * 3.4) * 0.012 + clamp(-dx * 0.18, -0.07, 0.07);
    parts.head.rotation.y = Math.sin(now * 0.7) * 0.08;
    parts.leftShoe.rotation.y = -0.08 + Math.sin(now * 4.6) * 0.035;
    parts.rightShoe.rotation.y = 0.08 - Math.sin(now * 4.6) * 0.035;
  }
}
