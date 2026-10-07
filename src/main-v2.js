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
const clamp = THREE.MathUtils.clamp;

const C = { halfL: 11.885, halfW: 5.485, net: 0.914, ballR: 0.067, playerZ: 12.05, aiZ: -11.0 };
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc9df);
scene.fog = new THREE.Fog(0x9fc9df, 34, 70);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 1.78, 14.0);
camera.lookAt(0, 1.08, -2.0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
scene.add(new THREE.HemisphereLight(0xe8f7ff, 0x48624c, 2.2));
const sun = new THREE.DirectionalLight(0xfff7df, 3.0);
sun.position.set(-8, 17, 9);
sun.castShadow = true;
scene.add(sun);

function mesh(geo, mat, pos, parent = scene) {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function box(x, y, z, px, py, pz, color, parent = scene) {
  return mesh(
    new THREE.BoxGeometry(x, y, z),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
    new THREE.Vector3(px, py, pz),
    parent,
  );
}

function createCourt() {
  box(26, 0.18, 42, 0, -0.13, 0, 0x4b7656);
  box(C.halfW * 2, 0.04, C.halfL * 2, 0, 0, 0, 0x2b7895);
  const lm = new THREE.MeshStandardMaterial({ color: 0xf8f6e8, roughness: 0.8 });
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
    new THREE.MeshBasicMaterial({ color: 0xe8eee9, transparent: true, opacity: 0.38, wireframe: true, side: THREE.DoubleSide }),
    new THREE.Vector3(0, C.net / 2, 0),
  );
  box(C.halfW * 2 + 0.8, 0.05, 0.055, 0, C.net, 0, 0xf7f3e7);
  for (const x of [-C.halfW - 0.4, C.halfW + 0.4]) {
    mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 1.08, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8ded9 }),
      new THREE.Vector3(x, 0.54, 0),
    );
  }

  const fm = new THREE.MeshBasicMaterial({ color: 0x385648, transparent: true, opacity: 0.22, wireframe: true });
  for (const z of [-15.6, 15.6]) {
    mesh(new THREE.PlaneGeometry(18, 3.6, 36, 8), fm, new THREE.Vector3(0, 1.8, z));
  }
  for (const x of [-8.8, 8.8]) {
    const f = mesh(new THREE.PlaneGeometry(31.2, 3.6, 58, 8), fm, new THREE.Vector3(x, 1.8, 0));
    f.rotation.y = Math.PI / 2;
  }
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
  const sm = new THREE.LineBasicMaterial({ color: 0xeaf0eb, transparent: true, opacity: 0.68 });
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
  const shirt = new THREE.MeshStandardMaterial({ color: 0x243d67 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe7e9eb });
  mesh(new THREE.SphereGeometry(0.105, 16, 12), skin, new THREE.Vector3(0, 1.72, 0), g);
  mesh(new THREE.CapsuleGeometry(0.18, 0.43, 5, 10), shirt, new THREE.Vector3(0, 1.32, 0), g);
  mesh(new THREE.BoxGeometry(0.34, 0.22, 0.22), white, new THREE.Vector3(0, 0.91, 0), g);
  for (const x of [-0.11, 0.11]) {
    mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.58, 10), skin, new THREE.Vector3(x, 0.5, 0), g);
  }
  g.position.set(0, 0, C.aiZ);
  g.rotation.y = Math.PI;
  scene.add(g);
  return g;
}

createCourt();
const playerRacket = createRacket();
playerRacket.position.set(0.48, 1.16, C.playerZ - 0.3);
playerRacket.rotation.set(0.16, -0.3, -0.22);
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
  new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.24, depthWrite: false }),
  new THREE.Vector3(0, 0.035, 0),
);
ballShadow.rotation.x = -Math.PI / 2;

const trailGeo = new THREE.BufferGeometry();
const trailPts = [];
scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xe8ff9f, transparent: true, opacity: 0.23 })));

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

const racketTarget = new THREE.Vector3(0.48, 1.16, C.playerZ - 0.3);
const prevRacket = playerRacket.position.clone();
const racketV = new THREE.Vector3();
const targetEuler = new THREE.Euler(0.16, -0.3, -0.22, 'YXZ');
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

