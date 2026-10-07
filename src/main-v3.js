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
const timingGuide = $('#timingGuide');
const timingLabel = $('#timingLabel');
const timingHint = $('#timingHint');
const clamp = THREE.MathUtils.clamp;

const C = {
  halfL: 11.885,
  halfW: 5.485,
  net: 0.914,
  ballR: 0.067,
  aiZ: -11.0,
  contactZOffset: 0.94,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1b33);
scene.fog = new THREE.Fog(0x0c1b33, 42, 92);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.05, 120);
camera.position.set(0, 1.78, 14.25);
camera.lookAt(0, 1.05, -2.0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

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
    new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.88,
      metalness: opts.metalness ?? 0,
    }),
    new THREE.Vector3(px, py, pz),
    parent,
  );
}

function createSignTexture(lines) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#07162f';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#2f72c6';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = '#f7fbff';
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

  mesh(
    new THREE.PlaneGeometry(6.8, 1.7),
    new THREE.MeshBasicMaterial({ map: createSignTexture(['NEW YORK', 'NIGHT SESSION']), side: THREE.DoubleSide }),
    new THREE.Vector3(0, 5.1, -20),
  );

  const target = new THREE.Object3D();
  scene.add(target);
  for (const [x, z] of [[-10, -13], [10, -13], [-10, 13], [10, 13]]) {
    box(0.18, 8.2, 0.18, x, 4.1, z, 0x4f6075, scene, { metalness: 0.65, roughness: 0.45 });
    box(2.5, 0.14, 0.35, x, 8.0, z, 0x72839a, scene, { metalness: 0.7, roughness: 0.35 });
    const light = new THREE.SpotLight(0xe8f4ff, 115, 55, Math.PI / 4.2, 0.5, 1.1);
    light.position.set(x, 7.9, z);
    light.target = target;
    scene.add(light);
  }

  const seats = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 49; col += 1) {
        if (Math.random() < 0.22) continue;
        seats.push({ x: side * (7.95 + row * 0.5), y: 0.58 + row * 0.38, z: -13.1 + col * 0.55 });
      }
    }
  }
  for (const end of [-1, 1]) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 27; col += 1) {
        if (Math.random() < 0.25) continue;
        seats.push({ x: -7.15 + col * 0.55, y: 0.58 + row * 0.38, z: end * (15.05 + row * 0.48) });
      }
    }
  }

  const headGeo = new THREE.SphereGeometry(0.065, 7, 6);
  const bodyGeo = new THREE.BoxGeometry(0.16, 0.24, 0.12);
  const heads = new THREE.InstancedMesh(
    headGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true }),
    seats.length,
  );
  const bodies = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true }),
    seats.length,
  );
  const dummy = new THREE.Object3D();
  const shirts = [0x2563a9, 0xf4f4f2, 0xb52f42, 0xe0b43a, 0x20334d, 0x4b8b68, 0x8c56a8];
  const skins = [0xf0c39a, 0xd89b6a, 0xb9784f, 0x8d5d3e, 0xf5d3b4];
  seats.forEach((seat, i) => {
    dummy.position.set(seat.x, seat.y, seat.z);
    dummy.rotation.y = Math.abs(seat.x) > 7.5 ? (seat.x > 0 ? -Math.PI / 2 : Math.PI / 2) : (seat.z < 0 ? 0 : Math.PI);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, new THREE.Color(shirts[Math.floor(Math.random() * shirts.length)]));
    dummy.position.y += 0.19;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(skins[Math.floor(Math.random() * skins.length)]));
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

const player = { x: 0, z: 12.85, vx: 0, vz: 0, speed: 5.15 };
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
  reset: 0.35,
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

let started = false;
let rally = 0;
let aiCooldown = 0;
let msgTimer = 0;
let recoveryTimer = 0;
let lastTimingGrade = '';

const swing = {
  state: 'ready',
  side: null,
  phase: 0,
  duration: 0.34,
  power: 0,
  lift: 0,
  speed: 0,
  angle: 0,
  aim: 0,
  anchor: new THREE.Vector3(),
  start: new THREE.Vector3(),
  follow: new THREE.Vector3(),
  startQuat: new THREE.Quaternion(),
  contactQuat: new THREE.Quaternion(),
  followQuat: new THREE.Quaternion(),
};

