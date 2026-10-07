import { defineConfig } from 'vite';

// Gameplay tuning pass for V0.3. Kept as a Vite source transform so the patch
// stays small while we validate the new preparation mechanic in playtests.
function v03BackhandTuning() {
  return {
    name: 'v03-backhand-tuning',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/main-v2.js')) return null;

      let next = code;

      next = next.replace(
        `    } else {\n      racketTarget.set(player.x - 0.76, contactHeight, player.z + 0.04);\n      targetQuat.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n    }`,
        `    } else {\n      // Backhand preparation should load the racket, not hide the strings\n      // behind the player's shoulder. Keep it farther from the camera and\n      // only partially closed so the contact face stays readable.\n      racketTarget.set(player.x - 0.48, contactHeight - 0.02, player.z - 0.42);\n      targetQuat.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n    }`,
      );

      next = next.replace(
        `    } else if (e < 0.58) {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.76, player.x - 0.04, contactP),\n        contactHeight + rise,\n        THREE.MathUtils.lerp(player.z + 0.04, player.z - 0.82, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.14, 0.95, 0.28, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.06 - swingLift * 0.12, 0.08, 0.05, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.04, player.x + 0.62, followP),\n        contactHeight + rise + followP * 0.22,\n        THREE.MathUtils.lerp(player.z - 0.82, player.z - 0.62, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.06, 0.08, 0.05, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.1, -0.7, -0.4, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
        `    } else if (e < 0.58) {\n      // Small, bounded contact assist: movement still decides whether the\n      // player can reach the ball, but the backhand arc follows the nearby\n      // ball instead of missing it because of a few centimetres of timing.\n      const ballIsReachable = ball.hitter === 'ai' && ball.v.z > 0 && ball.p.z > player.z - 3.2;\n      const assistedX = ballIsReachable\n        ? clamp(ball.p.x, player.x - 0.78, player.x + 0.28)\n        : player.x - 0.16;\n      const assistedY = ballIsReachable\n        ? THREE.MathUtils.lerp(contactHeight, clamp(ball.p.y, 0.78, 1.92), 0.42)\n        : contactHeight;\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.48, assistedX, contactP),\n        THREE.MathUtils.lerp(contactHeight - 0.02, assistedY, contactP) + rise,\n        THREE.MathUtils.lerp(player.z - 0.42, player.z - 0.96, contactP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.1, 0.56, 0.16, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(0.04 - swingLift * 0.1, 0.025, 0.015, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, contactP);\n    } else {\n      racketTarget.set(\n        THREE.MathUtils.lerp(player.x - 0.16, player.x + 0.68, followP),\n        contactHeight + rise + followP * 0.24,\n        THREE.MathUtils.lerp(player.z - 0.96, player.z - 0.58, followP),\n      );\n      qa.setFromEuler(new THREE.Euler(0.04, 0.025, 0.015, 'YXZ'));\n      qb.setFromEuler(new THREE.Euler(-0.08, -0.58, -0.34, 'YXZ'));\n      targetQuat.slerpQuaternions(qa, qb, followP);\n    }`,
      );

      next = next.replace(
        `    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.008, 0, 1);\n    if (releaseDirection && Math.abs(rawMouseVX) > 310) beginSwing();`,
        `    if (sameDirection) prepCharge = clamp(prepCharge + Math.abs(dx) * 0.008, 0, 1);\n    const releaseThreshold = prepSide === 'backhand' ? 190 : 250;\n    if (releaseDirection && Math.abs(rawMouseVX) > releaseThreshold) beginSwing();`,
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [v03BackhandTuning()],
});
