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
sun.position.set(-8, 17, 9); sun.castShadow = true; scene.add(sun);

function mesh(geo, mat, pos, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(x, y, z, px, py, pz, color, parent = scene) {
  return mesh(new THREE.BoxGeometry(x, y, z), new THREE.MeshStandardMaterial({ color, roughness: .88 }), new THREE.Vector3(px, py, pz), parent);
}

function createCourt() {
  box(26, .18, 42, 0, -.13, 0, 0x4b7656);
  box(C.halfW * 2, .04, C.halfL * 2, 0, 0, 0, 0x2b7895);
  const lm = new THREE.MeshStandardMaterial({ color: 0xf8f6e8, roughness: .8 });
  const line = (w, d, x, z) => mesh(new THREE.BoxGeometry(w, .018, d), lm, new THREE.Vector3(x, .032, z));
  const s = 8.23 / 2;
  line(.055, C.halfL * 2, -C.halfW, 0); line(.055, C.halfL * 2, C.halfW, 0);
  line(C.halfW * 2, .055, 0, -C.halfL); line(C.halfW * 2, .055, 0, C.halfL);
  line(.05, C.halfL * 2, -s, 0); line(.05, C.halfL * 2, s, 0);
  line(s * 2, .05, 0, -6.4); line(s * 2, .05, 0, 6.4); line(.05, 12.8, 0, 0);
  mesh(new THREE.PlaneGeometry(C.halfW * 2 + .75, C.net, 34, 9), new THREE.MeshBasicMaterial({ color: 0xe8eee9, transparent: true, opacity: .38, wireframe: true, side: THREE.DoubleSide }), new THREE.Vector3(0, C.net / 2, 0));
  box(C.halfW * 2 + .8, .05, .055, 0, C.net, 0, 0xf7f3e7);
  for (const x of [-C.halfW - .4, C.halfW + .4]) mesh(new THREE.CylinderGeometry(.045, .045, 1.08, 12), new THREE.MeshStandardMaterial({ color: 0xd8ded9 }), new THREE.Vector3(x, .54, 0));
  const fm = new THREE.MeshBasicMaterial({ color: 0x385648, transparent: true, opacity: .22, wireframe: true });
  for (const z of [-15.6, 15.6]) mesh(new THREE.PlaneGeometry(18, 3.6, 36, 8), fm, new THREE.Vector3(0, 1.8, z));
  for (const x of [-8.8, 8.8]) { const f = mesh(new THREE.PlaneGeometry(31.2, 3.6, 58, 8), fm, new THREE.Vector3(x, 1.8, 0)); f.rotation.y = Math.PI / 2; }
}

function createRacket(color = 0xd9ff48) {
  const g = new THREE.Group();
  const rx = .145, ry = .19;
  const rim = mesh(new THREE.TorusGeometry(rx, .009, 8, 40), new THREE.MeshStandardMaterial({ color, roughness: .36 }), new THREE.Vector3(), g);
  rim.scale.y = ry / rx;
  const pts = [], sm = new THREE.LineBasicMaterial({ color: 0xeaf0eb, transparent: true, opacity: .68 });
  for (let i = -5; i <= 5; i++) { const x = i * .024, y = Math.sqrt(Math.max(0, 1 - (x / .137) ** 2)) * .183; pts.push(new THREE.Vector3(x, -y, 0), new THREE.Vector3(x, y, 0)); }
  for (let i = -6; i <= 6; i++) { const y = i * .027, x = Math.sqrt(Math.max(0, 1 - (y / .183) ** 2)) * .137; pts.push(new THREE.Vector3(-x, y, 0), new THREE.Vector3(x, y, 0)); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), sm));
  box(.052, .115, .022, 0, -.245, 0, color, g); box(.041, .27, .033, 0, -.43, 0, 0x202522, g);
  g.userData.rx = rx; g.userData.ry = ry; return g;
}

