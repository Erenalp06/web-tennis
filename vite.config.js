import { defineConfig } from 'vite';

// V0.3 is still in feel-tuning mode. Keep these small gameplay patches here
// until the preparation model survives playtesting, then fold them into the
// source state machine.
function v03GameplayTuning() {
  return {
    name: 'v03-gameplay-tuning',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/main-v2.js')) return null;

      let next = code;

      next = next.replace(
        `const stanceEl = $('#stance');`,
        `const stanceEl = $('#stance');\nconst timingGuide = $('#timingGuide');\nconst timingLabel = $('#timingLabel');\nconst timingHint = $('#timingHint');`,
      );

      next = next.replace(
        `    } else {\n      racketTarget.set(player.x - 0.76, contactHeight, player.z + 0.04);\n      targetQuat.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n    }`,
        `    } else {\n      racketTarget.set(player.x - 0.48, contactHeight - 0.02, player.z - 0.42);\n      targetQuat.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n    }`,
      );

      next = next.replace(
        `    } else if (e < 0.58) {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.76, player.x - 0.04, contactP),\n        contactHeight + rise,\n        THREE.MathUtils.lerp(player.z + 0.04, player.z - 0.82, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.06 - swingLift * 0.12, 0.08, 0.05, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.04, player.x + 0.62, followP),\n        contactHeight + rise + followP * 0.22,\n        THREE.MathUtils.lerp(player.z - 0.82, player.z - 0.62, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.06, 0.08, 0.05, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.1, -0.7, -0.4, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
        `    } else if (e < 0.58) {\n      const ballIsReachable = ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > player.z - 3.2;\n      const assistedX = ballIsReachable\n        ? clamp(ball.p.x, player.x - 0.78, player.x + 0.28)\n        : player.x - 0.16;\n      const assistedY = ballIsReachable\n        ? THREE.MathUtils.lerp(contactHeight, clamp(ball.p.y, 0.78, 1.92), 0.42)\n        : contactHeight;\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.48, assistedX, contactP),\n        THREE.MathUtils.lerp(contactHeight - 0.02, assistedY, contactP) + rise,\n        THREE.MathUtils.lerp(player.z - 0.42, player.z - 0.96, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.04 - swingLift * 0.1, 0.025, 0.015, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.16, player.x + 0.68, followP),\n        contactHeight + rise + followP * 0.24,\n        THREE.MathUtils.lerp(player.z - 0.96, player.z - 0.58, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.04, 0.025, 0.015, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.08, -0.58, -0.34, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
      );

      next = next.replace(
        `let swingLift = 0;`,
        `let swingLift = 0;\nlet attackHeld = false;\nlet prepSelectTravel = 0;\nlet prepNeutralCooldown = 0;\nlet lastTimingGrade = '';`,
      );

      next = next.replace(
        `function predictedNetHeight(initialV, initialSpin) {`,
        `function predictPlayerContact(maxT = 1.05) {\n  if (!ball.active || ball.hitter !== 'ai' || ball.v.z <= 0) return null;\n\n  const p = ball.p.clone();\n  const v = ball.v.clone();\n  const spin = ball.spin.clone();\n  const contactZ = player.z - 0.92;\n  const step = 1 / 120;\n\n  if (p.z >= contactZ) {\n    return { t: 0, point: p.clone(), lateral: p.x - player.x };\n  }\n\n  const previous = p.clone();\n  const maxSteps = Math.ceil(maxT / step);\n  for (let i = 1; i <= maxSteps; i += 1) {\n    previous.copy(p);\n    integratePreview(p, v, spin, step);\n    if (previous.z < contactZ && p.z >= contactZ) {\n      const dz = p.z - previous.z;\n      const ratio = clamp((contactZ - previous.z) / Math.max(0.0001, dz), 0, 1);\n      const point = previous.clone().lerp(p, ratio);\n      return {\n        t: (i - 1 + ratio) * step,\n        point,\n        lateral: point.x - player.x,\n      };\n    }\n  }\n  return null;\n}\n\nfunction updateTimingGuide() {\n  if (!timingGuide) return;\n  const prediction = started ? predictPlayerContact(1.05) : null;\n  if (!prediction || prediction.t > 1.02) {\n    timingGuide.classList.remove('visible');\n    return;\n  }\n\n  const projected = ball.p.clone().project(camera);\n  if (projected.z < -1 || projected.z > 1.2) {\n    timingGuide.classList.remove('visible');\n    return;\n  }\n\n  timingGuide.classList.add('visible');\n  timingGuide.style.left = ((projected.x * 0.5 + 0.5) * innerWidth) + 'px';\n  timingGuide.style.top = ((-projected.y * 0.5 + 0.5) * innerHeight) + 'px';\n  timingGuide.style.setProperty('--ring-scale', String(clamp(0.82 + prediction.t * 0.82, 0.82, 1.62)));\n\n  const lateral = prediction.lateral;\n  const reachable = Math.abs(lateral) <= 0.98;\n  const recommended = lateral < -0.08 ? 'BACKHAND' : 'FOREHAND';\n\n  if (!reachable) {\n    timingGuide.dataset.state = 'move';\n    timingLabel.textContent = lateral > 0 ? 'SAĞA GİT' : 'SOLA GİT';\n    timingHint.textContent = 'Top temas noktasından ' + Math.abs(lateral).toFixed(1) + ' m uzakta';\n    return;\n  }\n\n  if (prediction.t > 0.52) {\n    timingGuide.dataset.state = 'prepare';\n    timingLabel.textContent = 'HAZIRLAN';\n    timingHint.textContent = recommended + " için sol mouse'a bas";\n  } else if (prediction.t > 0.34) {\n    timingGuide.dataset.state = 'arm';\n    timingLabel.textContent = 'YÖNÜ SEÇ';\n    timingHint.textContent = recommended === 'FOREHAND' ? 'Mouse sağa · forehand' : 'Mouse sola · backhand';\n  } else if (prediction.t >= 0.10) {\n    timingGuide.dataset.state = 'hit';\n    timingLabel.textContent = 'ŞİMDİ BIRAK';\n    timingHint.textContent = recommended + ' temas penceresi';\n  } else {\n    timingGuide.dataset.state = 'late';\n    timingLabel.textContent = 'GEÇ';\n    timingHint.textContent = 'Sonraki top için daha erken bırak';\n  }\n}\n\nfunction predictedNetHeight(initialV, initialSpin) {`,
      );

      next = next.replace(
        `function beginSwing() {\n  if (strokeState !== 'prepared' || !prepSide) return;\n  strokeState = 'swing';\n  swingPhase = 0;\n  swingDuration = THREE.MathUtils.lerp(0.31, 0.17, clamp(prepCharge, 0, 1));\n  swingLift = clamp(mouseVY / 18, -0.28, 0.72);\n  setStance(prepSide === 'forehand' ? 'FOREHAND' : 'BACKHAND', prepSide);\n}`,
        `function beginSwing() {\n  if (strokeState !== 'prepared' || !prepSide) return;\n  strokeState = 'swing';\n  swingPhase = 0;\n\n  const naturalDuration = THREE.MathUtils.lerp(0.38, 0.25, clamp(prepCharge, 0, 1));\n  const prediction = predictPlayerContact(0.72);\n  if (prediction && Math.abs(prediction.lateral) <= 1.05 && prediction.t >= 0.075 && prediction.t <= 0.48) {\n    swingDuration = clamp(prediction.t / 0.58, 0.24, 0.78);\n    lastTimingGrade = prediction.t > 0.38 ? 'ERKEN' : prediction.t < 0.105 ? 'GEÇ' : 'İYİ';\n  } else {\n    swingDuration = naturalDuration;\n    lastTimingGrade = prediction ? (prediction.t > 0.48 ? 'ERKEN' : 'GEÇ') : '';\n  }\n\n  swingLift = clamp(mouseVY / 18, -0.28, 0.72);\n  setStance(prepSide === 'forehand' ? 'FOREHAND' : 'BACKHAND', prepSide);\n}`,
      );

      next = next.replace(
        `    const e = 1 - (1 - swingPhase) ** 3;\n    const contactP = clamp(e / 0.58, 0, 1);\n    const followP = clamp((e - 0.58) / 0.42, 0, 1);`,
        `    const e = swingPhase < 0.58\n      ? THREE.MathUtils.smoothstep(swingPhase, 0, 0.58) * 0.58\n      : 0.58 + THREE.MathUtils.smoothstep(swingPhase, 0.58, 1) * 0.42;\n    const contactP = clamp(e / 0.58, 0, 1);\n    const followP = clamp((e - 0.58) / 0.42, 0, 1);`,
      );

      next = next.replace(
        `  const rx = playerRacket.userData.rx + C.ballR + 0.028;\n  const ry = playerRacket.userData.ry + C.ballR + 0.028;\n  const rz = C.ballR + 0.052;`,
        `  const contactAssist = strokeState === 'swing' ? 0.055 : 0;\n  const rx = playerRacket.userData.rx + C.ballR + 0.028 + contactAssist;\n  const ry = playerRacket.userData.ry + C.ballR + 0.028 + contactAssist * 0.8;\n  const rz = C.ballR + 0.052 + contactAssist * 0.65;`,
      );
      next = next.replace(
        `  for (let i = 0; i <= 14; i += 1) {\n    const t = i / 14;`,
        `  for (let i = 0; i <= 20; i += 1) {\n    const t = i / 20;`,
      );

      next = next.replace(
        "  message(c.q > 0.62 ? `${sideName} · sweet spot` : `${sideName} · temas`, 0.45);",
        "  const timingText = lastTimingGrade ? ' · zamanlama ' + lastTimingGrade.toLowerCase() : '';\n  message((c.q > 0.62 ? sideName + ' · sweet spot' : sideName + ' · temas') + timingText, 0.62);\n  lastTimingGrade = '';",
      );

      next = next.replace(
        `  prepIntent = 0;\n  setStance('READY');\n}`,
        `  prepIntent = 0;\n  prepSelectTravel = 0;\n  prepNeutralCooldown = 0.18;\n  setStance('READY');\n}`,
      );

      next = next.replace(
        `  if (strokeState === 'ready') {\n    racketTarget.set(player.x + 0.42, contactHeight, player.z - 0.58);`,
        `  prepNeutralCooldown = Math.max(0, prepNeutralCooldown - dt);\n\n  if (strokeState === 'ready') {\n    prepIntent *= Math.exp(-7 * dt);\n    racketTarget.set(player.x + 0.42, contactHeight, player.z - 0.58);`,
      );

      next = next.replace(
        `  if (strokeState === 'ready') {\n    prepIntent = clamp(prepIntent + dx, -70, 70);\n    if (prepIntent > 22) beginPreparation('forehand');\n    else if (prepIntent < -22) beginPreparation('backhand');\n  } else if (strokeState === 'prepared') {\n    const sameDirection = prepSide === 'forehand' ? dx > 0 : dx < 0;\n    const releaseDirection = prepSide === 'forehand' ? dx < 0 : dx > 0;\n    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.008, 0, 1);\n    if (releaseDirection && Math.abs(rawMouseVX) > 310) beginSwing();\n  } else if (strokeState === 'swing') {`,
        `  if (attackHeld && strokeState === 'ready' && prepNeutralCooldown <= 0) {\n    const gestureDx = Math.abs(dx) >= 1.5 ? dx : 0;\n    prepSelectTravel = clamp(prepSelectTravel + gestureDx, -90, 90);\n    if (prepSelectTravel > 42) beginPreparation('forehand');\n    else if (prepSelectTravel < -42) beginPreparation('backhand');\n  } else if (attackHeld && strokeState === 'prepared') {\n    const sameDirection = prepSide === 'forehand' ? dx > 0 : dx < 0;\n    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.006, 0, 1);\n  } else if (strokeState === 'swing') {`,
      );

      next = next.replace(
        `function lock() {`,
        `canvas.addEventListener('mousedown', (e) => {\n  if (document.pointerLockElement !== canvas) return;\n  if (e.button === 0 && (strokeState === 'ready' || strokeState === 'prepared')) {\n    attackHeld = true;\n    prepSelectTravel = 0;\n    if (strokeState === 'ready' && prepNeutralCooldown <= 0) setStance('VURUŞ YÖNÜ SEÇ');\n  }\n  if (e.button === 2 && strokeState === 'prepared') {\n    attackHeld = false;\n    cancelPreparation();\n  }\n});\n\ndocument.addEventListener('mouseup', (e) => {\n  if (e.button !== 0 || !attackHeld) return;\n  attackHeld = false;\n  prepSelectTravel = 0;\n  if (strokeState === 'prepared' && prepAge >= 0.08) beginSwing();\n  else if (strokeState === 'ready') setStance('READY');\n});\n\ndocument.addEventListener('contextmenu', (e) => e.preventDefault());\n\nfunction lock() {`,
      );

      next = next.replace(
        `  sync();\n  renderer.render(scene, camera);`,
        `  sync();\n  updateTimingGuide();\n  renderer.render(scene, camera);`,
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [v03GameplayTuning()],
});
