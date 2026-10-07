import * as THREE from 'three';
import './styles.css';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const startScreen = $('#startScreen');
const startButton = $('#startButton');
const rallyEl = $('#rallyCount');
const racketSpeedEl = $('#racketSpeed');
const ballSpeedEl = $('#ballSpeed');
const spinValueEl = $('#spinValue');
const shotTypeEl = $('#shotType');
const messageEl = $('#message');
const stanceEl = $('#stance');
const clamp = THREE.MathUtils.clamp;

const C = {
  halfL: 11.885,
  halfW: 5.485,
  net: 0.914,
  ballR: 0.067,
  aiZ: -11.0,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1b33);
scene.fog = new THREE.Fog(0x0c1b33, 42, 92);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.05, 120);
camera.position.set(0, 1.78, 14.2);
camera.lookAt(0, 1.05, -2.0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

scene.add(new THREE.HemisphereLight(0xbfdcff, 0x162331, 1.25));
const moonFill = new THREE.DirectionalLight(0x9fc5ff, 0.9);
moonFill.position.set(-10, 18, 14);
scene.add(moonFill);

function mesh(geo, mat, pos, parent = scene) {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function box(x, y, z, px, py, pz, color, parent = scene, opts = {}) {
  return mesh(
    new THREE.BoxGeometry(x, y, z),
    new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.88, metalness: opts.metalness ?? 0 }),
    new THREE.Vector3(px, py, pz),
    parent,
  );
}

function createSignTexture(lines, bg = '#07162f', fg = '#f7fbff') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#2f72c6';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.fillText(lines[0], c.width / 2, 92);
  ctx.fillStyle = '#77b9ff';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(lines[1], c.width / 2, 170);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCourt() {
  box(28, 0.18, 44, 0, -0.13, 0, 0x183b35);
  box(C.halfW * 2, 0.04, C.halfL * 2, 0, 0, 0, 0x176c99);

  const lm = new THREE.MeshStandardMaterial({ color: 0xf8f6e8, roughness: 0.78 });
  const line = (w, d, x, z) => mesh(new THREE.BoxGeometry(w, 0.018, d), lm, new THREE.Vector3(x, 0.032, z));
  const s = 8.23 / 2;
  line(0.055, C.halfL * 2, -C.halfW, 0);
  line(0.055, C.halfL * 2, C.halfW, 0);
  line(C.halfW * 2, 0.055, 0, -C.halfL);
  line(C.halfW * 2, 0.055, 0, C.halfL);
  line(0.05, C.halfL * 2, -s, 0);
  line(0.05, C.halfL * 2, s, 0);
  line(s * 2, 0.05, 0, -6.4);
  line(s * 2, 0.05, 0, 6.4);
  line(0.05, 12.8, 0, 0);

  mesh(
    new THREE.PlaneGeometry(C.halfW * 2 + 0.75, C.net, 34, 9),
    new THREE.MeshBasicMaterial({
      color: 0xe9eef0,
      transparent: true,
      opacity: 0.48,
      wireframe: true,
      side: THREE.DoubleSide,
    }),
    new THREE.Vector3(0, C.net / 2, 0),
  );
  box(C.halfW * 2 + 0.8, 0.05, 0.055, 0, C.net, 0, 0xffffff);
  for (const x of [-C.halfW - 0.4, C.halfW + 0.4]) {
    mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 1.08, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8ded9, metalness: 0.35 }),
      new THREE.Vector3(x, 0.54, 0),
    );
  }

  box(15.8, 1.05, 0.24, 0, 0.5, -14.35, 0x092d5b);
  box(15.8, 1.05, 0.24, 0, 0.5, 14.95, 0x092d5b);
  box(0.24, 1.05, 29.5, -7.75, 0.5, 0.3, 0x092d5b);
  box(0.24, 1.05, 29.5, 7.75, 0.5, 0.3, 0x092d5b);
}

