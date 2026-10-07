import baseConfig from './vite.config.v081.js';

function replaceOrThrow(code, from, to, label) {
  if (!code.includes(from)) throw new Error(`V0.8.2 patch point missing: ${label}`);
  return code.replace(from, to);
}

function patchModesAndServeTracking(source) {
  let code = source;

  code = replaceOrThrow(
    code,
    "let pointServer = 'ai';\nlet serveState = 'idle';\nlet servePending = false;",
    "let pointServer = 'ai';\nlet serveState = 'idle';\nlet servePending = false;\nlet gameMode = window.__wtGameMode === 'rally' ? 'rally' : 'serve';\nlet serveCameraBlend = 0;",
    'game mode state',
  );

  code = replaceOrThrow(
    code,
    'function preparePlayerServe() {',
    `function feedRally() {
  serveState = 'live';
  servePending = false;
  const tx = clamp(player.x + THREE.MathUtils.randFloat(-3.35, 3.35), -4.0, 4.0);
  ball.p.set(THREE.MathUtils.randFloat(-1.15, 1.15), 1.3, -9.65);
  ball.prev.copy(ball.p);
  ball.v.set((tx - ball.p.x) * 0.44, 5.05, THREE.MathUtils.randFloat(13.1, 15.0));
  const r = THREE.MathUtils.randFloat(850, 1450);
  ball.spin.set(r * Math.PI * 2 / 60, 0, 0);
  ball.active = true;
  ball.bounces = 0;
  ball.hitter = 'ai';
  ball.cooldown = 0.1;
  trailPts.length = 0;
  shotTypeEl.textContent = 'Rally feed';
  setStance('RALLY · READY');
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', { detail: { server: 'rally', state: 'live' } }));
}

function preparePlayerServe() {`,
    'rally feed function',
  );

  const oldBeginNextPoint = `function beginNextPoint() {
  if (pointServer === 'player') {
    preparePlayerServe();
    return;
  }

  if (serveState === 'prepare') return;
  serveState = 'prepare';
  servePending = false;
  ball.active = false;
  ball.reset = 999;
  shotTypeEl.textContent = 'CPU servis hazırlanıyor';
  setStance('CPU SERVİSİ · HAZIR');
  message('CPU servis için hazırlanıyor…', 1.15);
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', {
    detail: { server: 'ai', state: 'prepare', delayMs: 1550 },
  }));

  const launch = () => {
    if (!started || pointServer !== 'ai' || serveState !== 'prepare') return;
    if (document.pointerLockElement !== canvas) {
      window.setTimeout(launch, 220);
      return;
    }
    serveAI();
  };
  window.setTimeout(launch, 1550);
}`;

  const newBeginNextPoint = `function beginNextPoint() {
  if (gameMode === 'rally') {
    if (serveState === 'prepare') return;
    serveState = 'prepare';
    servePending = false;
    ball.active = false;
    ball.reset = 999;
    shotTypeEl.textContent = 'Rally hazırlanıyor';
    setStance('RALLY · READY');
    window.dispatchEvent(new CustomEvent('webtennis:serve-state', {
      detail: { server: 'rally', state: 'prepare', delayMs: 520 },
    }));

    const launchRally = () => {
      if (!started || gameMode !== 'rally' || serveState !== 'prepare') return;
      if (document.pointerLockElement !== canvas) {
        window.setTimeout(launchRally, 180);
        return;
      }
      feedRally();
    };
    window.setTimeout(launchRally, 520);
    return;
  }

  if (pointServer === 'player') {
    preparePlayerServe();
    return;
  }

  if (serveState === 'prepare') return;
  serveState = 'prepare';
  servePending = false;
  ball.active = false;
  ball.reset = 999;
  shotTypeEl.textContent = 'CPU servis hazırlanıyor';
  setStance('CPU SERVİSİ · HAZIR');
  message('CPU servis için hazırlanıyor…', 1.15);
  window.dispatchEvent(new CustomEvent('webtennis:serve-state', {
    detail: { server: 'ai', state: 'prepare', delayMs: 1550 },
  }));

  const launch = () => {
    if (!started || gameMode !== 'serve' || pointServer !== 'ai' || serveState !== 'prepare') return;
    if (document.pointerLockElement !== canvas) {
      window.setTimeout(launch, 220);
      return;
    }
    serveAI();
  };
  window.setTimeout(launch, 1550);
}`;
  code = replaceOrThrow(code, oldBeginNextPoint, newBeginNextPoint, 'mode-aware point start');

  const oldCamera = `function updateCamera(dt) {
  const moving = Math.hypot(player.vx, player.vz);
  const bob = moving > 0.4 ? Math.sin(performance.now() * 0.013) * 0.012 : 0;
  const desired = new THREE.Vector3(player.x, 1.78 + bob, player.z + 1.48);
  camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
  camera.lookAt(player.x * 0.13, 1.05, -2.1);
}`;

  const newCamera = `function updateCamera(dt) {
  const moving = Math.hypot(player.vx, player.vz);
  const bob = moving > 0.4 ? Math.sin(performance.now() * 0.013) * 0.012 : 0;
  const trackingServe = gameMode === 'serve' && pointServer === 'player' && serveState === 'toss' && ball.active && ball.hitter === 'serve-toss';
  const targetBlend = trackingServe ? 1 : 0;
  serveCameraBlend += (targetBlend - serveCameraBlend) * (1 - Math.exp(-9 * dt));

  const desired = new THREE.Vector3(
    player.x,
    1.78 + bob + serveCameraBlend * 0.14,
    player.z + 1.48 + serveCameraBlend * 0.08,
  );
  camera.position.lerp(desired, 1 - Math.exp(-12 * dt));

  const lookX = THREE.MathUtils.lerp(player.x * 0.13, ball.p.x * 0.72 + player.x * 0.28, serveCameraBlend);
  const lookY = THREE.MathUtils.lerp(1.05, clamp(ball.p.y - 0.06, 1.34, 2.95), serveCameraBlend);
  const lookZ = THREE.MathUtils.lerp(-2.1, ball.p.z - 0.28, serveCameraBlend);
  camera.lookAt(lookX, lookY, lookZ);

  const targetFov = 43 + serveCameraBlend * 5.5;
  if (Math.abs(camera.fov - targetFov) > 0.02) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-8 * dt));
    camera.updateProjectionMatrix();
  }
}`;
  code = replaceOrThrow(code, oldCamera, newCamera, 'serve ball camera tracking');

  code = replaceOrThrow(
    code,
    "window.addEventListener('webtennis:set-server', (event) => {",
    `window.addEventListener('webtennis:set-mode', (event) => {
  gameMode = event.detail?.mode === 'rally' ? 'rally' : 'serve';
  window.__wtGameMode = gameMode;
  document.body.dataset.gameMode = gameMode;
  serveCameraBlend = 0;
  reset(gameMode === 'rally' ? 'Rally modu' : 'Servis modu');
  window.dispatchEvent(new CustomEvent('webtennis:mode-changed', { detail: { mode: gameMode } }));
});

window.addEventListener('webtennis:set-server', (event) => {
  if (gameMode !== 'serve') return;`,
    'mode event listener',
  );

  code = replaceOrThrow(
    code,
    "  if (e.code === 'KeyT') {",
    "  if (e.code === 'KeyT' && gameMode === 'serve') {",
    'disable server hotkey in rally mode',
  );

  return code;
}

export default {
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    {
      name: 'v082-modes-and-serve-tracking',
      enforce: 'post',
      transform(code, id) {
        if (!id.endsWith('/src/main-v3.js')) return null;
        return { code: patchModesAndServeTracking(code), map: null };
      },
    },
  ],
};
