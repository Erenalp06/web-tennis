import baseConfig from './vite.config.js';

function replaceOrThrow(code, from, to, label) {
  if (!code.includes(from)) throw new Error(`V0.8.1 patch point missing: ${label}`);
  return code.replace(from, to);
}

function patchServeFlow(source) {
  let code = source;

  code = replaceOrThrow(
    code,
    `function beginNextPoint() {
  if (pointServer === 'player') preparePlayerServe();
  else serveAI();
}`,
    `function beginNextPoint() {
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
}`,
    'CPU pre-serve delay',
  );

  code = replaceOrThrow(
    code,
    `  const targetZ = THREE.MathUtils.randFloat(3.8, 5.75);
  const flight = THREE.MathUtils.randFloat(0.63, 0.69);`,
    `  const targetZ = THREE.MathUtils.randFloat(3.75, 5.45);
  // A slightly longer ballistic arc gives the CPU serve reliable net clearance
  // while keeping the landing point inside the service box.
  const flight = THREE.MathUtils.randFloat(0.72, 0.77);`,
    'CPU serve arc',
  );

  code = replaceOrThrow(
    code,
    `  ball.p.set(startX, 2.58, -11.38);`,
    `  ball.p.set(startX, 2.66, -11.38);`,
    'CPU serve contact height',
  );

  return code;
}

export default {
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    {
      name: 'v081-serve-flow-fix',
      enforce: 'post',
      transform(code, id) {
        if (!id.endsWith('/src/main-v3.js')) return null;
        return { code: patchServeFlow(code), map: null };
      },
    },
  ],
};