function createStadium() {
  const standColor = 0x101f3a;
  const aisleColor = 0x1d3152;

  for (const side of [-1, 1]) {
    for (let row = 0; row < 9; row += 1) {
      const x = side * (8.2 + row * 0.5);
      const y = 0.22 + row * 0.38;
      box(0.92, 0.34, 31.5, x, y, 0.2, row % 2 ? aisleColor : standColor);
    }
  }

  for (const end of [-1, 1]) {
    for (let row = 0; row < 8; row += 1) {
      const z = end * (15.35 + row * 0.48);
      const y = 0.22 + row * 0.38;
      box(17.2 + row * 0.35, 0.34, 0.9, 0, y, z, row % 2 ? aisleColor : standColor);
    }
  }

  const sign = mesh(
    new THREE.PlaneGeometry(6.8, 1.7),
    new THREE.MeshBasicMaterial({ map: createSignTexture(['NEW YORK', 'NIGHT SESSION']), side: THREE.DoubleSide }),
    new THREE.Vector3(0, 5.1, -20.0),
  );
  sign.rotation.y = 0;

  const target = new THREE.Object3D();
  target.position.set(0, 0, 0);
  scene.add(target);
  for (const [x, z] of [[-10, -13], [10, -13], [-10, 13], [10, 13]]) {
    box(0.18, 8.2, 0.18, x, 4.1, z, 0x4f6075, scene, { metalness: 0.65, roughness: 0.45 });
    box(2.5, 0.14, 0.35, x, 8.0, z, 0x72839a, scene, { metalness: 0.7, roughness: 0.35 });
    const light = new THREE.SpotLight(0xe8f4ff, 115, 55, Math.PI / 4.2, 0.5, 1.1);
    light.position.set(x, 7.9, z);
    light.target = target;
    light.castShadow = false;
    scene.add(light);
  }

  const seats = [];
  const rng = () => Math.random();
  for (const side of [-1, 1]) {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 49; col += 1) {
        if (rng() < 0.22) continue;
        seats.push({ x: side * (7.95 + row * 0.5), y: 0.58 + row * 0.38, z: -13.1 + col * 0.55 });
      }
    }
  }
  for (const end of [-1, 1]) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 27; col += 1) {
        if (rng() < 0.25) continue;
        seats.push({ x: -7.15 + col * 0.55, y: 0.58 + row * 0.38, z: end * (15.05 + row * 0.48) });
      }
    }
  }

  const headGeo = new THREE.SphereGeometry(0.065, 7, 6);
  const bodyGeo = new THREE.BoxGeometry(0.16, 0.24, 0.12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true });
  const heads = new THREE.InstancedMesh(headGeo, headMat, seats.length);
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, seats.length);
  const dummy = new THREE.Object3D();
  const shirtColors = [0x2563a9, 0xf4f4f2, 0xb52f42, 0xe0b43a, 0x20334d, 0x4b8b68, 0x8c56a8];
  const skinColors = [0xf0c39a, 0xd89b6a, 0xb9784f, 0x8d5d3e, 0xf5d3b4];

  seats.forEach((seat, i) => {
    dummy.position.set(seat.x, seat.y, seat.z);
    dummy.rotation.y = Math.abs(seat.x) > 7.5 ? (seat.x > 0 ? -Math.PI / 2 : Math.PI / 2) : (seat.z < 0 ? 0 : Math.PI);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, new THREE.Color(shirtColors[Math.floor(rng() * shirtColors.length)]));

    dummy.position.y += 0.19;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(skinColors[Math.floor(rng() * skinColors.length)]));
  });
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  bodies.castShadow = false;
  heads.castShadow = false;
  scene.add(bodies, heads);
}

function createRacket(color = 0xd9ff48) {
  const g = new THREE.Group();
  const rx = 0.145;
  const ry = 0.19;
  const rim = mesh(
    new THREE.TorusGeometry(rx, 0.009, 8, 40),
    new THREE.MeshStandardMaterial({ color, roughness: 0.36 }),
    new THREE.Vector3(),
    g,
  );
  rim.scale.y = ry / rx;

  const pts = [];
  const sm = new THREE.LineBasicMaterial({ color: 0xeaf0eb, transparent: true, opacity: 0.72 });
  for (let i = -5; i <= 5; i += 1) {
    const x = i * 0.024;
    const y = Math.sqrt(Math.max(0, 1 - (x / 0.137) ** 2)) * 0.183;
    pts.push(new THREE.Vector3(x, -y, 0), new THREE.Vector3(x, y, 0));
  }
  for (let i = -6; i <= 6; i += 1) {
    const y = i * 0.027;
    const x = Math.sqrt(Math.max(0, 1 - (y / 0.183) ** 2)) * 0.137;
    pts.push(new THREE.Vector3(-x, y, 0), new THREE.Vector3(x, y, 0));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), sm));
  box(0.052, 0.115, 0.022, 0, -0.245, 0, color, g);
  box(0.041, 0.27, 0.033, 0, -0.43, 0, 0x202522, g);
  g.userData.rx = rx;
  g.userData.ry = ry;
  return g;
}

