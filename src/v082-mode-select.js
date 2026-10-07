const startScreen = document.querySelector('#startScreen');
const startCard = startScreen?.querySelector('.start-card');
const startButton = document.querySelector('#startButton');

window.__wtGameMode = window.__wtGameMode || 'serve';

const style = document.createElement('style');
style.textContent = `
  #modeSelector {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:12px;
    margin:18px 0 14px;
  }
  .mode-card {
    min-height:118px;
    padding:15px;
    text-align:left;
    border-radius:16px;
    border:1px solid rgba(255,255,255,.11);
    background:linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
    color:#fff;
    cursor:pointer;
    transition:transform .16s ease, border-color .16s ease, background .16s ease;
  }
  .mode-card:hover {
    transform:translateY(-2px);
    border-color:rgba(217,255,72,.34);
    background:linear-gradient(180deg, rgba(217,255,72,.08), rgba(255,255,255,.025));
  }
  .mode-card .mode-kicker {
    display:block;
    margin-bottom:7px;
    color:#d9ff48;
    font:800 9px/1 system-ui,sans-serif;
    letter-spacing:.16em;
  }
  .mode-card strong {
    display:block;
    margin-bottom:7px;
    font:800 17px/1.1 system-ui,sans-serif;
  }
  .mode-card small {
    display:block;
    color:rgba(255,255,255,.58);
    font:500 10px/1.45 system-ui,sans-serif;
  }
  #modeBadge {
    position:fixed;
    top:15px;
    right:355px;
    z-index:54;
    padding:8px 11px;
    border:1px solid rgba(255,255,255,.12);
    border-radius:999px;
    background:rgba(4,14,30,.58);
    backdrop-filter:blur(12px);
    color:rgba(255,255,255,.72);
    font:800 9px/1 system-ui,sans-serif;
    letter-spacing:.12em;
    pointer-events:none;
  }
  #startScreen:not(.mode-chosen) #startButton { display:none; }
  #startScreen.mode-chosen #modeSelector { display:none; }
  body[data-game-mode='rally'] #serveModeToggle,
  body[data-game-mode='rally'] #serveCoach,
  body[data-game-mode='rally'] #serveHint { display:none !important; }
  body[data-game-mode='rally'] #v08Controls { right:165px; }
  @media (max-width:720px) {
    #modeSelector { grid-template-columns:1fr; }
    #modeBadge { right:18px; top:54px; }
  }
`;
document.head.appendChild(style);

if (startCard && startButton) {
  const selector = document.createElement('div');
  selector.id = 'modeSelector';
  selector.innerHTML = `
    <button class="mode-card" data-mode="rally">
      <span class="mode-kicker">PRACTICE</span>
      <strong>Rally Modu</strong>
      <small>Servis yok. CPU sana düzenli top besler; direkt rally, yaklaşma ve vole çalışırsın.</small>
    </button>
    <button class="mode-card" data-mode="serve">
      <span class="mode-kicker">MATCH FLOW</span>
      <strong>Servis Modu</strong>
      <small>Point senin veya CPU'nun servisiyle başlar. Toss, return ve servis kutusu kontrolü aktif.</small>
    </button>
  `;
  startCard.insertBefore(selector, startButton);

  const badge = document.createElement('div');
  badge.id = 'modeBadge';
  badge.textContent = 'MOD SEÇ';
  document.body.appendChild(badge);

  function renderMode(mode) {
    document.body.dataset.gameMode = mode;
    badge.textContent = mode === 'rally' ? 'MOD · RALLY' : 'MOD · SERVİS';
  }

  function chooseMode(mode) {
    window.__wtGameMode = mode;
    renderMode(mode);
    startScreen.classList.add('mode-chosen');
    window.dispatchEvent(new CustomEvent('webtennis:set-mode', { detail: { mode } }));
    window.setTimeout(() => startButton.click(), 0);
  }

  selector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    chooseMode(button.dataset.mode === 'rally' ? 'rally' : 'serve');
  });

  window.addEventListener('webtennis:mode-changed', (event) => {
    renderMode(event.detail?.mode === 'rally' ? 'rally' : 'serve');
  });

  renderMode(window.__wtGameMode);
}