const gesture = {
  held: false,
  x: 0,
  y: 0,
  distance: 0,
  startedAt: 0,
  lastAt: 0,
  side: null,
  samples: [],
};

function message(text, seconds = 0.7) {
  messageEl.textContent = text;
  messageEl.classList.add('visible');
  msgTimer = seconds;
}

function setStance(text, side = '') {
  stanceEl.textContent = text;
  stanceEl.dataset.side = side;
}

function rpm() {
  return Math.round(Math.abs(ball.spin.x) * 60 / (Math.PI * 2));
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

function predictPlayerContact(maxT = 1.15) {
  if (!ball.active || ball.hitter !== 'ai' || ball.v.z <= 0) return null;
  const p = ball.p.clone();
  const v = ball.v.clone();
  const spin = ball.spin.clone();
  const contactZ = player.z - C.contactZOffset;
  const previous = p.clone();
  const step = 1 / 120;
  if (p.z >= contactZ) return { t: 0, point: p.clone(), lateral: p.x - player.x };

  const steps = Math.ceil(maxT / step);
  for (let i = 1; i <= steps; i += 1) {
    previous.copy(p);
    integratePreview(p, v, spin, step);
    if (previous.z < contactZ && p.z >= contactZ) {
      const ratio = clamp((contactZ - previous.z) / Math.max(0.0001, p.z - previous.z), 0, 1);
      const point = previous.clone().lerp(p, ratio);
      return { t: (i - 1 + ratio) * step, point, lateral: point.x - player.x };
    }
  }
  return null;
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
      const ratio = clamp((0 - previousZ) / Math.max(0.0001, p.z - previousZ), 0, 1);
      return THREE.MathUtils.lerp(previousY, p.y, ratio);
    }
    previousZ = p.z;
  }
  return -Infinity;
}

