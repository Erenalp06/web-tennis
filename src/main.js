import * as THREE from 'three';
import './styles.css';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#startScreen');
const startButton = document.querySelector('#startButton');
const rallyEl = document.querySelector('#rallyCount');
const racketSpeedEl = document.querySelector('#racketSpeed');
const ballSpeedEl = document.querySelector('#ballSpeed');
const spinValueEl = document.querySelector('#spinValue');
const shotTypeEl = document.querySelector('#shotType');
const messageEl = document.querySelector('#message');

const clamp = THREE.MathUtils.clamp;
const GRAVITY = -9.81;
const BALL_RADIUS = 0.067;
const COURT_HALF_LENGTH = 11.885;
const COURT_HALF_WIDTH = 5.485;
const NET_HEIGHT = 0.914;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07130f);
scene.fog = new THREE.Fog(0x07130f, 24, 48);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 5.9, 15.8);
camera.lookAt(0, 1.1, -1.4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

scene.add(new THREE.HemisphereLight(0xbde8ff, 0x173026, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-7, 16, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
scene.add(sun);

function addBox(size, position, color, materialOptions = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshStandardMaterial({ color, ...materialOptions }),
  );
  mesh.position.copy(position);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createCourt() {
  addBox(
    new THREE.Vector3(20, 0.14, 34),
    new THREE.Vector3(0, -0.1, 0),
    0x102a20,
    { roughness: 0.94 },
  );

  addBox(
    new THREE.Vector3(COURT_HALF_WIDTH * 2, 0.035, COURT_HALF_LENGTH * 2),
    new THREE.Vector3(0, 0, 0),
    0x236c57,
    { roughness: 0.88 },
  );

  const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f5e9, roughness: 0.8 });
  const line = (w, d, x, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, d), lineMaterial);
    mesh.position.set(x, 0.027, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  const singlesHalf = 8.23 / 2;
  line(0.055, COURT_HALF_LENGTH * 2, -COURT_HALF_WIDTH, 0);
  line(0.055, COURT_HALF_LENGTH * 2, COURT_HALF_WIDTH, 0);
  line(COURT_HALF_WIDTH * 2, 0.055, 0, -COURT_HALF_LENGTH);
  line(COURT_HALF_WIDTH * 2, 0.055, 0, COURT_HALF_LENGTH);
  line(0.05, COURT_HALF_LENGTH * 2, -singlesHalf, 0);
  line(0.05, COURT_HALF_LENGTH * 2, singlesHalf, 0);
  line(singlesHalf * 2, 0.05, 0, -6.4);
  line(singlesHalf * 2, 0.05, 0, 6.4);
  line(0.05, 12.8, 0, 0);

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT_HALF_WIDTH * 2 + 0.6, NET_HEIGHT, 26, 7),
    new THREE.MeshBasicMaterial({
      color: 0xdde8df,
      transparent: true,
      opacity: 0.36,
      wireframe: true,
      side: THREE.DoubleSide,
    }),
  );
  net.position.set(0, NET_HEIGHT / 2, 0);
  scene.add(net);

  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(COURT_HALF_WIDTH * 2 + 0.7, 0.045, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xf5f5ed }),
  );
  tape.position.set(0, NET_HEIGHT, 0);
  scene.add(tape);

  const postGeometry = new THREE.CylinderGeometry(0.045, 0.045, 1.08, 12);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xd7ddd8, metalness: 0.25 });
  for (const x of [-COURT_HALF_WIDTH - 0.35, COURT_HALF_WIDTH + 0.35]) {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 0.54, 0);
    post.castShadow = true;
    scene.add(post);
  }
}

