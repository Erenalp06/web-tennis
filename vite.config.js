import { defineConfig } from 'vite';

function replaceOrThrow(code, from, to, label) {
  if (!code.includes(from)) throw new Error(`V0.8 patch point missing: ${label}`);
  return code.replace(from, to);
}

function patchMainV3(source) {
  let code = source;

  code = replaceOrThrow(
    code,
    "  player.z = clamp(player.z + player.vz * dt, 10.75, 14.05);",
    "  player.z = clamp(player.z + player.vz * dt, 1.45, 14.05);\n  document.body.dataset.volleyZone = player.z < 7.05 ? 'true' : 'false';",
    'approach movement',
  );

  code = replaceOrThrow(
    code,
    "let lastTimingGrade = '';",
    "let lastTimingGrade = '';\nlet pointServer = 'ai';\nlet serveState = 'idle';\nlet servePending = false;",
    'serve state',
  );

  const oldServe = `function serveAI() {
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
}`;

  const newServe = `function preparePlayerServe() {
  serveState = 'ready';
  servePending = false;
  ball.active = false;
  ball.reset = 999;
  player.z = Math.max(player.z, 11.72);
  player.vz = 0;
  ball.p.set(player.x - 0.3, 1.02, player.z - 0.46);
  ball.prev.copy(ball.p);
  ball.v.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.bounces = 0;
  shotTypeEl.textContent = 'Servis hazır';
  setStance('SERVİS · SPACE İLE TOSS');
  message('SPACE: topu at · sonra mouse ile servis swing’i çiz', 1.25);
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', { detail: { server: 'player', state: 'ready' } }));
}

function tossPlayerServe() {
  if (!started || pointServer !== 'player' || serveState !== 'ready') return;
  ball.p.set(player.x - 0.3, 1.04, player.z - 0.52);
  ball.prev.copy(ball.p);
  ball.v.set(0.12, 5.85, -0.28);
  ball.spin.set(0, 0, 0);
  ball.active = true;
  ball.bounces = 0;
  ball.hitter = 'serve-toss';
  ball.cooldown = 0;
  serveState = 'toss';
  trailPts.length = 0;
  shotTypeEl.textContent = 'Servis toss';
  setStance('SERVİS · SWING ÇİZ');
  message('Top yükselirken swing çiz ve bırak', 0.8);
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', { detail: { server: 'player', state: 'toss' } }));
}

function beginNextPoint() {
  if (pointServer === 'player') preparePlayerServe();
  else serveAI();
}

function serveAI() {
  serveState = 'live';
  servePending = false;
  const side = Math.random() < 0.5 ? -1 : 1;
  const startX = side * THREE.MathUtils.randFloat(0.55, 1.05);
  const targetX = -side * THREE.MathUtils.randFloat(0.55, 3.45);
  const targetZ = THREE.MathUtils.randFloat(3.8, 5.75);
  const flight = THREE.MathUtils.randFloat(0.63, 0.69);
  ball.p.set(startX, 2.58, -11.38);
  ball.prev.copy(ball.p);
  ball.v.set(
    (targetX - ball.p.x) / flight,
    (C.ballR - ball.p.y + 0.5 * 9.81 * flight * flight) / flight,
    (targetZ - ball.p.z) / flight,
  );
  const r = THREE.MathUtils.randFloat(1050, 1850);
  ball.spin.set(r * Math.PI * 2 / 60, side * 4.5, 0);
  ball.active = true;
  ball.bounces = 0;
  ball.hitter = 'ai';
  ball.cooldown = 0.1;
  trailPts.length = 0;
  shotTypeEl.textContent = 'CPU serve';
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', { detail: { server: 'ai', state: 'live' } }));
}`;
  code = replaceOrThrow(code, oldServe, newServe, 'serve functions');

  code = replaceOrThrow(
    code,
    `function reset(text) {
  ball.active = false;
  ball.v.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.reset = 0.72;
  rally = 0;
  rallyEl.textContent = 0;
  message(text);
}`,
    `function reset(text) {
  ball.active = false;
  ball.v.set(0, 0, 0);
  ball.spin.set(0, 0, 0);
  ball.reset = 0.72;
  serveState = 'idle';
  servePending = false;
  rally = 0;
  rallyEl.textContent = 0;
  message(text);
}`,
    'reset serve state',
  );

  code = replaceOrThrow(
    code,
    `  const prediction = predictPlayerContact(0.9);
  const reachable = prediction && Math.abs(prediction.lateral) <= 1.02 && prediction.point.y >= 0.48 && prediction.point.y <= 2.2;
  const defaultX = player.x + (g.side === 'forehand' ? 0.2 : -0.15);
  swing.anchor.set(
    reachable ? clamp(prediction.point.x, player.x - 0.78, player.x + 0.78) : defaultX,
    reachable ? clamp(prediction.point.y, 0.72, 1.95) : 1.16,
    player.z - C.contactZOffset,
  );`,
    `  const prediction = predictPlayerContact(0.9);
  const servingToss = serveState === 'toss' && ball.hitter === 'serve-toss';
  const reachable = prediction && Math.abs(prediction.lateral) <= 1.02 && prediction.point.y >= 0.48 && prediction.point.y <= 2.2;
  const defaultX = player.x + (g.side === 'forehand' ? 0.2 : -0.15);
  swing.anchor.set(
    servingToss ? clamp(ball.p.x, player.x - 0.68, player.x + 0.68) : reachable ? clamp(prediction.point.x, player.x - 0.78, player.x + 0.78) : defaultX,
    servingToss ? clamp(ball.p.y, 1.85, 2.82) : reachable ? clamp(prediction.point.y, 0.72, 1.95) : 1.16,
    servingToss ? player.z - 0.54 : player.z - C.contactZOffset,
  );`,
    'serve swing anchor',
  );

  code = replaceOrThrow(
    code,
    "    const anchorY = prediction && Math.abs(prediction.lateral) < 1.05 ? clamp(prediction.point.y, 0.78, 1.92) : 1.16;",
    "    const anchorY = serveState === 'toss' ? clamp(ball.p.y, 1.82, 2.82) : prediction && Math.abs(prediction.lateral) < 1.05 ? clamp(prediction.point.y, 0.78, 1.92) : 1.16;",
    'serve drawing height',
  );

  const oldHitPlayer = `function hitPlayer(c) {
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
  shotTypeEl.textContent = \`${'${sideName}'} ${'${style}'}\`;
  const timingText = lastTimingGrade ? \` · zamanlama ${'${lastTimingGrade.toLowerCase()}'}\` : '';
  message((c.q > 0.62 ? \`${'${sideName}'} · sweet spot\` : \`${'${sideName}'} · temas\`) + timingText, 0.7);
  lastTimingGrade = '';
}`;

  const newHitPlayer = `function hitPlayer(c) {
  if (ball.cooldown || ball.hitter === 'player') return;
  const serving = serveState === 'toss' || ball.hitter === 'serve-toss';
  const volley = !serving && player.z < 7.05 && ball.bounces === 0;
  const speed = clamp(racketV.length(), 0, 42);
  const q = 0.56 + c.q * 0.44;
  const exit = serving
    ? clamp((16.5 + speed * 0.78 + swing.power * 10.5) * q, 16, 45)
    : clamp((10.2 + speed * 0.72 + swing.power * 7.5 + (volley ? 2.2 : 0)) * q, 10, 39);
  const horizontalAim = clamp(swing.aim * (serving ? 0.48 : 0.36) + c.x * 0.7, -0.68, 0.68);
  const vertical = serving
    ? clamp(-0.13 + swing.lift * 0.035, -0.19, -0.045)
    : volley
      ? clamp(0.045 + swing.lift * 0.04 + Math.max(0, racketV.y) * 0.004, 0.012, 0.14)
      : clamp(0.12 + swing.lift * 0.085 + Math.max(0, racketV.y) * 0.008, 0.035, 0.36);
  const dir = new THREE.Vector3(horizontalAim, vertical, -1).normalize();
  ball.v.copy(dir.multiplyScalar(exit));

  const liftAbs = Math.abs(swing.lift);
  const rpmValue = serving
    ? clamp(800 + liftAbs * 1250 + swing.power * 950, 700, 2600)
    : clamp((480 + liftAbs * 2800 + swing.power * 650) * (volley ? 0.55 : 1), 250, 4100);
  const spinSign = swing.lift >= -0.08 ? -1 : 1;
  ball.spin.set(spinSign * rpmValue * Math.PI * 2 / 60, swing.aim * 12, -swing.aim * 22);
  ball.hitter = 'player';
  ball.cooldown = 0.17;
  ball.bounces = 0;
  if (serving) {
    servePending = true;
    serveState = 'flight';
  }
  rally += 1;
  rallyEl.textContent = rally;

  const sideName = swing.side === 'backhand' ? 'Backhand' : 'Forehand';
  const style = volley ? 'vole' : swing.lift > 0.32 ? 'topspin' : swing.lift < -0.28 ? 'slice' : speed > 15 ? 'drive' : 'flat';
  shotTypeEl.textContent = serving ? \`Servis ${'${Math.round(exit * 3.6)}'} km/h\` : \`${'${sideName}'} ${'${style}'}\`;
  const timingText = lastTimingGrade ? \` · zamanlama ${'${lastTimingGrade.toLowerCase()}'}\` : '';
  const label = serving ? 'Servis' : volley ? \`${'${sideName}'} vole\` : sideName;
  message((c.q > 0.62 ? \`${'${label}'} · sweet spot\` : \`${'${label}'} · temas\`) + timingText, 0.7);
  lastTimingGrade = '';
}`;
  code = replaceOrThrow(code, oldHitPlayer, newHitPlayer, 'serve/volley hit physics');

  code = replaceOrThrow(
    code,
    "  const target = new THREE.Vector3(targetX, C.ballR + 0.02, THREE.MathUtils.randFloat(7.9, 10.1));\n  const flight = THREE.MathUtils.randFloat(1.08, 1.25);",
    "  const targetZ = player.z < 7.05 ? THREE.MathUtils.randFloat(Math.max(1.65, player.z - 1.1), Math.min(7.2, player.z + 1.5)) : THREE.MathUtils.randFloat(7.9, 10.1);\n  const target = new THREE.Vector3(targetX, C.ballR + 0.02, targetZ);\n  const flight = player.z < 7.05 ? THREE.MathUtils.randFloat(0.78, 1.02) : THREE.MathUtils.randFloat(1.08, 1.25);",
    'AI approach targets',
  );

  code = replaceOrThrow(
    code,
    "    if (started && ball.reset <= 0) serveAI();",
    "    if (started && ball.reset <= 0) beginNextPoint();",
    'point start',
  );

  code = replaceOrThrow(
    code,
    "    ball.bounces += 1;\n    if (Math.abs(ball.p.x) > C.halfW || Math.abs(ball.p.z) > C.halfL) return reset('Aut');",
    "    ball.bounces += 1;\n    if (ball.hitter === 'serve-toss') return reset('Servis kaçtı');\n    if (servePending && ball.hitter === 'player' && ball.bounces === 1) {\n      const serviceIn = ball.p.z <= -0.05 && ball.p.z >= -6.4 && Math.abs(ball.p.x) <= 4.115;\n      if (!serviceIn) return reset('Servis aut');\n      servePending = false;\n      serveState = 'live';\n      message('Servis içerde', 0.42);\n    }\n    if (Math.abs(ball.p.x) > C.halfW || Math.abs(ball.p.z) > C.halfL) return reset('Aut');",
    'serve box validation',
  );

  code = replaceOrThrow(
    code,
    "  if (ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > 8.1 && swing.state === 'swing') {",
    "  if (((ball.hitter === 'ai' && ball.v.z > 0) || ball.hitter === 'serve-toss') && swing.state === 'swing') {",
    'dynamic player contact',
  );

  code = replaceOrThrow(
    code,
    `document.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') reset('Yeni top');
});`,
    `window.addEventListener('webtennis:set-server', (event) => {
  pointServer = event.detail?.server === 'player' ? 'player' : 'ai';
  reset(pointServer === 'player' ? 'Sonraki point: sen servis' : 'Sonraki point: CPU servis');
});

document.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyR') reset('Yeni top');
  if (e.code === 'Space' && pointServer === 'player' && serveState === 'ready') tossPlayerServe();
  if (e.code === 'KeyT') {
    pointServer = pointServer === 'player' ? 'ai' : 'player';
    window.dispatchEvent(new CustomEvent('webtennis:server-changed', { detail: { server: pointServer } }));
    reset(pointServer === 'player' ? 'Sonraki point: sen servis' : 'Sonraki point: CPU servis');
  }
});`,
    'serve input',
  );

  return code;
}