function createOpponent() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd1a06f });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xe6e8f0 });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x162b4c });
  mesh(new THREE.SphereGeometry(0.105, 16, 12), skin, new THREE.Vector3(0, 1.72, 0), g);
  mesh(new THREE.CapsuleGeometry(0.18, 0.43, 5, 10), shirt, new THREE.Vector3(0, 1.32, 0), g);
  mesh(new THREE.BoxGeometry(0.34, 0.22, 0.22), shorts, new THREE.Vector3(0, 0.91, 0), g);
  for (const x of [-0.11, 0.11]) {
    mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.58, 10), skin, new THREE.Vector3(x, 0.5, 0), g);
  }
  g.position.set(0, 0, C.aiZ);
  g.rotation.y = Math.PI;
  scene.add(g);
  return g;
}

createCourt();
createStadium();

const player = { x: 0, z: 12.85, vx: 0, vz: 0, speed: 5.0 };
const keys = new Set();

const playerRacket = createRacket();
playerRacket.position.set(0.42, 1.16, player.z - 0.58);
playerRacket.rotation.set(0.16, -0.25, -0.18);
scene.add(playerRacket);

const opponent = createOpponent();
const aiRacket = createRacket(0xffd36a);
aiRacket.position.set(0.32, 1.12, C.aiZ + 0.14);
aiRacket.rotation.set(0.12, Math.PI - 0.25, 0.18);
scene.add(aiRacket);

const ballMesh = mesh(
  new THREE.SphereGeometry(C.ballR, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xdfff3f, roughness: 0.8 }),
  new THREE.Vector3(),
);
const ballShadow = mesh(
  new THREE.CircleGeometry(0.105, 20),
  new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.28, depthWrite: false }),
  new THREE.Vector3(0, 0.035, 0),
);
ballShadow.rotation.x = -Math.PI / 2;

const trailGeo = new THREE.BufferGeometry();
const trailPts = [];
scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xe8ff9f, transparent: true, opacity: 0.25 })));

const ball = {
  p: new THREE.Vector3(0, 1.55, -9.6),
  prev: new THREE.Vector3(),
  v: new THREE.Vector3(),
  spin: new THREE.Vector3(),
  active: false,
  bounces: 0,
  hitter: 'ai',
  cooldown: 0,
  reset: 0.3,
};

const racketTarget = playerRacket.position.clone();
const prevRacket = playerRacket.position.clone();
const racketV = new THREE.Vector3();
const targetQuat = new THREE.Quaternion();
const sweepStartPos = playerRacket.position.clone();
const sweepEndPos = playerRacket.position.clone();
const sweepStartQuat = playerRacket.quaternion.clone();
const sweepEndQuat = playerRacket.quaternion.clone();
const contactBall = new THREE.Vector3();
const contactRacket = new THREE.Vector3();
const contactQuat = new THREE.Quaternion();
const contactInvQuat = new THREE.Quaternion();
const contactLocal = new THREE.Vector3();
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

let mouseVX = 0;
let mouseVY = 0;
let rawMouseVX = 0;
let lastMouse = performance.now();
let contactHeight = 1.16;
let started = false;
let rally = 0;
let aiCooldown = 0;
let msgTimer = 0;
let strokeState = 'ready';
let prepSide = null;
let prepIntent = 0;
let prepCharge = 0;
let prepAge = 0;
let swingPhase = 0;
let swingDuration = 0.24;
let recoverPhase = 0;
let swingLift = 0;