function createRacket(color = 0xd8ff48) {
  const group = new THREE.Group();

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.57, 0.035, 10, 36),
    new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.08 }),
  );
  rim.scale.y = 1.32;
  rim.castShadow = true;
  group.add(rim);

  const stringMaterial = new THREE.LineBasicMaterial({ color: 0xdce6e0, transparent: true, opacity: 0.48 });
  const points = [];
  for (let i = -4; i <= 4; i += 1) {
    const x = i * 0.105;
    const yExtent = Math.sqrt(Math.max(0, 1 - (x / 0.54) ** 2)) * 0.72;
    points.push(new THREE.Vector3(x, -yExtent, 0), new THREE.Vector3(x, yExtent, 0));
  }
  for (let i = -5; i <= 5; i += 1) {
    const y = i * 0.12;
    const xExtent = Math.sqrt(Math.max(0, 1 - (y / 0.72) ** 2)) * 0.54;
    points.push(new THREE.Vector3(-xExtent, y, 0), new THREE.Vector3(xExtent, y, 0));
  }
  const strings = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), stringMaterial);
  strings.position.z = 0.004;
  group.add(strings);

  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.34, 0.08),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45 }),
  );
  throat.position.y = -0.86;
  throat.castShadow = true;
  group.add(throat);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.62, 0.11),
    new THREE.MeshStandardMaterial({ color: 0x222c28, roughness: 0.8 }),
  );
  handle.position.y = -1.28;
  handle.castShadow = true;
  group.add(handle);

  return group;
}

createCourt();

const playerRacket = createRacket();
playerRacket.position.set(0, 1.55, 8.55);
playerRacket.rotation.y = 0;
scene.add(playerRacket);

const opponentRacket = createRacket(0xffd36a);
opponentRacket.scale.setScalar(0.86);
opponentRacket.position.set(0, 1.45, -9.2);
opponentRacket.rotation.y = Math.PI;
scene.add(opponentRacket);

const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 20, 14),
  new THREE.MeshStandardMaterial({ color: 0xdfff3f, roughness: 0.82 }),
);
ballMesh.castShadow = true;
scene.add(ballMesh);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.11, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.035;
scene.add(shadow);

const trailMaterial = new THREE.LineBasicMaterial({ color: 0xcfffb4, transparent: true, opacity: 0.26 });
const trailGeometry = new THREE.BufferGeometry();
const trail = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trail);
const trailPoints = [];

const ball = {
  position: new THREE.Vector3(0, 1.8, -8.8),
  previousPosition: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  spin: new THREE.Vector3(),
  active: false,
  bounces: 0,
  lastHitter: 'ai',
  contactCooldown: 0,
  resetTimer: 0.35,
};

const racketTarget = new THREE.Vector3(0, 1.55, 8.55);
const previousRacketPosition = playerRacket.position.clone();
const racketVelocity = new THREE.Vector3();
let lastMouseAt = performance.now();
let mouseVelocityX = 0;
let mouseVelocityY = 0;
let swingDepth = 0;
let gameStarted = false;
let rally = 0;
let aiContactCooldown = 0;
let messageTimer = 0;

function showMessage(text, seconds = 0.8) {
  messageEl.textContent = text;
  messageEl.classList.add('visible');
  messageTimer = seconds;
}

function spinRpm() {
  return Math.round(Math.abs(ball.spin.x) * 60 / (Math.PI * 2));
}

function launchFromAI(isOpening = false) {
  const targetX = THREE.MathUtils.randFloat(-2.65, 2.65);
  ball.position.set(THREE.MathUtils.randFloat(-1.3, 1.3), 1.35, -9.0);
  ball.previousPosition.copy(ball.position);
  ball.velocity.set((targetX - ball.position.x) * 0.48, isOpening ? 5.0 : 4.4, THREE.MathUtils.randFloat(13.2, 15.4));
  const rpm = THREE.MathUtils.randFloat(800, 1450);
  ball.spin.set(rpm * Math.PI * 2 / 60, 0, THREE.MathUtils.randFloatSpread(20));
  ball.active = true;
  ball.bounces = 0;
  ball.lastHitter = 'ai';
  ball.contactCooldown = 0.1;
  trailPoints.length = 0;
  shotTypeEl.textContent = 'AI feed';
}