function patchAudioBase(source) {
  let code = source;
  code = replaceOrThrow(
    code,
    'const clamp = THREE.MathUtils.clamp;',
    "const clamp = THREE.MathUtils.clamp;\nconst audioCategory = (name) => window.__wtAudioSettings?.[name] !== false;",
    'audio category helper',
  );
  code = replaceOrThrow(code, 'function playRacketImpact(power = 0.65, pan = 0, distant = false) {', "function playRacketImpact(power = 0.65, pan = 0, distant = false) {\n  if (!audioCategory('impact')) return;", 'impact category');
  code = replaceOrThrow(code, 'function playBounce(intensity = 0.55) {', "function playBounce(intensity = 0.55) {\n  if (!audioCategory('bounce')) return;", 'bounce category');
  code = replaceOrThrow(code, 'function cheer() {', "function cheer() {\n  if (!audioCategory('crowd')) return;", 'crowd category');
  code = replaceOrThrow(
    code,
    "  const target = !locked ? 0.004 : rallying ? 0.0015 : 0.022;",
    "  const target = !audioCategory('crowd') ? 0.0001 : !locked ? 0.004 : rallying ? 0.0015 : 0.022;",
    'crowd ambience toggle',
  );
  code = replaceOrThrow(
    code,
    `  const bus = A.ctx.createGain();
  bus.gain.value = distant ? 0.52 : 1;
  bus.connect(output);`,
    `  const bus = A.ctx.createGain();
  bus.gain.value = distant ? 0.52 : 1;
  bus.connect(output);
  // Short arena reflection: keeps the impact crisp but gives it court/stadium space.
  const reflection = A.ctx.createDelay(0.08);
  reflection.delayTime.value = distant ? 0.042 : 0.027;
  const reflectionGain = A.ctx.createGain();
  reflectionGain.gain.value = distant ? 0.08 : 0.12;
  bus.connect(reflection).connect(reflectionGain).connect(output);`,
    'impact arena reflection',
  );
  return code;
}