function createOpponent() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd1a06f }), shirt = new THREE.MeshStandardMaterial({ color: 0x243d67 }), white = new THREE.MeshStandardMaterial({ color: 0xe7e9eb });
  mesh(new THREE.SphereGeometry(.105, 16, 12), skin, new THREE.Vector3(0, 1.72, 0), g);
  mesh(new THREE.CapsuleGeometry(.18, .43, 5, 10), shirt, new THREE.Vector3(0, 1.32, 0), g);
  mesh(new THREE.BoxGeometry(.34, .22, .22), white, new THREE.Vector3(0, .91, 0), g);
  for (const x of [-.11, .11]) mesh(new THREE.CylinderGeometry(.045, .052, .58, 10), skin, new THREE.Vector3(x, .5, 0), g);
  g.position.set(0, 0, C.aiZ); g.rotation.y = Math.PI; scene.add(g); return g;
}

createCourt();
const playerRacket = createRacket(); playerRacket.position.set(.48, 1.16, C.playerZ - .3); playerRacket.rotation.set(.16, -.3, -.22); scene.add(playerRacket);
const opponent = createOpponent();
const aiRacket = createRacket(0xffd36a); aiRacket.position.set(.32, 1.12, C.aiZ + .14); aiRacket.rotation.set(.12, Math.PI - .25, .18); scene.add(aiRacket);

const ballMesh = mesh(new THREE.SphereGeometry(C.ballR, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdfff3f, roughness: .8 }), new THREE.Vector3());
const ballShadow = mesh(new THREE.CircleGeometry(.105, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .24, depthWrite: false }), new THREE.Vector3(0, .035, 0)); ballShadow.rotation.x = -Math.PI / 2;
const trailGeo = new THREE.BufferGeometry(), trailPts = []; scene.add(new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xe8ff9f, transparent: true, opacity: .23 })));

const ball = { p: new THREE.Vector3(0, 1.55, -9.6), prev: new THREE.Vector3(), v: new THREE.Vector3(), spin: new THREE.Vector3(), active: false, bounces: 0, hitter: 'ai', cooldown: 0, reset: .3 };
const racketTarget = new THREE.Vector3(.48, 1.16, C.playerZ - .3), prevRacket = playerRacket.position.clone(), racketV = new THREE.Vector3();
const targetEuler = new THREE.Euler(.16, -.3, -.22, 'YXZ'), targetQuat = new THREE.Quaternion();
let mouseVX = 0, mouseVY = 0, lastMouse = performance.now(), swingDepth = 0, started = false, rally = 0, aiCooldown = 0, msgTimer = 0;

function message(t, s = .7) { messageEl.textContent = t; messageEl.classList.add('visible'); msgTimer = s; }
function rpm() { return Math.round(Math.abs(ball.spin.x) * 60 / (Math.PI * 2)); }
function serveAI() {
  const tx = THREE.MathUtils.randFloat(-2.5, 2.5); ball.p.set(THREE.MathUtils.randFloat(-1.1, 1.1), 1.3, -9.7); ball.prev.copy(ball.p);
  ball.v.set((tx - ball.p.x) * .44, 5.0, THREE.MathUtils.randFloat(13.2, 15.2)); const r = THREE.MathUtils.randFloat(850, 1450); ball.spin.set(r * Math.PI * 2 / 60, 0, 0);
  ball.active = true; ball.bounces = 0; ball.hitter = 'ai'; ball.cooldown = .1; trailPts.length = 0; shotTypeEl.textContent = 'AI feed';
}
function reset(t) { ball.active = false; ball.v.set(0,0,0); ball.spin.set(0,0,0); ball.reset = .7; rally = 0; rallyEl.textContent = 0; message(t); }

