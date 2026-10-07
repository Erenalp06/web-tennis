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

      // Backhand load position: readable strings, less camera occlusion.
      next = next.replace(
        `    } else {\n      racketTarget.set(player.x - 0.76, contactHeight, player.z + 0.04);\n      targetQuat.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n    }`,
        `    } else {\n      racketTarget.set(player.x - 0.48, contactHeight - 0.02, player.z - 0.42);\n      targetQuat.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n    }`,
      );

      // Backhand contact arc: bounded assist toward a reachable ball.
      next = next.replace(
        `    } else if (e < 0.58) {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.76, player.x - 0.04, contactP),\n        contactHeight + rise,\n        THREE.MathUtils.lerp(player.z + 0.04, player.z - 0.82, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.06 - swingLift * 0.12, 0.08, 0.05, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.04, player.x + 0.62, followP),\n        contactHeight + rise + followP * 0.22,\n        THREE.MathUtils.lerp(player.z - 0.82, player.z - 0.62, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.06, 0.08, 0.05, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.1, -0.7, -0.4, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
        `    } else if (e < 0.58) {\n      const ballIsReachable = ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > player.z - 3.2;\n      const assistedX = ballIsReachable\n        ? clamp(ball.p.x, player.x - 0.78, player.x + 0.28)\n        : player.x - 0.16;\n      const assistedY = ballIsReachable\n        ? THREE.MathUtils.lerp(contactHeight, clamp(ball.p.y, 0.78, 1.92), 0.42)\n        : contactHeight;\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.48, assistedX, contactP),\n        THREE.MathUtils.lerp(contactHeight - 0.02, assistedY, contactP) + rise,\n        THREE.MathUtils.lerp(player.z - 0.42, player.z - 0.96, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.04 - swingLift * 0.1, 0.025, 0.015, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.16, player.x + 0.68, followP),\n        contactHeight + rise + followP * 0.24,\n        THREE.MathUtils.lerp(player.z - 0.96, player.z - 0.58, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.04, 0.025, 0.015, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.08, -0.58, -0.34, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
      );

      // Add deliberate-input state. Passive pointer jitter must never choose a
      // stroke. Selection only happens while the left mouse button is held.
      next = next.replace(
        `let swingLift = 0;`,
        `let swingLift = 0;\nlet attackHeld = false;\nlet prepSelectTravel = 0;\nlet prepNeutralCooldown = 0;`,
      );

      // A completed/cancelled shot gets a short neutral window so a follow-
      // through cannot immediately arm the opposite side.
      next = next.replace(
        `  prepIntent = 0;\n  setStance('READY');\n}`,
        `  prepIntent = 0;\n  prepSelectTravel = 0;\n  prepNeutralCooldown = 0.18;\n  setStance('READY');\n}`,
      );

      next = next.replace(
        `  if (strokeState === 'ready') {\n    racketTarget.set(player.x + 0.42, contactHeight, player.z - 0.58);`,
        `  prepNeutralCooldown = Math.max(0, prepNeutralCooldown - dt);\n\n  if (strokeState === 'ready') {\n    prepIntent *= Math.exp(-7 * dt);\n    racketTarget.set(player.x + 0.42, contactHeight, player.z - 0.58);`,
      );

      // Replace passive gesture selection/release with hold-to-prepare.
      next = next.replace(
        `  if (strokeState === 'ready') {\n    prepIntent = clamp(prepIntent + dx, -70, 70);\n    if (prepIntent > 22) beginPreparation('forehand');\n    else if (prepIntent < -22) beginPreparation('backhand');\n  } else if (strokeState === 'prepared') {\n    const sameDirection = prepSide === 'forehand' ? dx > 0 : dx < 0;\n    const releaseDirection = prepSide === 'forehand' ? dx < 0 : dx > 0;\n    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.008, 0, 1);\n    if (releaseDirection && Math.abs(rawMouseVX) > 310) beginSwing();\n  } else if (strokeState === 'swing') {`,
        `  if (attackHeld && strokeState === 'ready' && prepNeutralCooldown <= 0) {\n    // Dead zone + travel threshold: deliberate direction choice, not jitter.\n    const gestureDx = Math.abs(dx) >= 1.5 ? dx : 0;\n    prepSelectTravel = clamp(prepSelectTravel + gestureDx, -90, 90);\n    if (prepSelectTravel > 42) beginPreparation('forehand');\n    else if (prepSelectTravel < -42) beginPreparation('backhand');\n  } else if (attackHeld && strokeState === 'prepared') {\n    // Once selected, the side is sticky. Extra movement only adds charge.\n    const sameDirection = prepSide === 'forehand' ? dx > 0 : dx < 0;\n    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.006, 0, 1);\n  } else if (strokeState === 'swing') {`,
      );

      // Mouse button owns the preparation lifecycle. Hold -> choose/charge,
      // release -> swing. Right click cancels a mistaken preparation.
      next = next.replace(
        `function lock() {`,
        `canvas.addEventListener('mousedown', (e) => {\n  if (document.pointerLockElement !== canvas) return;\n  if (e.button === 0 && (strokeState === 'ready' || strokeState === 'prepared')) {\n    attackHeld = true;\n    prepSelectTravel = 0;\n    if (strokeState === 'ready' && prepNeutralCooldown <= 0) setStance('VURUŞ YÖNÜ SEÇ');\n  }\n  if (e.button === 2 && strokeState === 'prepared') {\n    attackHeld = false;\n    cancelPreparation();\n  }\n});\n\ndocument.addEventListener('mouseup', (e) => {\n  if (e.button !== 0 || !attackHeld) return;\n  attackHeld = false;\n  prepSelectTravel = 0;\n  if (strokeState === 'prepared' && prepAge >= 0.08) beginSwing();\n  else if (strokeState === 'ready') setStance('READY');\n});\n\ndocument.addEventListener('contextmenu', (e) => e.preventDefault());\n\nfunction lock() {`,
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [v03GameplayTuning()],
});