function patchAudioExtra(source) {
  let code = source;
  code = replaceOrThrow(
    code,
    'function soundEnabled() {',
    "const audioCategory = (name) => window.__wtAudioSettings?.[name] !== false;\n\nfunction soundEnabled() {",
    'extra audio helper',
  );
  code = replaceOrThrow(code, 'function playSqueak(intensity = 0.55, pan = 0) {', "function playSqueak(intensity = 0.55, pan = 0) {\n  if (!audioCategory('shoes')) return;", 'shoe category');
  code = replaceOrThrow(code, 'function playBreath(power = 0.65, recovery = false) {', "function playBreath(power = 0.65, recovery = false) {\n  if (!audioCategory('effort')) return;", 'effort category');
  code = replaceOrThrow(code, 'function playCrowdReaction(rally) {', "function playCrowdReaction(rally) {\n  if (!audioCategory('crowd')) return;", 'crowd reaction category');
  return code;
}

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'v08-match-flow',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('/src/main-v3.js')) return { code: patchMainV3(code), map: null };
        if (id.endsWith('/src/v07-audio.js')) return { code: patchAudioBase(code), map: null };
        if (id.endsWith('/src/v071-audio-extra.js')) return { code: patchAudioExtra(code), map: null };
        return null;
      },
    },
  ],
});
