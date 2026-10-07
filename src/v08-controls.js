const STORAGE_KEY = 'web-tennis-audio-settings-v1';
const defaults = {
  impact: true,
  bounce: true,
  shoes: true,
  effort: true,
  crowd: true,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...defaults, ...saved };
  } catch {
    return { ...defaults };
  }
}

window.__wtAudioSettings = loadSettings();

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__wtAudioSettings));
  window.dispatchEvent(new CustomEvent('webtennis:audio-settings', {
    detail: { ...window.__wtAudioSettings },
  }));
}

const style = document.createElement('style');
style.textContent = `
  #v08Controls {
    position: fixed;
    top: 15px;
    right: 165px;
    z-index: 55;
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .v08-pill {
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(4,14,30,.62);
    color: rgba(255,255,255,.84);
    backdrop-filter: blur(12px);
    border-radius: 999px;
    padding: 8px 12px;
    font: 800 9px/1 system-ui, sans-serif;
    letter-spacing: .12em;
    cursor: pointer;
  }
  .v08-pill:hover { border-color: rgba(255,255,255,.28); color: #fff; }
  #serveModeToggle[data-server="player"] { color: #d9ff48; border-color: rgba(217,255,72,.34); }
  #audioSettingsPanel {
    position: fixed;
    top: 54px;
    right: 92px;
    z-index: 60;
    width: 240px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,.13);
    background: rgba(5,15,31,.92);
    box-shadow: 0 18px 50px rgba(0,0,0,.32);
    backdrop-filter: blur(18px);
    border-radius: 16px;
    color: #fff;
    font-family: system-ui, sans-serif;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-8px) scale(.98);
    transition: opacity .16s ease, transform .16s ease;
  }
  #audioSettingsPanel.open { opacity: 1; pointer-events: auto; transform: none; }
  #audioSettingsPanel h3 { margin: 0 0 4px; font-size: 12px; letter-spacing: .12em; }
  #audioSettingsPanel p { margin: 0 0 12px; color: rgba(255,255,255,.46); font-size: 10px; line-height: 1.4; }
  .audio-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid rgba(255,255,255,.07);
    font-size: 11px;
  }
  .audio-row input { accent-color: #d9ff48; width: 16px; height: 16px; }
  #volleyBadge {
    position: fixed;
    left: 50%;
    bottom: 102px;
    transform: translateX(-50%) translateY(8px);
    z-index: 32;
    border: 1px solid rgba(217,255,72,.24);
    background: rgba(7,24,34,.7);
    color: #d9ff48;
    padding: 7px 11px;
    border-radius: 999px;
    font: 800 9px/1 system-ui, sans-serif;
    letter-spacing: .14em;
    opacity: 0;
    transition: opacity .18s ease, transform .18s ease;
    pointer-events: none;
  }
  #volleyBadge.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
  #serveHint {
    position: fixed;
    left: 50%;
    top: 82px;
    transform: translateX(-50%);
    z-index: 31;
    padding: 7px 12px;
    border-radius: 999px;
    background: rgba(4,14,30,.64);
    border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.72);
    font: 800 9px/1 system-ui, sans-serif;
    letter-spacing: .12em;
    opacity: 0;
    transition: opacity .18s ease;
    pointer-events: none;
  }
  #serveHint.visible { opacity: 1; }
`;
document.head.appendChild(style);

const controls = document.createElement('div');
controls.id = 'v08Controls';
controls.innerHTML = `
  <button id="serveModeToggle" class="v08-pill" data-server="ai">SERVİS: CPU</button>
  <button id="audioSettingsButton" class="v08-pill">SES AYARLARI</button>
`;
document.body.appendChild(controls);

const panel = document.createElement('div');
panel.id = 'audioSettingsPanel';
panel.innerHTML = `
  <h3>SES AYARLARI</h3>
  <p>Kort seslerini ayrı ayrı açıp kapatabilirsin.</p>
  <label class="audio-row"><span>Raket / top teması</span><input type="checkbox" data-audio="impact"></label>
  <label class="audio-row"><span>Top sekmesi</span><input type="checkbox" data-audio="bounce"></label>
  <label class="audio-row"><span>Ayakkabı squeak</span><input type="checkbox" data-audio="shoes"></label>
  <label class="audio-row"><span>Nefes / efor</span><input type="checkbox" data-audio="effort"></label>
  <label class="audio-row"><span>Seyirci / atmosfer</span><input type="checkbox" data-audio="crowd"></label>
`;
document.body.appendChild(panel);

for (const input of panel.querySelectorAll('[data-audio]')) {
  const key = input.dataset.audio;
  input.checked = window.__wtAudioSettings[key] !== false;
  input.addEventListener('change', () => {
    window.__wtAudioSettings[key] = input.checked;
    saveSettings();
  });
}

document.querySelector('#audioSettingsButton')?.addEventListener('click', (event) => {
  event.stopPropagation();
  panel.classList.toggle('open');
});
document.addEventListener('click', (event) => {
  if (!panel.contains(event.target) && event.target?.id !== 'audioSettingsButton') panel.classList.remove('open');
});

const serveButton = document.querySelector('#serveModeToggle');
let server = 'ai';
function renderServer() {
  serveButton.dataset.server = server;
  serveButton.textContent = server === 'player' ? 'SERVİS: SEN' : 'SERVİS: CPU';
}
serveButton.addEventListener('click', () => {
  server = server === 'ai' ? 'player' : 'ai';
  renderServer();
  window.dispatchEvent(new CustomEvent('webtennis:set-server', { detail: { server } }));
});
window.addEventListener('webtennis:server-changed', (event) => {
  server = event.detail?.server === 'player' ? 'player' : 'ai';
  renderServer();
});

const volleyBadge = document.createElement('div');
volleyBadge.id = 'volleyBadge';
volleyBadge.textContent = 'VOLE BÖLGESİ · TOP SEKMEDEN VUR';
document.body.appendChild(volleyBadge);

const serveHint = document.createElement('div');
serveHint.id = 'serveHint';
document.body.appendChild(serveHint);
window.addEventListener('webtennis:serve-state', (event) => {
  const detail = event.detail || {};
  if (detail.server === 'player' && detail.state === 'ready') {
    serveHint.textContent = 'SPACE · TOSS   →   MOUSE GESTURE · SERVİS';
    serveHint.classList.add('visible');
  } else if (detail.server === 'player' && detail.state === 'toss') {
    serveHint.textContent = 'SWING ÇİZ · APEXE YAKIN BIRAK';
    serveHint.classList.add('visible');
  } else {
    serveHint.classList.remove('visible');
  }
});

function uiFrame() {
  requestAnimationFrame(uiFrame);
  const volley = document.body.dataset.volleyZone === 'true';
  volleyBadge.classList.toggle('visible', volley && document.pointerLockElement?.id === 'game');
}
requestAnimationFrame(uiFrame);

renderServer();