function message(t, s = 0.7) {
  messageEl.textContent = t;
  messageEl.classList.add('visible');
  msgTimer = s;
}

function setStance(text, side = '') {
  if (!stanceEl) return;
  stanceEl.textContent = text;
  stanceEl.dataset.side = side;
}

function rpm() {
  return Math.round(Math.abs(ball.spin.x) * 60 / (Math.PI * 2));
}

function serveAI() {
  const tx = clamp(player.x + THREE.MathUtils.randFloat(-3.2, 3.2), -3.8, 3.8);
  ball.p.set(THREE.MathUtils.randFloat(-1.1, 1.1), 1.3, -9.7);
  ball.prev.copy(ball.p);
  ball.v.set((tx - ball.p.x) * 0.44, 5.0, THREE.MathUtils.randFloat(13.2, 15.2));
  const r = THREE.MathUtils.randFloat(850, 1450);
  ball.spin.set(r * Math.PI * 2 / 60, 0, 0);
  ball.active = true;
  ball.bounces = 0;
  ball.hitter = 'ai';
  ball.cooldown = 0.1;
  trailPts.length = 0;
  shotTypeEl.textContent = 'AI feed';
}

function reset(t) {
  ball.active = false;
  ball.v.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.reset = 0.7;
  rally = 0;
  rallyEl.textContent = 0;
  message(t);
}

function beginPreparation(side) {
  prepSide = side;
  strokeState = 'prepared';
  prepCharge = 0.25;
  prepAge = 0;
  prepIntent = 0;
  setStance(side === 'forehand' ? 'FOREHAND HAZIR' : 'BACKHAND HAZIR', side);
}

function beginSwing() {
  if (strokeState !== 'prepared' || !prepSide) return;
  strokeState = 'swing';
  swingPhase = 0;
  swingDuration = THREE.MathUtils.lerp(0.31, 0.17, clamp(prepCharge, 0, 1));
  swingLift = clamp(mouseVY / 18, -0.28, 0.72);
  setStance(prepSide === 'forehand' ? 'FOREHAND' : 'BACKHAND', prepSide);
}

function cancelPreparation() {
  strokeState = 'ready';
  prepSide = null;
  prepCharge = 0;
  prepAge = 0;
  prepIntent = 0;
  setStance('READY');
}

function racketContact() {
  const rx = playerRacket.userData.rx + C.ballR + 0.028;
  const ry = playerRacket.userData.ry + C.ballR + 0.028;
  const rz = C.ballR + 0.052;
  let best = null;

  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    contactBall.copy(ball.prev).lerp(ball.p, t);
    contactRacket.copy(sweepStartPos).lerp(sweepEndPos, t);
    contactQuat.copy(sweepStartQuat).slerp(sweepEndQuat, t);
    contactInvQuat.copy(contactQuat).invert();
    contactLocal.copy(contactBall).sub(contactRacket).applyQuaternion(contactInvQuat);

    const e = (contactLocal.x / rx) ** 2 + (contactLocal.y / ry) ** 2 + (contactLocal.z / rz) ** 2;
    if (e > 1 || (best && e >= best.e)) continue;

    const faceE =
      (contactLocal.x / (playerRacket.userData.rx + C.ballR * 0.45)) ** 2 +
      (contactLocal.y / (playerRacket.userData.ry + C.ballR * 0.45)) ** 2;
    best = { e, x: contactLocal.x, y: contactLocal.y, q: clamp(1 - Math.sqrt(faceE) * 0.72, 0, 1) };
  }

  return best;
}