function serveAI() {
  const tx = clamp(player.x + THREE.MathUtils.randFloat(-3.3, 3.3), -3.9, 3.9);
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

function reset(text) {
  ball.active = false;
  ball.v.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.reset = 0.72;
  rally = 0;
  rallyEl.textContent = 0;
  message(text);
}

function beginGesture() {
  if (swing.state !== 'ready' || recoveryTimer > 0) return;
  gesture.held = true;
  gesture.x = 0;
  gesture.y = 0;
  gesture.distance = 0;
  gesture.startedAt = performance.now();
  gesture.lastAt = gesture.startedAt;
  gesture.side = null;
  gesture.samples.length = 0;
  swing.state = 'drawing';
  setStance('SWING ÇİZ');
}

function cancelGesture() {
  gesture.held = false;
  gesture.samples.length = 0;
  gesture.side = null;
  swing.state = 'ready';
  recoveryTimer = 0.12;
  setStance('READY');
}

function recordGesture(dx, dy) {
  if (!gesture.held || swing.state !== 'drawing') return;
  const now = performance.now();
  const dt = Math.max(1, now - gesture.lastAt);
  gesture.lastAt = now;

  if (Math.abs(dx) < 0.45) dx = 0;
  if (Math.abs(dy) < 0.45) dy = 0;
  gesture.x = clamp(gesture.x + dx, -180, 180);
  gesture.y = clamp(gesture.y - dy, -150, 150);
  gesture.distance += Math.hypot(dx, dy);
  gesture.samples.push({ dx, dy: -dy, dt, at: now });
  while (gesture.samples.length > 28 || (gesture.samples[0] && now - gesture.samples[0].at > 220)) gesture.samples.shift();

  if (!gesture.side && Math.abs(gesture.x) > 18) {
    gesture.side = gesture.x > 0 ? 'forehand' : 'backhand';
  }

  const sideText = gesture.side === 'forehand' ? 'FOREHAND' : gesture.side === 'backhand' ? 'BACKHAND' : 'YÖN';
  const angle = Math.atan2(gesture.y, Math.max(1, Math.abs(gesture.x))) * 180 / Math.PI;
  const style = angle > 18 ? 'TOPSPIN' : angle < -18 ? 'SLICE' : 'FLAT';
  setStance(`${sideText} · ${style}`, gesture.side || '');
}

function analyseGesture() {
  if (!gesture.samples.length) return null;
  const now = performance.now();
  const recent = gesture.samples.filter((s) => now - s.at <= 180);
  const samples = recent.length ? recent : gesture.samples;
  let dx = 0;
  let dy = 0;
  let ms = 0;
  let distance = 0;
  for (const s of samples) {
    dx += s.dx;
    dy += s.dy;
    ms += s.dt;
    distance += Math.hypot(s.dx, s.dy);
  }
  if (distance < 12) return null;

  const side = gesture.side || (dx >= 0 ? 'forehand' : 'backhand');
  const horizontal = Math.max(10, Math.abs(dx));
  const lift = clamp(dy / horizontal, -1.15, 1.25);
  const speedPx = distance / Math.max(0.04, ms / 1000);
  const power = clamp((speedPx - 180) / 1250, 0.18, 1);
  const angle = Math.atan2(dy, Math.max(1, Math.abs(dx)));
  const aim = clamp(dx / Math.max(26, distance), -0.72, 0.72);
  return { side, lift, speedPx, power, angle, aim, dx, dy, distance };
}

function commitGestureSwing() {
  if (!gesture.held || swing.state !== 'drawing') return;
  gesture.held = false;
  const g = analyseGesture();
  if (!g || gesture.distance < 24) {
    cancelGesture();
    message('Daha belirgin bir swing çiz', 0.65);
    return;
  }

  const prediction = predictPlayerContact(0.9);
  const reachable = prediction && Math.abs(prediction.lateral) <= 1.02 && prediction.point.y >= 0.48 && prediction.point.y <= 2.2;
  const defaultX = player.x + (g.side === 'forehand' ? 0.2 : -0.15);
  swing.anchor.set(
    reachable ? clamp(prediction.point.x, player.x - 0.78, player.x + 0.78) : defaultX,
    reachable ? clamp(prediction.point.y, 0.72, 1.95) : 1.16,
    player.z - C.contactZOffset,
  );

  swing.side = g.side;
  swing.power = g.power;
  swing.lift = g.lift;
  swing.speed = g.speedPx;
  swing.angle = g.angle;
  swing.aim = g.aim;
  swing.phase = 0;
  swing.state = 'swing';

  const side = g.side === 'forehand' ? 1 : -1;
  const verticalStart = clamp(-g.lift * 0.18, -0.22, 0.22);
  swing.start.set(
    player.x + side * 0.72,
    swing.anchor.y + verticalStart,
    player.z - 0.28,
  );
  swing.follow.set(
    player.x - side * (0.42 + 0.18 * g.power),
    swing.anchor.y + clamp(g.lift * 0.42, -0.3, 0.5),
    player.z - 0.58,
  );

  const startYaw = g.side === 'forehand' ? -0.78 : 0.7;
  const followYaw = g.side === 'forehand' ? 0.62 : -0.62;
  swing.startQuat.setFromEuler(new THREE.Euler(0.11, startYaw, g.side === 'forehand' ? -0.26 : 0.22, 'YXZ'));
  const contactPitch = clamp(-g.lift * 0.1, -0.16, 0.12);
  const contactYaw = clamp(g.aim * 0.28, -0.18, 0.18);
  const contactRoll = clamp(g.angle * 0.16, -0.22, 0.22);
  swing.contactQuat.setFromEuler(new THREE.Euler(contactPitch, contactYaw, contactRoll, 'YXZ'));
  swing.followQuat.setFromEuler(new THREE.Euler(-0.08, followYaw, g.side === 'forehand' ? 0.36 : -0.36, 'YXZ'));

  const naturalDuration = THREE.MathUtils.lerp(0.44, 0.22, g.power);
  if (reachable && prediction.t >= 0.09 && prediction.t <= 0.62) {
    const aligned = clamp(prediction.t / 0.56, 0.22, 0.82);
    swing.duration = THREE.MathUtils.lerp(naturalDuration, aligned, 0.62);
    lastTimingGrade = prediction.t > 0.46 ? 'ERKEN' : prediction.t < 0.13 ? 'GEÇ' : 'İYİ';
  } else {
    swing.duration = naturalDuration;
    lastTimingGrade = prediction ? (prediction.t > 0.62 ? 'ERKEN' : 'GEÇ') : '';
  }

  const style = g.lift > 0.32 ? 'TOPSPIN' : g.lift < -0.28 ? 'SLICE' : 'FLAT';
  setStance(`${g.side === 'forehand' ? 'FOREHAND' : 'BACKHAND'} · ${style}`, g.side);
}

function racketContact() {
  const assist = swing.state === 'swing' ? 0.06 : 0;
  const rx = playerRacket.userData.rx + C.ballR + 0.03 + assist;
  const ry = playerRacket.userData.ry + C.ballR + 0.03 + assist * 0.8;
  const rz = C.ballR + 0.055 + assist * 0.65;
  let best = null;

  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    contactBall.copy(ball.prev).lerp(ball.p, t);
    contactRacket.copy(sweepStartPos).lerp(sweepEndPos, t);
    contactQuat.copy(sweepStartQuat).slerp(sweepEndQuat, t);
    contactInvQuat.copy(contactQuat).invert();
    contactLocal.copy(contactBall).sub(contactRacket).applyQuaternion(contactInvQuat);
    const e = (contactLocal.x / rx) ** 2 + (contactLocal.y / ry) ** 2 + (contactLocal.z / rz) ** 2;
    if (e > 1 || (best && e >= best.e)) continue;
    const faceE =
      (contactLocal.x / (playerRacket.userData.rx + C.ballR * 0.5)) ** 2 +
      (contactLocal.y / (playerRacket.userData.ry + C.ballR * 0.5)) ** 2;
    best = { e, x: contactLocal.x, y: contactLocal.y, q: clamp(1 - Math.sqrt(faceE) * 0.68, 0, 1) };
  }
  return best;
}

