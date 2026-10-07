const startScreen = document.querySelector('#startScreen');
const startCard = startScreen?.querySelector('.start-card');
const startButton = document.querySelector('#startButton');

window.__wtGameMode = window.__wtGameMode || 'serve';
let hasEnteredCourt = false;

const style = document.createElement('style');
style.textContent = `
  #startScreen .start-card {
    width:min(520px, calc(100vw - 34px));
    padding:26px;
    border-radius:22px;
    border:1px solid rgba(154,190,229,.19);
    background:
      linear-gradient(180deg, rgba(7,20,39,.96), rgba(5,15,30,.94)),
      radial-gradient(circle at 100% 0%, rgba(88,167,255,.12), transparent 46%);
    box-shadow:0 30px 90px rgba(0,0,0,.44), inset 0 1px rgba(255,255,255,.035);
    backdrop-filter:blur(18px);
  }
  #startScreen .start-card .eyebrow {
    margin-bottom:7px;
    color:#79baff;
    font:800 9px/1 system-ui,sans-serif;
    letter-spacing:.2em;
  }
  #startScreen .start-card h1 {
    margin:0;
    font:850 clamp(28px,4vw,38px)/1 system-ui,sans-serif;
    letter-spacing:-.045em;
  }
  #startScreen .start-card > p {
    max-width:440px;
    margin:11px 0 18px;
    color:rgba(223,233,244,.64);
    font-size:12px;
    line-height:1.55;
  }
  #modeSelector {
    display:grid;
    gap:8px;
    margin:16px 0 12px;
  }
  #startScreen #modeSelector .mode-card {
    all:unset;
    box-sizing:border-box;
    display:grid;
    grid-template-columns:42px minmax(0,1fr) 28px;
    gap:12px;
    align-items:center;
    width:100%;
    min-height:76px;
    padding:11px 12px;
    border:1px solid rgba(255,255,255,.085);
    border-radius:13px;
    background:rgba(255,255,255,.028);
    color:#fff;
    cursor:pointer;
    transition:transform .14s ease, border-color .14s ease, background .14s ease, box-shadow .14s ease;
  }
  #startScreen #modeSelector .mode-card:hover {
    transform:translateX(3px);
    border-color:rgba(120,186,255,.34);
    background:rgba(91,154,224,.075);
  }
  #startScreen #modeSelector .mode-card.active {
    border-color:rgba(217,255,72,.34);
    background:linear-gradient(90deg, rgba(217,255,72,.085), rgba(255,255,255,.025) 62%);
    box-shadow:inset 3px 0 #d9ff48;
  }
  .mode-icon {
    width:40px;
    height:40px;
    display:grid;
    place-items:center;
    border-radius:10px;
    background:rgba(255,255,255,.055);
    border:1px solid rgba(255,255,255,.08);
    color:#9dcfff;
    font:850 13px/1 system-ui,sans-serif;
    letter-spacing:.04em;
  }
  .mode-card.active .mode-icon {
    color:#d9ff48;
    border-color:rgba(217,255,72,.22);
    background:rgba(217,255,72,.06);
  }
  .mode-copy { min-width:0; }
  .mode-copy .mode-kicker {
    display:block;
    margin-bottom:4px;
    color:rgba(157,207,255,.72);
    font:800 8px/1 system-ui,sans-serif;
    letter-spacing:.17em;
  }
  .mode-copy strong {
    display:block;
    margin:0 0 3px;
    font:780 15px/1.1 system-ui,sans-serif;
  }
  .mode-copy small {
    display:block;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:rgba(222,232,243,.5);
    font:500 10px/1.35 system-ui,sans-serif;
  }
  .mode-arrow {
    width:25px;
    height:25px;
    display:grid;
    place-items:center;
    border-radius:50%;
    color:rgba(255,255,255,.32);
    border:1px solid rgba(255,255,255,.08);
    font:700 13px/1 system-ui,sans-serif;
    transition:color .14s ease, border-color .14s ease, transform .14s ease;
  }
  .mode-card:hover .mode-arrow { color:#fff; border-color:rgba(255,255,255,.22); transform:translateX(2px); }
  .mode-card.active .mode-arrow { color:#d9ff48; border-color:rgba(217,255,72,.2); }
  #modeFooter {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-top:10px;
    color:rgba(255,255,255,.34);
    font:650 9px/1.3 system-ui,sans-serif;
    letter-spacing:.025em;
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
  #startScreen:not(.menu-return):not(.mode-chosen) #startButton { display:none !important; }
  #startScreen.mode-chosen #modeSelector,
  #startScreen.mode-chosen #modeFooter { display:none; }
  #startScreen.menu-return #startButton {
    display:flex !important;
    width:100%;
    min-height:44px;
    margin-top:11px;
    align-items:center;
    justify-content:center;
    border:1px solid rgba(255,255,255,.11) !important;
    border-radius:12px !important;
    background:rgba(255,255,255,.045) !important;
    color:rgba(255,255,255,.76) !important;
    box-shadow:none !important;
    font:760 11px/1 system-ui,sans-serif !important;
    letter-spacing:.04em;
  }
  #startScreen.menu-return #startButton:hover {
    border-color:rgba(120,186,255,.3) !important;
    background:rgba(91,154,224,.08) !important;
  }
  body[data-game-mode='rally'] #serveModeToggle,
  body[data-game-mode='rally'] #serveCoach,
  body[data-game-mode='rally'] #serveHint { display:none !important; }
  body[data-game-mode='rally'] #v08Controls { right:165px; }
  @media (max-width:720px) {
    #startScreen .start-card { padding:21px; }
    .mode-copy small { white-space:normal; }
    #modeBadge { right:18px; top:54px; }
  }
`;
document.head.appendChild(style);