function hitPlayer(c) {
  if (ball.cooldown || ball.hitter === 'player') return;
  const speed = clamp(racketV.length(), 0, 40);
  const up = clamp(racketV.y, -10, 22);
  const lat = clamp(racketV.x, -20, 20);
  const fwd = clamp(-racketV.z, -8, 24);
  const n = new THREE.Vector3(0, 0, -1).applyQuaternion(playerRacket.quaternion).normalize();
  if (n.z > 0) n.multiplyScalar(-1);

  const q = 0.58 + c.q * 0.42;
  const prepPower = 0.92 + prepCharge * 0.16;
  const exit = clamp(
    (9.8 + speed * 0.6 + Math.max(0, fwd) * 0.2 + Math.max(0, ball.v.z) * 0.028) * q * prepPower,
    9.5,
    36.5,
  );
  const dir = new THREE.Vector3(
    clamp(n.x * 0.86 + lat * 0.018 + c.x * 0.75, -0.66, 0.66),
    clamp(0.105 + n.y * 0.22 + up * 0.015, 0.045, 0.5),
    -1,
  ).normalize();
  ball.v.copy(dir.multiplyScalar(exit));

  const r = clamp(420 + Math.max(0, up) * 155 + Math.abs(lat) * 14, 300, 4100);
  ball.spin.set(-r * Math.PI * 2 / 60, lat * 0.12, -lat * 0.42);
  ball.hitter = 'player';
  ball.cooldown = 0.16;
  ball.bounces = 0;
  rally += 1;
  rallyEl.textContent = rally;

  const sideName = prepSide === 'backhand' ? 'Backhand' : 'Forehand';
  shotTypeEl.textContent = c.q < 0.25 ? `${sideName} mishit` : r > 1900 ? `${sideName} topspin` : speed > 15 ? `${sideName} drive` : sideName;
  message(c.q > 0.62 ? `${sideName} · sweet spot` : `${sideName} · temas`, 0.45);
}

function integratePreview(p, v, spin, dt) {
  const speed = v.length();
  if (speed) {
    v.addScaledVector(v.clone().multiplyScalar(-0.0105 * speed), dt);
    v.addScaledVector(spin.clone().cross(v).multiplyScalar(0.00038), dt);
  }
  v.y += -9.81 * dt;
  spin.multiplyScalar(Math.exp(-0.09 * dt));
  p.addScaledVector(v, dt);
}

function predictedNetHeight(initialV, initialSpin) {
  const p = ball.p.clone();
  const v = initialV.clone();
  const spin = initialSpin.clone();
  let previousZ = p.z;
  for (let i = 0; i < 240; i += 1) {
    const previousY = p.y;
    integratePreview(p, v, spin, 1 / 120);
    if (previousZ < 0 && p.z >= 0) {
      const t = clamp((0 - previousZ) / Math.max(0.0001, p.z - previousZ), 0, 1);
      return THREE.MathUtils.lerp(previousY, p.y, t);
    }
    previousZ = p.z;
  }
  return -Infinity;
}