function racketContact() {
  const inv = playerRacket.matrixWorld.clone().invert(), a = ball.prev.clone().applyMatrix4(inv), b = ball.p.clone().applyMatrix4(inv);
  if (!(a.z * b.z <= 0 || Math.min(Math.abs(a.z), Math.abs(b.z)) < C.ballR + .018)) return null;
  const dz = b.z - a.z, t = Math.abs(dz) > 1e-5 ? clamp(-a.z / dz, 0, 1) : 1, x = THREE.MathUtils.lerp(a.x, b.x, t), y = THREE.MathUtils.lerp(a.y, b.y, t);
  const e = (x / (playerRacket.userData.rx + .04)) ** 2 + (y / (playerRacket.userData.ry + .04)) ** 2; return e <= 1 ? { x, y, q: clamp(1 - Math.sqrt(e), 0, 1) } : null;
}
function hitPlayer(c) {
  if (ball.cooldown || ball.hitter === 'player') return;
  const speed = clamp(racketV.length(), 0, 38), up = clamp(racketV.y, -10, 20), lat = clamp(racketV.x, -18, 18), fwd = clamp(-racketV.z, -8, 22);
  const n = new THREE.Vector3(0,0,-1).applyQuaternion(playerRacket.quaternion).normalize(); if (n.z > 0) n.multiplyScalar(-1);
  const q = .58 + c.q * .42, exit = clamp((9.8 + speed * .58 + Math.max(0,fwd)*.2 + Math.max(0,ball.v.z)*.028) * q, 9.5, 34.5);
  const dir = new THREE.Vector3(clamp(n.x*.86 + lat*.02 + c.x*.8, -.64,.64), clamp(.1 + n.y*.24 + up*.016, .045,.48), -1).normalize(); ball.v.copy(dir.multiplyScalar(exit));
  const r = clamp(420 + Math.max(0,up)*155 + Math.abs(lat)*14, 300, 3900); ball.spin.set(-r*Math.PI*2/60, lat*.12, -lat*.42); ball.hitter='player'; ball.cooldown=.16; ball.bounces=0; rally++; rallyEl.textContent=rally;
  shotTypeEl.textContent = c.q < .25 ? 'Mishit' : r > 1900 ? 'Topspin' : up < -1.5 ? 'Slice' : speed > 15 ? 'Flat / drive' : 'Kontrollü'; message(c.q > .62 ? 'Sweet spot' : 'Temas', .4);
}
function hitAI() {
  if (aiCooldown || ball.hitter === 'ai') return; const tx = THREE.MathUtils.randFloat(-2.8,2.8), sp = THREE.MathUtils.randFloat(13.2,17.1);
  ball.v.copy(new THREE.Vector3((tx-ball.p.x)*.055, THREE.MathUtils.randFloat(.17,.27), 1).normalize().multiplyScalar(sp)); const r=THREE.MathUtils.randFloat(900,1800); ball.spin.set(r*Math.PI*2/60,0,0);
  ball.hitter='ai'; ball.cooldown=.12; ball.bounces=0; aiCooldown=.35; rally++; rallyEl.textContent=rally; shotTypeEl.textContent='AI return';
}