let mouseVX = 0;
let mouseVY = 0;
let lastMouse = performance.now();
let swingDepth = 0;
let started = false;
let rally = 0;
let aiCooldown = 0;
let msgTimer = 0;

function message(t, s = 0.7) {
  messageEl.textContent = t;
  messageEl.classList.add('visible');
  msgTimer = s;
}

function rpm() {
  return Math.round(Math.abs(ball.spin.x) * 60 / (Math.PI * 2));
}

function serveAI() {
  const tx = THREE.MathUtils.randFloat(-2.5, 2.5);
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

function racketContact() {
  const rx = playerRacket.userData.rx + C.ballR + 0.025;
  const ry = playerRacket.userData.ry + C.ballR + 0.025;
  const rz = C.ballR + 0.05;
  let best = null;

  // Sweep both the ball and racket pose through the physics step. This prevents
  // fast mouse swings from jumping from one side of the ball to the other.
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
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
    best = {
      e,
      x: contactLocal.x,
      y: contactLocal.y,
      q: clamp(1 - Math.sqrt(faceE) * 0.72, 0, 1),
    };
  }

  return best;
}

function hitPlayer(c) {
  if (ball.cooldown || ball.hitter === 'player') return;
  const speed = clamp(racketV.length(), 0, 38);
  const up = clamp(racketV.y, -10, 20);
  const lat = clamp(racketV.x, -18, 18);
  const fwd = clamp(-racketV.z, -8, 22);
  const n = new THREE.Vector3(0, 0, -1).applyQuaternion(playerRacket.quaternion).normalize();
  if (n.z > 0) n.multiplyScalar(-1);

  const q = 0.58 + c.q * 0.42;
  const exit = clamp((9.8 + speed * 0.58 + Math.max(0, fwd) * 0.2 + Math.max(0, ball.v.z) * 0.028) * q, 9.5, 34.5);
  const dir = new THREE.Vector3(
    clamp(n.x * 0.86 + lat * 0.02 + c.x * 0.8, -0.64, 0.64),
    clamp(0.1 + n.y * 0.24 + up * 0.016, 0.045, 0.48),
    -1,
  ).normalize();
  ball.v.copy(dir.multiplyScalar(exit));

  const r = clamp(420 + Math.max(0, up) * 155 + Math.abs(lat) * 14, 300, 3900);
  ball.spin.set(-r * Math.PI * 2 / 60, lat * 0.12, -lat * 0.42);
  ball.hitter = 'player';
  ball.cooldown = 0.16;
  ball.bounces = 0;
  rally += 1;
  rallyEl.textContent = rally;
  shotTypeEl.textContent = c.q < 0.25 ? 'Mishit' : r > 1900 ? 'Topspin' : up < -1.5 ? 'Slice' : speed > 15 ? 'Flat / drive' : 'Kontrollü';
  message(c.q > 0.62 ? 'Sweet spot' : 'Temas', 0.4);
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

  const target = new THREE.Vector3(
    THREE.MathUtils.randFloat(-2.7, 2.7),
    C.ballR + 0.02,
    THREE.MathUtils.randFloat(7.8, 9.6),
  );
  const flight = THREE.MathUtils.randFloat(1.08, 1.24);
  const initialV = new THREE.Vector3(
    (target.x - ball.p.x) / flight,
    (target.y - ball.p.y + 0.5 * 9.81 * flight * flight) / flight,
    (target.z - ball.p.z) / flight,
  );
  const r = THREE.MathUtils.randFloat(650, 1150);
  const spin = new THREE.Vector3(r * Math.PI * 2 / 60, 0, THREE.MathUtils.randFloatSpread(8));

  // Account for our drag + Magnus model and guarantee a useful net margin.
  const desiredNetHeight = C.net + C.ballR + 0.48;
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

function updateRacket(dt) {
  sweepStartPos.copy(playerRacket.position);
  sweepStartQuat.copy(playerRacket.quaternion);

  swingDepth *= Math.exp(-7.5 * dt);
  racketTarget.z = C.playerZ - 0.3 - swingDepth;
  playerRacket.position.lerp(racketTarget, 1 - Math.exp(-18 * dt));
  racketV.copy(playerRacket.position).sub(prevRacket).divideScalar(Math.max(dt, 0.001));
  prevRacket.copy(playerRacket.position);

  const g = clamp(Math.hypot(mouseVX, mouseVY) / 24, 0, 1);
  targetEuler.set(
    0.16 + clamp(mouseVY * 0.018, -0.48, 0.48),
    -0.28 + clamp(-mouseVX * 0.035, -1.05, 1.05),
    -0.22 + clamp(-mouseVY * 0.022 - mouseVX * 0.012, -0.75, 0.75),
  );
  targetQuat.setFromEuler(targetEuler);
  playerRacket.quaternion.slerp(targetQuat, 1 - Math.exp(-(8 + g * 8) * dt));

  sweepEndPos.copy(playerRacket.position);
  sweepEndQuat.copy(playerRacket.quaternion);
  mouseVX *= Math.exp(-9.5 * dt);
  mouseVY *= Math.exp(-9.5 * dt);
  racketSpeedEl.textContent = `${Math.min(38, racketV.length()).toFixed(1)} m/s`;
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

  if (ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > 8.7) {
    const c = racketContact();
    if (c) hitPlayer(c);
  }

  if (ball.hitter === 'player' && ball.v.z < 0 && ball.p.z < -9.0 && ball.p.y > 0.3 && ball.p.y < 3.2) {
    hitAI();
  }

  if (Math.abs(ball.p.z) > 16.2 || Math.abs(ball.p.x) > 8.5 || ball.p.y < -1) return reset('Yeni ralli');
  trailPts.push(ball.p.clone());
  if (trailPts.length > 24) trailPts.shift();
  trailGeo.setFromPoints(trailPts);
}

function updateAI(dt) {
  const x = ball.active && ball.p.z < 2 ? clamp(ball.p.x, -3.1, 3.1) : 0;
  opponent.position.x = THREE.MathUtils.lerp(opponent.position.x, x, 1 - Math.exp(-4.5 * dt));
  aiRacket.position.x = THREE.MathUtils.lerp(aiRacket.position.x, x + 0.32, 1 - Math.exp(-5.5 * dt));
  aiRacket.position.y = THREE.MathUtils.lerp(
    aiRacket.position.y,
    ball.active && ball.p.z < -3 ? clamp(ball.p.y, 0.95, 1.7) : 1.12,
    1 - Math.exp(-5 * dt),
  );
  const s = ball.hitter === 'player' && ball.p.z < -6.8 ? 0.6 : 0;
  aiRacket.rotation.y = Math.PI - 0.25 + Math.sin(performance.now() * 0.011) * s;
}

function sync() {
  ballMesh.position.copy(ball.p);
  ballShadow.position.set(ball.p.x, 0.035, ball.p.z);
  const a = clamp(ball.p.y, 0, 4);
  ballShadow.scale.setScalar(1 + a * 0.16);
  ballShadow.material.opacity = 0.24 / (1 + a * 0.72);
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
  racketTarget.x = clamp(racketTarget.x + dx * 0.0065, -1.55, 1.75);
  racketTarget.y = clamp(racketTarget.y - dy * 0.0058, 0.72, 2.05);
  mouseVX = clamp(dx * 0.0065 / dt, -32, 32);
  mouseVY = clamp(-dy * 0.0058 / dt, -32, 32);
  swingDepth = Math.max(swingDepth, clamp((Math.hypot(mouseVX, mouseVY) - 2) * 0.032, 0, 0.82));
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
  if (e.code === 'KeyR') reset('Yeni top');
});
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

  // Racket, opponent and ball now advance on the same fixed clock. This keeps
  // high-speed racket motion aligned with collision detection.
  while (acc >= STEP) {
    updateRacket(STEP);
    updateAI(STEP);
    updateBall(STEP);
    acc -= STEP;
  }

  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) messageEl.classList.remove('visible');
  }
  sync();
  renderer.render(scene, camera);
}

ballMesh.position.copy(ball.p);
animate();