function hitPlayer(c) {
  if (ball.cooldown || ball.hitter === 'player') return;
  const speed = clamp(racketV.length(), 0, 42);
  const q = 0.56 + c.q * 0.44;
  const exit = clamp((10.2 + speed * 0.72 + swing.power * 7.5) * q, 10, 38);
  const horizontalAim = clamp(swing.aim * 0.36 + c.x * 0.7, -0.62, 0.62);
  const vertical = clamp(0.12 + swing.lift * 0.085 + Math.max(0, racketV.y) * 0.008, 0.035, 0.36);
  const dir = new THREE.Vector3(horizontalAim, vertical, -1).normalize();
  ball.v.copy(dir.multiplyScalar(exit));

  const liftAbs = Math.abs(swing.lift);
  const rpmValue = clamp(480 + liftAbs * 2800 + swing.power * 650, 350, 4100);
  const spinSign = swing.lift >= -0.08 ? -1 : 1;
  ball.spin.set(spinSign * rpmValue * Math.PI * 2 / 60, swing.aim * 12, -swing.aim * 22);
  ball.hitter = 'player';
  ball.cooldown = 0.17;
  ball.bounces = 0;
  rally += 1;
  rallyEl.textContent = rally;

  const sideName = swing.side === 'backhand' ? 'Backhand' : 'Forehand';
  const style = swing.lift > 0.32 ? 'topspin' : swing.lift < -0.28 ? 'slice' : speed > 15 ? 'drive' : 'flat';
  shotTypeEl.textContent = `${sideName} ${style}`;
  const timingText = lastTimingGrade ? ` · zamanlama ${lastTimingGrade.toLowerCase()}` : '';
  message((c.q > 0.62 ? `${sideName} · sweet spot` : `${sideName} · temas`) + timingText, 0.7);
  lastTimingGrade = '';
}

