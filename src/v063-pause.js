import * as THREE from 'three';

let paused = document.pointerLockElement?.id !== 'game';

const style = document.createElement('style');
style.id = 'v063-gameplay-polish-style';
style.textContent = `
  #powerTelemetry { display: none !important; }
  html[data-game-paused="1"] #stance { opacity: .55; }
`;
document.head.appendChild(style);

const nativeGetDelta = THREE.Clock.prototype.getDelta;
THREE.Clock.prototype.getDelta = function v063PausedDelta() {
  const delta = nativeGetDelta.call(this);
  return paused ? 0 : delta;
};

function releaseMovementKeys() {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    document.dispatchEvent(new KeyboardEvent('keyup', { code, key: code, bubbles: true }));
  }
}

function setPaused(next) {
  if (paused === next) return;
  paused = next;
  document.documentElement.dataset.gamePaused = paused ? '1' : '0';
  if (paused) releaseMovementKeys();
}

function syncPointerLock() {
  setPaused(document.pointerLockElement?.id !== 'game');
}

document.documentElement.dataset.gamePaused = paused ? '1' : '0';
document.addEventListener('pointerlockchange', syncPointerLock);
window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', syncPointerLock);