function hitAI() {
  if (aiCooldown || ball.hitter === 'ai') return;

  const wrongFoot = Math.random() < 0.42;
  const targetX = wrongFoot
    ? clamp(player.x + THREE.MathUtils.randFloat(-0.7, 0.7), -3.8, 3.8)
    : clamp(player.x + (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(1.7, 3.6), -4.0, 4.0);
  const target = new THREE.Vector3(targetX, C.ballR + 0.02, THREE.MathUtils.randFloat(7.9, 10.1));
  const flight = THREE.MathUtils.randFloat(1.08, 1.25);
  const initialV = new THREE.Vector3(
    (target.x - ball.p.x) / flight,
    (target.y - ball.p.y + 0.5 * 9.81 * flight * flight) / flight,
    (target.z - ball.p.z) / flight,
  );
  const r = THREE.MathUtils.randFloat(650, 1150);
  const spin = new THREE.Vector3(r * Math.PI * 2 / 60, 0, THREE.MathUtils.randFloatSpread(8));

  const desiredNetHeight = C.net + C.ballR + 0.5;
  for (let i = 0; i < 4; i += 1) {
    const netHeight = predictedNetHeight(initialV, spin);
    if (netHeight >= desiredNetHeight) break;
    initialV.y += clamp((desiredNetHeight - netHeight) * 1.35, 0.2, 1.8);
  }

  ball.v.copy(initialV);
  ball.spin.copy(spin);
  ball.hitter = 'ai';
  ball.cooldown = 0.12;
  ball.bounces = 0;
  aiCooldown = 0.35;
  rally += 1;
  rallyEl.textContent = rally;
  shotTypeEl.textContent = 'AI return';
}

function updatePlayer(dt) {
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const forward = keys.has('KeyW') || keys.has('ArrowUp');
  const back = keys.has('KeyS') || keys.has('ArrowDown');
  let dx = (right ? 1 : 0) - (left ? 1 : 0);
  let dz = (back ? 1 : 0) - (forward ? 1 : 0);
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;

  const desiredVX = dx * player.speed;
  const desiredVZ = dz * player.speed * 0.72;
  const accel = 1 - Math.exp(-11 * dt);
  player.vx = THREE.MathUtils.lerp(player.vx, desiredVX, accel);
  player.vz = THREE.MathUtils.lerp(player.vz, desiredVZ, accel);

  player.x = clamp(player.x + player.vx * dt, -4.45, 4.45);
  player.z = clamp(player.z + player.vz * dt, 10.75, 14.05);
}

function updateStroke(dt) {
  sweepStartPos.copy(playerRacket.position);
  sweepStartQuat.copy(playerRacket.quaternion);

  if (strokeState === 'ready') {
    racketTarget.set(player.x + 0.42, contactHeight, player.z - 0.58);
    targetQuat.setFromEuler(new THREE.Euler(0.16, -0.25, -0.18, 'YXZ'));
  } else if (strokeState === 'prepared') {
    prepAge += dt;
    prepCharge = clamp(prepCharge + dt * 0.23, 0, 1);
    if (prepAge > 2.2) cancelPreparation();

    if (prepSide === 'forehand') {
      racketTarget.set(player.x + 0.92, contactHeight, player.z + 0.05);
      targetQuat.setFromEuler(new THREE.Euler(0.12, -1.02, -0.34, 'YXZ'));
    } else {
      racketTarget.set(player.x - 0.76, contactHeight, player.z + 0.04);
      targetQuat.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));
    }
  } else if (strokeState === 'swing') {
    swingPhase = clamp(swingPhase + dt / swingDuration, 0, 1);
    const e = 1 - (1 - swingPhase) ** 3;
    const contactP = clamp(e / 0.58, 0, 1);
    const followP = clamp((e - 0.58) / 0.42, 0, 1);
    const rise = swingLift * Math.sin(Math.PI * clamp(e, 0, 1)) * 0.5 + Math.max(0, swingLift) * e * 0.38;

    if (prepSide === 'forehand') {
      if (e < 0.58) {
        racketTarget.set(
          THREE.MathUtils.lerp(player.x + 0.92, player.x + 0.2, contactP),
          contactHeight + rise,
          THREE.MathUtils.lerp(player.z + 0.05, player.z - 0.82, contactP),
        );
        qa.setFromEuler(new THREE.Euler(0.12, -1.02, -0.34, 'YXZ'));
        qb.setFromEuler(new THREE.Euler(0.06 - swingLift * 0.12, -0.08, -0.06, 'YXZ'));
        targetQuat.slerpQuaternions(qa, qb, contactP);
      } else {
        racketTarget.set(
          THREE.MathUtils.lerp(player.x + 0.2, player.x - 0.54, followP),
          contactHeight + rise + followP * 0.22,
          THREE.MathUtils.lerp(player.z - 0.82, player.z - 0.62, followP),
        );
        qa.setFromEuler(new THREE.Euler(0.06, -0.08, -0.06, 'YXZ'));
        qb.setFromEuler(new THREE.Euler(-0.12, 0.72, 0.42, 'YXZ'));
        targetQuat.slerpQuaternions(qa, qb, followP);
      }
    } else if (e < 0.58) {
      racketTarget.set(
        THREE.MathUtils.lerp(player.x - 0.76, player.x - 0.04, contactP),
        contactHeight + rise,
        THREE.MathUtils.lerp(player.z + 0.04, player.z - 0.82, contactP),
      );
      qa.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));
      qb.setFromEuler(new THREE.Euler(0.06 - swingLift * 0.12, 0.08, 0.05, 'YXZ'));
      targetQuat.slerpQuaternions(qa, qb, contactP);
    } else {
      racketTarget.set(
        THREE.MathUtils.lerp(player.x - 0.04, player.x + 0.62, followP),
        contactHeight + rise + followP * 0.22,
        THREE.MathUtils.lerp(player.z - 0.82, player.z - 0.62, followP),
      );
      qa.setFromEuler(new THREE.Euler(0.06, 0.08, 0.05, 'YXZ'));
      qb.setFromEuler(new THREE.Euler(-0.1, -0.7, -0.4, 'YXZ'));
      targetQuat.slerpQuaternions(qa, qb, followP);
    }

    if (swingPhase >= 1) {
      strokeState = 'recover';
      recoverPhase = 0;
    }
  } else if (strokeState === 'recover') {
    recoverPhase = clamp(recoverPhase + dt / 0.24, 0, 1);
    const p = 1 - (1 - recoverPhase) ** 2;
    const readyPos = new THREE.Vector3(player.x + 0.42, contactHeight, player.z - 0.58);
    racketTarget.lerp(readyPos, p);
    qa.copy(targetQuat);
    qb.setFromEuler(new THREE.Euler(0.16, -0.25, -0.18, 'YXZ'));
    targetQuat.slerpQuaternions(qa, qb, p);
    if (recoverPhase >= 1) cancelPreparation();
  }

  playerRacket.position.lerp(racketTarget, 1 - Math.exp(-26 * dt));
  playerRacket.quaternion.slerp(targetQuat, 1 - Math.exp(-24 * dt));
  racketV.copy(playerRacket.position).sub(prevRacket).divideScalar(Math.max(dt, 0.001));
  prevRacket.copy(playerRacket.position);

  sweepEndPos.copy(playerRacket.position);
  sweepEndQuat.copy(playerRacket.quaternion);
  mouseVX *= Math.exp(-8.5 * dt);
  mouseVY *= Math.exp(-8.5 * dt);
  rawMouseVX *= Math.exp(-10 * dt);
  racketSpeedEl.textContent = `${Math.min(40, racketV.length()).toFixed(1)} m/s`;
}