function updateRacket(dt) {
  swingDepth *= Math.exp(-7.5*dt); racketTarget.z = C.playerZ - .3 - swingDepth; playerRacket.position.lerp(racketTarget, 1-Math.exp(-18*dt)); racketV.copy(playerRacket.position).sub(prevRacket).divideScalar(Math.max(dt,.001)); prevRacket.copy(playerRacket.position);
  const g = clamp(Math.hypot(mouseVX,mouseVY)/24,0,1); targetEuler.set(.16+clamp(mouseVY*.018,-.48,.48), -.28+clamp(-mouseVX*.035,-1.05,1.05), -.22+clamp(-mouseVY*.022-mouseVX*.012,-.75,.75)); targetQuat.setFromEuler(targetEuler); playerRacket.quaternion.slerp(targetQuat,1-Math.exp(-(8+g*8)*dt));
  mouseVX*=Math.exp(-9.5*dt); mouseVY*=Math.exp(-9.5*dt); racketSpeedEl.textContent=`${Math.min(38,racketV.length()).toFixed(1)} m/s`;
}
function updateBall(dt) {
  ball.cooldown=Math.max(0,ball.cooldown-dt); aiCooldown=Math.max(0,aiCooldown-dt); if(!ball.active){ ball.reset-=dt; if(started&&ball.reset<=0) serveAI(); return; }
  ball.prev.copy(ball.p); const speed=ball.v.length(); if(speed){ ball.v.addScaledVector(ball.v.clone().multiplyScalar(-.0105*speed),dt); ball.v.addScaledVector(ball.spin.clone().cross(ball.v).multiplyScalar(.00038),dt); } ball.v.y += -9.81*dt; ball.spin.multiplyScalar(Math.exp(-.09*dt)); ball.p.addScaledVector(ball.v,dt);
  if(ball.prev.z*ball.p.z<=0 && ball.p.y<C.net+C.ballR && Math.abs(ball.p.x)<C.halfW+.25){ ball.p.z=Math.sign(ball.prev.z||1)*.09; ball.v.z*=-.24; ball.v.x*=.72; ball.v.y*=.55; message('File'); }
  if(ball.p.y<=C.ballR && ball.v.y<0){ ball.p.y=C.ballR; ball.v.y*=-.72; ball.v.x*=.88; ball.v.z*=.9; ball.spin.multiplyScalar(.82); ball.bounces++; if(Math.abs(ball.p.x)>C.halfW||Math.abs(ball.p.z)>C.halfL) return reset('Aut'); if(ball.bounces>=2) return reset('İkinci sekme'); }
  if(ball.hitter==='ai'&&ball.v.z>0&&ball.p.z>9.2){ const c=racketContact(); if(c) hitPlayer(c); }
  if(ball.hitter==='player'&&ball.v.z<0&&ball.p.z<-8.4&&ball.p.y>.35&&ball.p.y<3.15) hitAI();
  if(Math.abs(ball.p.z)>16.2||Math.abs(ball.p.x)>8.5||ball.p.y<-1) return reset('Yeni ralli'); trailPts.push(ball.p.clone()); if(trailPts.length>24) trailPts.shift(); trailGeo.setFromPoints(trailPts);
}
function updateAI(dt) {
  const x=ball.active&&ball.p.z<2?clamp(ball.p.x,-3.1,3.1):0; opponent.position.x=THREE.MathUtils.lerp(opponent.position.x,x,1-Math.exp(-4.5*dt)); aiRacket.position.x=THREE.MathUtils.lerp(aiRacket.position.x,x+.32,1-Math.exp(-5.5*dt));
  aiRacket.position.y=THREE.MathUtils.lerp(aiRacket.position.y,ball.active&&ball.p.z<-3?clamp(ball.p.y,.95,1.7):1.12,1-Math.exp(-5*dt)); const s=ball.hitter==='player'&&ball.p.z<-6.8?.6:0; aiRacket.rotation.y=Math.PI-.25+Math.sin(performance.now()*.011)*s;
}
function sync(){ ballMesh.position.copy(ball.p); ballShadow.position.set(ball.p.x,.035,ball.p.z); const a=clamp(ball.p.y,0,4); ballShadow.scale.setScalar(1+a*.16); ballShadow.material.opacity=.24/(1+a*.72); ballSpeedEl.textContent=`${Math.round(ball.v.length()*3.6)} km/h`; spinValueEl.textContent=`${rpm()} rpm`; }

document.addEventListener('mousemove',e=>{ if(document.pointerLockElement!==canvas)return; const now=performance.now(), dt=Math.max(.008,(now-lastMouse)/1000); lastMouse=now; const dx=e.movementX,dy=e.movementY; racketTarget.x=clamp(racketTarget.x+dx*.0065,-1.55,1.75); racketTarget.y=clamp(racketTarget.y-dy*.0058,.72,2.05); mouseVX=clamp(dx*.0065/dt,-32,32); mouseVY=clamp(-dy*.0058/dt,-32,32); swingDepth=Math.max(swingDepth,clamp((Math.hypot(mouseVX,mouseVY)-2)*.032,0,.82)); });
function lock(){ const p=canvas.requestPointerLock({unadjustedMovement:true}); if(p?.catch)p.catch(()=>canvas.requestPointerLock()); }
startButton.addEventListener('click',()=>{started=true;lock();}); canvas.addEventListener('click',()=>{if(started&&document.pointerLockElement!==canvas)lock();});
document.addEventListener('pointerlockchange',()=>{const l=document.pointerLockElement===canvas; startScreen.classList.toggle('hidden',l); startButton.textContent=started?'Devam et':'Korta çık';});
document.addEventListener('keydown',e=>{if(e.code==='KeyR')reset('Yeni top');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

const clock=new THREE.Clock(); let acc=0; const STEP=1/120;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);acc+=dt;updateRacket(dt);updateAI(dt);while(acc>=STEP){updateBall(STEP);acc-=STEP;}if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)messageEl.classList.remove('visible');}sync();renderer.render(scene,camera);}
ballMesh.position.copy(ball.p); animate();