function scheduleReset(text = 'Yeni top') {
  if (!ball.active && ball.resetTimer > 0) return;
  ball.active = false;
  ball.velocity.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.resetTimer = 0.72;
  rally = 0;
  rallyEl.textContent = rally;
  showMessage(text, 0.65);
}

function playerHit() {
  if (ball.contactCooldown > 0 || ball.lastHitter === 'player') return;

  const speed = clamp(racketVelocity.length(), 0, 35);
  const faceNormal = new THREE.Vector3(0, 0, -1).applyQuaternion(playerRacket.quaternion).normalize();

  const upward = clamp(racketVelocity.y, -8, 18);
  const lateral = clamp(racketVelocity.x, -16, 16);
  const incomingKmh = Math.max(0, ball.velocity.z) * 3.6;
  const exitSpeed = clamp(10.5 + speed * 0.52 + incomingKmh * 0.018, 10.5, 31.5);

  const shotDirection = new THREE.Vector3(
    clamp(faceNormal.x * 0.95 + lateral * 0.025, -0.62, 0.62),
    clamp(0.13 + upward * 0.017, 0.055, 0.46),
    -1,
  ).normalize();

  ball.velocity.copy(shotDirection.multiplyScalar(exitSpeed));

  const rpm = clamp(450 + Math.max(0, upward) * 145 + Math.abs(lateral) * 18, 350, 3600);
  ball.spin.set(-rpm * Math.PI * 2 / 60, lateral * 0.15, -lateral * 0.45);
  ball.lastHitter = 'player';
  ball.contactCooldown = 0.16;
  ball.bounces = 0;
  rally += 1;
  rallyEl.textContent = rally;

  if (rpm > 1850) shotTypeEl.textContent = 'Topspin';
  else if (upward < -1.8) shotTypeEl.textContent = 'Slice';
  else shotTypeEl.textContent = speed > 15 ? 'Flat / drive' : 'Kontrollü';

  showMessage(speed > 18 ? 'Temiz temas' : 'Temas', 0.4);
}

function aiHit() {
  if (aiContactCooldown > 0 || ball.lastHitter === 'ai') return;

  const targetX = THREE.MathUtils.randFloat(-2.9, 2.9);
  const speed = THREE.MathUtils.randFloat(13.4, 17.3);
  const direction = new THREE.Vector3(
    (targetX - ball.position.x) * 0.055,
    THREE.MathUtils.randFloat(0.17, 0.28),
    1,
  ).normalize();

  ball.velocity.copy(direction.multiplyScalar(speed));
  const rpm = THREE.MathUtils.randFloat(900, 1800);
  ball.spin.set(rpm * Math.PI * 2 / 60, 0, THREE.MathUtils.randFloatSpread(16));
  ball.lastHitter = 'ai';
  ball.contactCooldown = 0.12;
  ball.bounces = 0;
  aiContactCooldown = 0.35;
  rally += 1;
  rallyEl.textContent = rally;
  shotTypeEl.textContent = 'AI return';
}

function racketIntersectsBall() {
  const inverse = playerRacket.matrixWorld.clone().invert();
  const a = ball.previousPosition.clone().applyMatrix4(inverse);
  const b = ball.position.clone().applyMatrix4(inverse);

  const nearPlane = Math.min(Math.abs(a.z), Math.abs(b.z)) < 0.18 || a.z * b.z <= 0;
  if (!nearPlane) return false;

  let t = 1;
  const dz = b.z - a.z;
  if (Math.abs(dz) > 0.0001) t = clamp(-a.z / dz, 0, 1);
  const x = THREE.MathUtils.lerp(a.x, b.x, t);
  const y = THREE.MathUtils.lerp(a.y, b.y, t);
  return (x / 0.63) ** 2 + (y / 0.83) ** 2 <= 1;
}