function updateBall(dt) {
  ball.cooldown = Math.max(0, ball.cooldown - dt);
  aiCooldown = Math.max(0, aiCooldown - dt);
  if (!ball.active) {
    ball.reset -= dt;
    if (started && ball.reset <= 0) serveAI();
    return;
  }

  ball.prev.copy(ball.p);
  const speed = ball.v.length();
  if (speed) {
    ball.v.addScaledVector(ball.v.clone().multiplyScalar(-0.0105 * speed), dt);
    ball.v.addScaledVector(ball.spin.clone().cross(ball.v).multiplyScalar(0.00038), dt);
  }
  ball.v.y += -9.81 * dt;
  ball.spin.multiplyScalar(Math.exp(-0.09 * dt));
  ball.p.addScaledVector(ball.v, dt);

  if (ball.prev.z * ball.p.z <= 0 && ball.p.y < C.net + C.ballR && Math.abs(ball.p.x) < C.halfW + 0.25) {
    ball.p.z = Math.sign(ball.prev.z || 1) * 0.09;
    ball.v.z *= -0.24;
    ball.v.x *= 0.72;
    ball.v.y *= 0.55;
    message('File');
  }

  if (ball.p.y <= C.ballR && ball.v.y < 0) {
    ball.p.y = C.ballR;
    ball.v.y *= -0.72;
    ball.v.x *= 0.88;
    ball.v.z *= 0.9;
    ball.spin.multiplyScalar(0.82);
    ball.bounces += 1;
    if (Math.abs(ball.p.x) > C.halfW || Math.abs(ball.p.z) > C.halfL) return reset('Aut');
    if (ball.bounces >= 2) return reset('İkinci sekme');
  }

  if (ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > 8.5 && (strokeState === 'swing' || strokeState === 'prepared')) {
    const c = racketContact();
    if (c) hitPlayer(c);
  }

  if (ball.hitter === 'player' && ball.v.z < 0 && ball.p.z < -9.0 && ball.p.y > 0.3 && ball.p.y < 3.2) {
    hitAI();
  }

  if (Math.abs(ball.p.z) > 16.4 || Math.abs(ball.p.x) > 8.6 || ball.p.y < -1) return reset('Yeni ralli');
  trailPts.push(ball.p.clone());
  if (trailPts.length > 26) trailPts.shift();
  trailGeo.setFromPoints(trailPts);
}