if (startCard && startButton) {
  const eyebrow = startCard.querySelector('.eyebrow');
  const title = startCard.querySelector('h1');
  const description = startCard.querySelector('p');
  const footerText = startCard.querySelector(':scope > small');

  if (eyebrow) eyebrow.textContent = 'WEB TENNIS · V0.8.3';
  if (title) title.textContent = 'Oyun Modu';
  if (description) description.textContent = 'Kortta ne çalışmak istediğini seç. ESC ile istediğin anda bu menüye dönüp mod değiştirebilirsin.';
  if (footerText) footerText.style.display = 'none';

  const selector = document.createElement('div');
  selector.id = 'modeSelector';
  selector.innerHTML = `
    <button class="mode-card" data-mode="rally" aria-label="Rally Modu">
      <span class="mode-icon">R</span>
      <span class="mode-copy">
        <span class="mode-kicker">PRACTICE</span>
        <strong>Rally Modu</strong>
        <small>Servis yok · sürekli top · groundstroke · approach · vole</small>
      </span>
      <span class="mode-arrow">›</span>
    </button>
    <button class="mode-card" data-mode="serve" aria-label="Servis Modu">
      <span class="mode-icon">S</span>
      <span class="mode-copy">
        <span class="mode-kicker">SERVE / RETURN</span>
        <strong>Servis Modu</strong>
        <small>Toss · servis · return · SEN / CPU servis akışı</small>
      </span>
      <span class="mode-arrow">›</span>
    </button>
  `;

  const menuFooter = document.createElement('div');
  menuFooter.id = 'modeFooter';
  menuFooter.innerHTML = '<span>WASD / Oklar · Mouse swing</span><span>ESC · Ana Menü</span>';

  startCard.insertBefore(selector, startButton);
  startCard.insertBefore(menuFooter, startButton);

  const badge = document.createElement('div');
  badge.id = 'modeBadge';
  badge.textContent = 'ESC · MENÜ';
  document.body.appendChild(badge);

  function renderMode(mode) {
    const normalized = mode === 'rally' ? 'rally' : 'serve';
    document.body.dataset.gameMode = normalized;
    badge.textContent = normalized === 'rally' ? 'RALLY · ESC MENÜ' : 'SERVİS · ESC MENÜ';
    selector.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === normalized);
    });
  }

  function chooseMode(mode) {
    const normalized = mode === 'rally' ? 'rally' : 'serve';
    window.__wtGameMode = normalized;
    renderMode(normalized);
    startScreen.classList.remove('menu-return');
    startScreen.classList.add('mode-chosen');
    window.dispatchEvent(new CustomEvent('webtennis:set-mode', { detail: { mode: normalized } }));
    window.setTimeout(() => startButton.click(), 0);
  }

  selector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    chooseMode(button.dataset.mode);
  });

  window.addEventListener('webtennis:mode-changed', (event) => {
    renderMode(event.detail?.mode === 'rally' ? 'rally' : 'serve');
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement?.id === 'game';
    if (locked) {
      hasEnteredCourt = true;
      startScreen.classList.remove('menu-return');
      return;
    }
    if (!hasEnteredCourt) return;

    // ESC becomes the actual game menu: show both modes again and keep a
    // separate resume action for players who only wanted to pause.
    startScreen.classList.remove('mode-chosen');
    startScreen.classList.add('menu-return');
    if (title) title.textContent = 'Ana Menü';
    if (description) description.textContent = 'Aynı modda devam et veya başka bir çalışma moduna geç. Mod değiştirildiğinde mevcut point sıfırlanır.';
    window.setTimeout(() => { startButton.textContent = 'Aynı modda devam et'; }, 0);
  });

  renderMode(window.__wtGameMode);
}