function hitAI() {
  if (aiCooldown || ball.hitter === 'ai') return;
  const wide = Math.random() < 0.58;
  const targetX = wide
    ? clamp(player.x + (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(1.6, 3.5), -4, 4)
    : clamp(player.x + THREE.MathUtils.randFloat(-0.9, 0.9), -3.8, 3.8);
  const target = new THREE.Vector3(targetX, C.ballR + 0.02, THREE.MathUtils.randFloat(7.9, 10.1));
  const flight = THREE.MathUtils.randFloat(1.08, 1.25);
  const initialV = new THREE.Vector3(
    (target.x - ball.p.x) / flight,
    (target.y - ball.p.y + 0.5 * 9.81 * flight * flight) / flight,
    (target.z - ball.p.z) / flight,
  );
  const r = THREE.MathUtils.randFloat(650, 1150);
  const spin = new THREE.Vector3(r * Math.PI * 2 / 60, 0, THREE.MathUtils.randFloatSpread(8));
  const desiredNetHeight = C.net + C.ballR + 0.52;
  for (let i = 0; i < 4; i += 1) {
    const h = predictedNetHeight(initialV, spin);
    if (h >= desiredNetHeight) break;
    initialV.y += clamp((desiredNetHeight - h) * 1.35, 0.2, 1.8);
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

function updateRacket(dt) {
  sweepStartPos.copy(playerRacket.position);
  sweepStartQuat.copy(playerRacket.quaternion);
  recoveryTimer = Math.max(0, recoveryTimer - dt);

  if (swing.state === 'ready') {
    racketTarget.set(player.x + 0.42, 1.16, player.z - 0.58);
    targetQuat.setFromEuler(new THREE.Euler(0.16, -0.25, -0.18, 'YXZ'));
  } else if (swing.state === 'drawing') {
    const side = gesture.side === 'backhand' ? -1 : 1;
    const xOffset = gesture.side ? side * clamp(0.38 + Math.abs(gesture.x) * 0.0024, 0.38, 0.78) : 0.28;
    const prediction = predictPlayerContact(0.9);
    const anchorY = prediction && Math.abs(prediction.lateral) < 1.05 ? clamp(prediction.point.y, 0.78, 1.92) : 1.16;
    racketTarget.set(player.x + xOffset, anchorY, player.z - 0.38);
    const yaw = gesture.side === 'backhand' ? 0.58 : -0.62;
    const roll = clamp(gesture.y / 180, -0.38, 0.38) * (gesture.side === 'backhand' ? -1 : 1);
    targetQuat.setFromEuler(new THREE.Euler(0.1, yaw, roll, 'YXZ'));
  } else if (swing.state === 'swing') {
    swing.phase = clamp(swing.phase + dt / swing.duration, 0, 1);
    const contactAt = 0.56;
    if (swing.phase <= contactAt) {
      const p = THREE.MathUtils.smoothstep(swing.phase, 0, contactAt);
      racketTarget.lerpVectors(swing.start, swing.anchor, p);
      targetQuat.slerpQuaternions(swing.startQuat, swing.contactQuat, p);
    } else {
      const p = THREE.MathUtils.smoothstep(swing.phase, contactAt, 1);
      racketTarget.lerpVectors(swing.anchor, swing.follow, p);
      targetQuat.slerpQuaternions(swing.contactQuat, swing.followQuat, p);
    }
    if (swing.phase >= 1) {
      swing.state = 'recover';
      recoveryTimer = 0.22;
    }
  } else if (swing.state === 'recover') {
    const p = 1 - clamp(recoveryTimer / 0.22, 0, 1);
    const ready = new THREE.Vector3(player.x + 0.42, 1.16, player.z - 0.58);
    racketTarget.lerp(ready, 0.18 + p * 0.15);
    qb.setFromEuler(new THREE.Euler(0.16, -0.25, -0.18, 'YXZ'));
    targetQuat.slerp(qb, 0.18 + p * 0.18);
    if (recoveryTimer <= 0) {
      swing.state = 'ready';
      swing.side = null;
      setStance('READY');
    }
  }

  playerRacket.position.lerp(racketTarget, 1 - Math.exp(-30 * dt));
  playerRacket.quaternion.slerp(targetQuat, 1 - Math.exp(-28 * dt));
  racketV.copy(playerRacket.position).sub(prevRacket).divideScalar(Math.max(dt, 0.001));
  prevRacket.copy(playerRacket.position);
  sweepEndPos.copy(playerRacket.position);
  sweepEndQuat.copy(playerRacket.quaternion);
  racketSpeedEl.textContent = `${Math.min(42, racketV.length()).toFixed(1)} m/s`;
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

  if (ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > 8.1 && swing.state === 'swing') {
    const c = racketContact();
    if (c) hitPlayer(c);
  }

  if (ball.hitter === 'player' && ball.v.z < 0 && ball.p.z < -9.0 && ball.p.y > 0.3 && ball.p.y < 3.2) hitAI();

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

function updateTimingGuide() {
  const prediction = started ? predictPlayerContact(1.1) : null;
  if (!prediction || prediction.t > 1.05) {
    timingGuide.classList.remove('visible');
    return;
  }

  const projected = ball.p.clone().project(camera);
  if (projected.z < -1 || projected.z > 1.2) {
    timingGuide.classList.remove('visible');
    return;
  }

  timingGuide.classList.add('visible');
  timingGuide.style.left = `${(projected.x * 0.5 + 0.5) * innerWidth}px`;
  timingGuide.style.top = `${(-projected.y * 0.5 + 0.5) * innerHeight}px`;
  timingGuide.style.setProperty('--ring-scale', String(clamp(0.82 + prediction.t * 0.82, 0.82, 1.62)));

  const lateral = prediction.lateral;
  if (Math.abs(lateral) > 1.02) {
    timingGuide.dataset.state = 'move';
    timingLabel.textContent = lateral > 0 ? 'SAĞA GİT' : 'SOLA GİT';
    timingHint.textContent = `Temas noktası ${Math.abs(lateral).toFixed(1)} m uzakta`;
    return;
  }

  const recommended = lateral < -0.08 ? 'BACKHAND' : 'FOREHAND';
  if (!gesture.held && prediction.t > 0.48) {
    timingGuide.dataset.state = 'prepare';
    timingLabel.textContent = 'SWING ÇİZ';
    timingHint.textContent = `${recommended} · sol mouse basılı`;
  } else if (gesture.held && prediction.t > 0.18) {
    timingGuide.dataset.state = 'arm';
    timingLabel.textContent = gesture.side ? `${gesture.side === 'forehand' ? 'FOREHAND' : 'BACKHAND'} HAZIR` : 'ÇİZ';
    timingHint.textContent = '↗ topspin · → flat · ↘ slice';
  } else if (prediction.t >= 0.07) {
    timingGuide.dataset.state = 'hit';
    timingLabel.textContent = 'BIRAK';
    timingHint.textContent = 'Gesture yönün swing yolunu belirler';
  } else {
    timingGuide.dataset.state = 'late';
    timingLabel.textContent = 'GEÇ';
    timingHint.textContent = 'Sonraki topa daha erken başla';
  }
}

function sync() {
  ballMesh.position.copy(ball.p);
  ballShadow.position.set(ball.p.x, 0.035, ball.p.z);
  const a = clamp(ball.p.y, 0, 4);
  ballShadow.scale.setScalar(1 + a * 0.16);
  ballShadow.material.opacity = 0.28 / (1 + a * 0.72);
  ballSpeedEl.textContent = `${Math.round(ball.v.length() * 3.6)} km/h`;
  spinValueEl.textContent = `${rpm()} rpm`;
  updateTimingGuide();
}

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
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) beginGesture();
  if (e.button === 2) cancelGesture();
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0 && gesture.held) commitGestureSwing();
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  recordGesture(e.movementX, e.movementY);
});
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  startScreen.classList.toggle('hidden', locked);
  startButton.textContent = started ? 'Devam et' : 'Korta çık';
  if (!locked && gesture.held) cancelGesture();
});
document.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') reset('Yeni top');
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  if (gesture.held) cancelGesture();
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
  while (acc >= STEP) {
    updatePlayer(STEP);
    updateRacket(STEP);
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