function updateAI(dt) {
  const x = ball.active && ball.p.z < 2 ? clamp(ball.p.x, -3.25, 3.25) : 0;
  opponent.position.x = THREE.MathUtils.lerp(opponent.position.x, x, 1 - Math.exp(-4.8 * dt));
  aiRacket.position.x = THREE.MathUtils.lerp(aiRacket.position.x, x + 0.32, 1 - Math.exp(-5.8 * dt));
  aiRacket.position.y = THREE.MathUtils.lerp(
    aiRacket.position.y,
    ball.active && ball.p.z < -3 ? clamp(ball.p.y, 0.95, 1.75) : 1.12,
    1 - Math.exp(-5 * dt),
  );
  const s = ball.hitter === 'player' && ball.p.z < -6.8 ? 0.6 : 0;
  aiRacket.rotation.y = Math.PI - 0.25 + Math.sin(performance.now() * 0.011) * s;
}

function updateCamera(dt) {
  const moving = Math.hypot(player.vx, player.vz);
  const bob = moving > 0.4 ? Math.sin(performance.now() * 0.013) * 0.012 : 0;
  const desired = new THREE.Vector3(player.x, 1.78 + bob, player.z + 1.48);
  camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
  camera.lookAt(player.x * 0.13, 1.05, -2.1);
}

function sync() {
  ballMesh.position.copy(ball.p);
  ballShadow.position.set(ball.p.x, 0.035, ball.p.z);
  const a = clamp(ball.p.y, 0, 4);
  ballShadow.scale.setScalar(1 + a * 0.16);
  ballShadow.material.opacity = 0.28 / (1 + a * 0.72);
  ballSpeedEl.textContent = `${Math.round(ball.v.length() * 3.6)} km/h`;
  spinValueEl.textContent = `${rpm()} rpm`;
}

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  const now = performance.now();
  const dt = Math.max(0.008, (now - lastMouse) / 1000);
  lastMouse = now;
  const dx = e.movementX;
  const dy = e.movementY;

  rawMouseVX = clamp(dx / dt, -2200, 2200);
  mouseVX = clamp(dx * 0.0065 / dt, -34, 34);
  mouseVY = clamp(-dy * 0.0058 / dt, -34, 34);
  contactHeight = clamp(contactHeight - dy * 0.0046, 0.76, 2.02);

  if (strokeState === 'ready') {
    prepIntent = clamp(prepIntent + dx, -70, 70);
    if (prepIntent > 22) beginPreparation('forehand');
    else if (prepIntent < -22) beginPreparation('backhand');
  } else if (strokeState === 'prepared') {
    const sameDirection = prepSide === 'forehand' ? dx > 0 : dx < 0;
    const releaseDirection = prepSide === 'forehand' ? dx < 0 : dx > 0;
    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.008, 0, 1);
    if (releaseDirection && Math.abs(rawMouseVX) > 310) beginSwing();
  } else if (strokeState === 'swing') {
    swingLift = clamp(swingLift * 0.82 + mouseVY / 18 * 0.18, -0.32, 0.76);
  }
});

function lock() {
  const p = canvas.requestPointerLock({ unadjustedMovement: true });
  if (p?.catch) p.catch(() => canvas.requestPointerLock());
}

startButton.addEventListener('click', () => {
  started = true;
  lock();
});
canvas.addEventListener('click', () => {
  if (started && document.pointerLockElement !== canvas) lock();
});
document.addEventListener('pointerlockchange', () => {
  const l = document.pointerLockElement === canvas;
  startScreen.classList.toggle('hidden', l);
  startButton.textContent = started ? 'Devam et' : 'Korta çık';
});
document.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') reset('Yeni top');
  if (e.code === 'Space' && strokeState === 'prepared') beginSwing();
});
document.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let acc = 0;
const STEP = 1 / 120;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  acc += dt;

  while (acc >= STEP) {
    updatePlayer(STEP);
    updateStroke(STEP);
    updateAI(STEP);
    updateBall(STEP);
    acc -= STEP;
  }

  updateCamera(dt);
  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.classList.remove('visible');
  }
  sync();
  renderer.render(scene, camera);
}

setStance('READY');
ballMesh.position.copy(ball.p);
animate();