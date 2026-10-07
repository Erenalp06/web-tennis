import baseConfig from './vite.config.v082.js';

function replaceOrThrow(code, from, to, label) {
  if (!code.includes(from)) throw new Error(`V0.8.3 patch point missing: ${label}`);
  return code.replace(from, to);
}

function patchServeBallistics(source) {
  let code = source;

  const oldVelocity = `  const speed = clamp(racketV.length(), 0, 42);
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
  ball.v.copy(dir.multiplyScalar(exit));`;

  const newVelocity = `  const speed = clamp(racketV.length(), 0, 42);
  const q = 0.56 + c.q * 0.44;
  const horizontalAim = clamp(swing.aim * (serving ? 0.48 : 0.36) + c.x * 0.7, -0.68, 0.68);
  let exit;

  if (serving) {
    // Serve power now controls the time-to-target rather than simply scaling a
    // downward vector. This keeps strong serves above the net while still
    // landing them inside the opposite service box.
    const racketDrive = clamp(speed / 32, 0, 1);
    const gestureDrive = clamp(swing.power * 0.74 + racketDrive * 0.26, 0, 1);
    const contactDrive = clamp(gestureDrive * q, 0.18, 1);
    const targetX = clamp(horizontalAim * 4.6, -3.75, 3.75);
    const targetZ = THREE.MathUtils.lerp(-4.15, -5.65, contactDrive);
    const flight = THREE.MathUtils.lerp(0.56, 0.36, contactDrive);
    const targetY = C.ballR + 0.015;

    ball.v.set(
      (targetX - ball.p.x) / flight,
      (targetY - ball.p.y + 0.5 * 9.81 * flight * flight) / flight,
      (targetZ - ball.p.z) / flight,
    );
    exit = ball.v.length();
  } else {
    exit = clamp((10.2 + speed * 0.72 + swing.power * 7.5 + (volley ? 2.2 : 0)) * q, 10, 39);
    const vertical = volley
      ? clamp(0.045 + swing.lift * 0.04 + Math.max(0, racketV.y) * 0.004, 0.012, 0.14)
      : clamp(0.12 + swing.lift * 0.085 + Math.max(0, racketV.y) * 0.008, 0.035, 0.36);
    const dir = new THREE.Vector3(horizontalAim, vertical, -1).normalize();
    ball.v.copy(dir.multiplyScalar(exit));
  }`;

  code = replaceOrThrow(code, oldVelocity, newVelocity, 'targeted player serve ballistics');
  return code;
}

export default {
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins ?? []),
    {
      name: 'v083-serve-ballistics',
      enforce: 'post',
      transform(code, id) {
        if (!id.endsWith('/src/main-v3.js')) return null;
        return { code: patchServeBallistics(code), map: null };
      },
    },
  ],
};