function updateRacket(dt) {
  swingDepth *= Math.exp(-9 * dt);
  racketTarget.z = 8.55 - swingDepth;

  const follow = 1 - Math.exp(-20 * dt);
  playerRacket.position.lerp(racketTarget, follow);

  racketVelocity.copy(playerRacket.position).sub(previousRacketPosition).divideScalar(Math.max(dt, 0.001));
  previousRacketPosition.copy(playerRacket.position);

  const targetYaw = clamp(-mouseVelocityX * 0.018, -0.48, 0.48);
  const targetRoll = clamp(-mouseVelocityY * 0.012, -0.34, 0.34);
  playerRacket.rotation.y = THREE.MathUtils.lerp(playerRacket.rotation.y, targetYaw, 1 - Math.exp(-9 * dt));
  playerRacket.rotation.z = THREE.MathUtils.lerp(playerRacket.rotation.z, targetRoll, 1 - Math.exp(-8 * dt));
  playerRacket.rotation.x = THREE.MathUtils.lerp(playerRacket.rotation.x, clamp(mouseVelocityY * 0.007, -0.2, 0.25), 1 - Math.exp(-8 * dt));

  mouseVelocityX *= Math.exp(-12 * dt);
  mouseVelocityY *= Math.exp(-12 * dt);

  const visualSpeed = Math.min(35, racketVelocity.length());
  racketSpeedEl.textContent = `${visualSpeed.toFixed(1)} m/s`;
}

function applyAerodynamics(dt) {
  const speed = ball.velocity.length();
  if (speed < 0.001) return;

  const drag = ball.velocity.clone().multiplyScalar(-0.0105 * speed);
  const magnus = ball.spin.clone().cross(ball.velocity).multiplyScalar(0.00038);
  ball.velocity.addScaledVector(drag, dt);
  ball.velocity.addScaledVector(magnus, dt);
  ball.velocity.y += GRAVITY * dt;
  ball.spin.multiplyScalar(Math.exp(-0.09 * dt));
}

function updateBall(dt) {
  ball.contactCooldown = Math.max(0, ball.contactCooldown - dt);
  aiContactCooldown = Math.max(0, aiContactCooldown - dt);

  if (!ball.active) {
    ball.resetTimer -= dt;
    if (gameStarted && ball.resetTimer <= 0) launchFromAI(true);
    return;
  }

  ball.previousPosition.copy(ball.position);
  applyAerodynamics(dt);
  ball.position.addScaledVector(ball.velocity, dt);

  const crossedNet = ball.previousPosition.z * ball.position.z <= 0;
  if (crossedNet && ball.position.y < NET_HEIGHT + BALL_RADIUS && Math.abs(ball.position.x) < COURT_HALF_WIDTH + 0.25) {
    ball.position.z = Math.sign(ball.previousPosition.z || 1) * 0.09;
    ball.velocity.z *= -0.24;
    ball.velocity.x *= 0.72;
    ball.velocity.y *= 0.55;
    showMessage('File', 0.75);
  }

  if (ball.position.y <= BALL_RADIUS && ball.velocity.y < 0) {
    ball.position.y = BALL_RADIUS;
    ball.velocity.y *= -0.72;
    ball.velocity.x *= 0.88;
    ball.velocity.z *= 0.9;
    ball.spin.multiplyScalar(0.82);
    ball.bounces += 1;

    const inCourt = Math.abs(ball.position.x) <= COURT_HALF_WIDTH && Math.abs(ball.position.z) <= COURT_HALF_LENGTH;
    if (!inCourt) {
      scheduleReset('Aut');
      return;
    }
    if (ball.bounces >= 2) {
      scheduleReset('İkinci sekme');
      return;
    }
  }

  if (ball.lastHitter === 'ai' && ball.velocity.z > 0 && ball.position.z > 6.9 && racketIntersectsBall()) {
    playerHit();
  }

  if (ball.lastHitter === 'player' && ball.velocity.z < 0 && ball.position.z < -7.7 && ball.position.y > 0.35 && ball.position.y < 3.15) {
    aiHit();
  }

  if (Math.abs(ball.position.z) > 15.4 || Math.abs(ball.position.x) > 8.3 || ball.position.y < -1) {
    scheduleReset('Yeni ralli');
    return;
  }

  trailPoints.push(ball.position.clone());
  if (trailPoints.length > 26) trailPoints.shift();
  trailGeometry.setFromPoints(trailPoints);
}

