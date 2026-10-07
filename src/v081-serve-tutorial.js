const style = document.createElement('style');
style.textContent = `
  #serveCoach {
    position: fixed;
    right: 28px;
    top: 132px;
    width: 290px;
    z-index: 48;
    padding: 16px 16px 14px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,.13);
    background: linear-gradient(180deg, rgba(7,18,38,.88), rgba(4,12,26,.8));
    box-shadow: 0 20px 60px rgba(0,0,0,.28);
    backdrop-filter: blur(16px);
    color: #fff;
    font-family: system-ui, sans-serif;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-8px) scale(.985);
    transition: opacity .18s ease, transform .18s ease;
  }
  #serveCoach.visible { opacity: 1; transform: none; }
  #serveCoach .eyebrow { font: 800 9px/1 system-ui; letter-spacing: .18em; color: #d9ff48; margin-bottom: 9px; }
  #serveCoach h3 { margin: 0; font-size: 17px; line-height: 1.15; }
  #serveCoach p { margin: 7px 0 12px; font-size: 11px; line-height: 1.5; color: rgba(255,255,255,.62); }
  .serve-demo { display:grid; grid-template-columns: 72px 1fr; gap: 12px; align-items:center; padding: 11px; border-radius: 14px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.07); }
  .mouse-icon { width: 44px; height: 62px; border: 2px solid rgba(255,255,255,.5); border-radius: 22px; position: relative; margin:auto; }
  .mouse-icon:before { content:''; position:absolute; left:50%; top:0; bottom:31px; width:1px; background:rgba(255,255,255,.22); }
  .mouse-icon:after { content:''; position:absolute; left:7px; top:7px; width:13px; height:18px; border-radius:9px 6px 6px 6px; background:#d9ff48; box-shadow:0 0 16px rgba(217,255,72,.35); }
  .gesture-svg { width:100%; height:84px; overflow:visible; }
  .gesture-path { fill:none; stroke:rgba(217,255,72,.6); stroke-width:5; stroke-linecap:round; stroke-dasharray:7 8; }
  .gesture-arrow { fill:#d9ff48; }
  .gesture-dot { fill:#fff; filter:drop-shadow(0 0 5px rgba(255,255,255,.8)); }
  .serve-steps { margin-top:12px; display:grid; gap:7px; }
  .serve-step { display:flex; gap:9px; align-items:flex-start; color:rgba(255,255,255,.62); font-size:10px; line-height:1.35; }
  .serve-step b { flex:0 0 20px; height:20px; display:grid; place-items:center; border-radius:50%; background:rgba(255,255,255,.08); color:#fff; font-size:9px; }
  #serveCoach[data-phase='ready'] .step-ready,
  #serveCoach[data-phase='toss'] .step-toss { color:#fff; }
  #serveCoach[data-phase='ready'] .step-ready b,
  #serveCoach[data-phase='toss'] .step-toss b { background:#d9ff48; color:#0a1625; }
  .serve-mini { margin-top:11px; text-align:center; font:800 10px/1 system-ui; letter-spacing:.08em; color:#d9ff48; }
  #serveCoach[data-phase='ready'] .serve-mini { color:rgba(255,255,255,.7); }
  body.v081-serve-coach #serveHint { opacity:0 !important; }
`;
document.head.appendChild(style);

const coach = document.createElement('div');
coach.id = 'serveCoach';
coach.dataset.phase = 'ready';
coach.innerHTML = `
  <div class="eyebrow">SERVİS REHBERİ</div>
  <h3 id="serveCoachTitle">Önce topu havaya at</h3>
  <p id="serveCoachCopy">SPACE'e bas. Top yükselmeye başlayınca mouse ile servis hareketini çizeceksin.</p>
  <div class="serve-demo">
    <div class="mouse-icon"></div>
    <svg class="gesture-svg" viewBox="0 0 180 100" aria-hidden="true">
      <path class="gesture-path" d="M28 82 C65 78 101 53 143 19" />
      <path class="gesture-arrow" d="M137 14 L160 14 L151 36 Z" />
      <circle class="gesture-dot" r="6">
        <animateMotion dur="1.15s" repeatCount="indefinite" path="M28 82 C65 78 101 53 143 19" />
      </circle>
    </svg>
  </div>
  <div class="serve-steps">
    <div class="serve-step step-ready"><b>1</b><span><strong>SPACE</strong> ile toss yap.</span></div>
    <div class="serve-step step-toss"><b>2</b><span>Sol mouse'a basılı tut ve <strong>↗</strong> yönünde hızlı bir swing çiz.</span></div>
    <div class="serve-step step-toss"><b>3</b><span>Top en yüksek noktaya yaklaşırken sol tuşu bırak.</span></div>
  </div>
  <div class="serve-mini">SOL TIK BASILI → ↗ → BIRAK</div>
`;
document.body.appendChild(coach);

const title = coach.querySelector('#serveCoachTitle');
const copy = coach.querySelector('#serveCoachCopy');

function setVisible(visible) {
  coach.classList.toggle('visible', visible);
  document.body.classList.toggle('v081-serve-coach', visible);
}

window.addEventListener('webtennis:serve-state', (event) => {
  const { server, state } = event.detail || {};
  if (server !== 'player') {
    setVisible(false);
    return;
  }
  if (state === 'ready') {
    coach.dataset.phase = 'ready';
    title.textContent = 'Önce topu havaya at';
    copy.textContent = "SPACE'e bas. Top yükselmeye başlayınca mouse ile servis hareketini çizeceksin.";
    setVisible(true);
    return;
  }
  if (state === 'toss') {
    coach.dataset.phase = 'toss';
    title.textContent = 'Şimdi servis swing’ini çiz';
    copy.textContent = 'Sol mouse’a basılı tut, aşağıdan yukarı ve hafif sağa doğru ↗ savur. Top tepeye yaklaşınca bırak.';
    setVisible(true);
    return;
  }
  setVisible(false);
});

window.addEventListener('webtennis:server-changed', (event) => {
  if (event.detail?.server !== 'player') setVisible(false);
});