function updateOpponent(dt) {
  const desiredX = ball.active && ball.position.z < 2 ? clamp(ball.position.x, -3.4, 3.4) : 0;
  const desiredY = ball.active && ball.position.z < -3 ? clamp(ball.position.y, 1.1, 2.25) : 1.45;
  opponentRacket.position.x = THREE.MathUtils.lerp(opponentRacket.position.x, desiredX, 1 - Math.exp(-5 * dt));
  opponentRacket.position.y = THREE.MathUtils.lerp(opponentRacket.position.y, desiredY, 1 - Math.exp(-5 * dt));

  const aiSwing = ball.lastHitter === 'player' && ball.position.z < -6.5 ? 0.38 : 0;
  opponentRacket.rotation.y = Math.PI + Math.sin(performance.now() * 0.012) * aiSwing;
}

function syncVisuals() {
  ballMesh.position.copy(ball.position);
  ballMesh.rotation.x += 0.08;
  ballMesh.rotation.z += 0.035;
  shadow.position.x = ball.position.x;
  shadow.position.z = ball.position.z;
  const altitude = clamp(ball.position.y, 0, 4);
  shadow.scale.setScalar(1 + altitude * 0.16);
  shadow.material.opacity = 0.23 / (1 + altitude * 0.7);

  ballSpeedEl.textContent = `${Math.round(ball.velocity.length() * 3.6)} km/h`;
  spinValueEl.textContent = `${spinRpm()} rpm`;
}

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  const now = performance.now();
  const eventDt = Math.max(0.008, (now - lastMouseAt) / 1000);
  lastMouseAt = now;

  const dx = event.movementX;
  const dy = event.movementY;
  racketTarget.x = clamp(racketTarget.x + dx * 0.012, -3.55, 3.55);
  racketTarget.y = clamp(racketTarget.y - dy * 0.0105, 0.78, 2.95);

  mouseVelocityX = clamp(dx * 0.012 / eventDt, -30, 30);
  mouseVelocityY = clamp(-dy * 0.0105 / eventDt, -30, 30);
  const gestureSpeed = Math.hypot(mouseVelocityX, mouseVelocityY);
  swingDepth = Math.max(swingDepth, clamp((gestureSpeed - 2.5) * 0.055, 0, 1.5));
});

function requestGamePointerLock() {
  const request = canvas.requestPointerLock({ unadjustedMovement: true });
  if (request?.catch) request.catch(() => canvas.requestPointerLock());
}

startButton.addEventListener('click', () => {
  gameStarted = true;
  requestGamePointerLock();
});

canvas.addEventListener('click', () => {
  if (gameStarted && document.pointerLockElement !== canvas) requestGamePointerLock();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  startScreen.classList.toggle('hidden', locked);
  startButton.textContent = gameStarted ? 'Devam et' : 'Korta çık';
  if (locked && !ball.active && ball.resetTimer <= 0) ball.resetTimer = 0.25;
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') {
    ball.active = false;
    ball.resetTimer = 0.05;
    rally = 0;
    rallyEl.textContent = '0';
  }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let accumulator = 0;
const FIXED_DT = 1 / 120;

function animate() {
  requestAnimationFrame(animate);
  const frameDt = Math.min(clock.getDelta(), 0.05);
  accumulator += frameDt;

  updateRacket(frameDt);
  updateOpponent(frameDt);

  while (accumulator >= FIXED_DT) {
    updateBall(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  if (messageTimer > 0) {
    messageTimer -= frameDt;
    if (messageTimer <= 0) messageEl.classList.remove('visible');
  }

  syncVisuals();
  renderer.render(scene, camera);
}

ball.position.copy(new THREE.Vector3(0, 1.6, -8.6));
ballMesh.position.copy(ball.position);
animate();
