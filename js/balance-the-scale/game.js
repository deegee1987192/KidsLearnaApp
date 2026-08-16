// Balance the Scale — game engine framework.
// Expects levels.js already loaded.
//
// STATUS: SCAFFOLD ONLY. Renders the level, scale, tray, and weight blocks,
// and hooks up the buttons. Drag-and-drop pickup/placement is NOT
// implemented yet — that's tomorrow's build.
//
// What IS wired up:
//   • Level lifecycle (mount, reset, next, end screen)
//   • Scale + pan SVG render with live tilt based on state
//   • Tray with weight blocks
//   • Balance check (evaluatePans) — pure function on state
//   • Wiz mascot, scene, confetti, audio integration
//
// What is TODO for tomorrow:
//   • Drag-and-drop handlers on weight blocks
//   • Snap-to-pan drop targets
//   • Update state.leftPan / state.rightPan on drop
//   • Wire the balance check to fire after each drop → win detection
//   • Return-to-tray behavior for wrong weights

(function(){
  const { LEVELS, WEIGHT_COLORS } = window.KL.balanceTheScale;
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const { el } = window.KL.util;
  const audio = window.KL.audio || { unlock(){}, playChime(){}, playCrash(){}, startBgMusic(){}, stopBgMusic(){} };

  const SVGNS = 'http://www.w3.org/2000/svg';

  // ─── State ────────────────────────────────────────────────
  const state = {
    levelIndex: 0,
    completed: new Array(LEVELS.length).fill(false),
    leftPan:  [],    // weights currently on the left pan  (mutable)
    rightPan: [],    // weights currently on the right pan (mutable)
    trayLeft: [],    // weights still in the tray (mutable)
    solved: false,
  };

  function currentLevel(){ return LEVELS[state.levelIndex]; }

  // ─── Pure balance evaluator ──────────────────────────────
  // Returns { leftSum, rightSum, tilt, solved }
  //   tilt   ∈ [-1, 1] approximately — how much the scale should tip
  //   solved boolean — win condition met
  function evaluatePans(){
    const lvl = currentLevel();
    // For match mode, `fixed` sits permanently on `fixedSide`.
    let leftBase = 0, rightBase = 0;
    if(lvl.mode === 'match'){
      const fixedSum = lvl.fixed.reduce((a,b)=>a+b, 0);
      if(lvl.fixedSide === 'left') leftBase = fixedSum;
      else rightBase = fixedSum;
    }
    const leftSum  = leftBase  + state.leftPan.reduce((a,b)=>a+b, 0);
    const rightSum = rightBase + state.rightPan.reduce((a,b)=>a+b, 0);
    const diff = rightSum - leftSum;
    const magnitude = Math.max(1, leftSum + rightSum);
    const tilt = Math.max(-1, Math.min(1, diff / magnitude));

    let solved = false;
    if(lvl.mode === 'match'){
      solved = leftSum === rightSum && (state.leftPan.length + state.rightPan.length) > 0;
    } else {
      // target: both sides equal target, AND all tray weights placed
      solved = leftSum === lvl.target && rightSum === lvl.target && state.trayLeft.length === 0;
    }
    return { leftSum, rightSum, tilt, solved };
  }

  // ─── Rendering ────────────────────────────────────────────
  function renderScale(){
    const host = document.getElementById('bsScale');
    host.innerHTML = '';
    const { tilt } = evaluatePans();
    const W = 420, H = 260;
    const svg = mk('svg', { viewBox:`0 0 ${W} ${H}`, width:W, height:H });
    svg.classList.add('scale');

    // Base + pillar
    svg.appendChild(mk('rect', { x:170, y:H-30, width:80, height:20, rx:6, fill:'#5D4037' }));
    svg.appendChild(mk('rect', { x:205, y:80,   width:10, height:H-110, fill:'#795548' }));
    svg.appendChild(mk('circle',{ cx:210, cy:82, r:8, fill:'#5D4037' }));

    // Beam — rotated by tilt (positive tilt = right side down)
    const beamAngle = tilt * 22;  // degrees
    const beam = mk('g', { transform:`translate(210 82) rotate(${beamAngle})` });
    beam.appendChild(mk('rect', { x:-160, y:-6, width:320, height:12, rx:6, fill:'#8D6E63' }));

    // Left pan
    beam.appendChild(mk('line', { x1:-140, y1:0, x2:-140, y2:40, stroke:'#5D4037', 'stroke-width':2 }));
    beam.appendChild(mk('path', {
      d:'M -180 40 Q -140 70 -100 40 L -110 60 Q -140 78 -170 60 Z',
      fill:'#BCAAA4', stroke:'#5D4037', 'stroke-width':2,
    }));
    // Right pan
    beam.appendChild(mk('line', { x1:140, y1:0, x2:140, y2:40, stroke:'#5D4037', 'stroke-width':2 }));
    beam.appendChild(mk('path', {
      d:'M 100 40 Q 140 70 180 40 L 170 60 Q 140 78 110 60 Z',
      fill:'#BCAAA4', stroke:'#5D4037', 'stroke-width':2,
    }));

    svg.appendChild(beam);
    host.appendChild(svg);

    // Drop-target overlays for the pans (positioned so kid can drop weights)
    // TODO: hook drag/drop events onto these
    ['left','right'].forEach(side => {
      const zone = el('div', 'bs-pan-zone', '');
      zone.dataset.side = side;
      zone.id = `bsPanZone-${side}`;
      host.appendChild(zone);
    });
    // Position zones roughly over each pan (accounting for tilt)
    // Kept simple for now — tomorrow we tighten the geometry.
  }

  function renderPans(){
    const lvl = currentLevel();
    const lHost = document.getElementById('bsPanContentLeft');
    const rHost = document.getElementById('bsPanContentRight');
    lHost.innerHTML = ''; rHost.innerHTML = '';

    // In match mode, render the fixed weights on the fixed side
    if(lvl.mode === 'match'){
      const fixedHost = lvl.fixedSide === 'left' ? lHost : rHost;
      lvl.fixed.forEach(v => fixedHost.appendChild(makeWeightEl(v, /*fixed=*/true)));
    }
    // Render user-placed weights (currently empty until drag-drop lands)
    state.leftPan.forEach(v  => lHost.appendChild(makeWeightEl(v)));
    state.rightPan.forEach(v => rHost.appendChild(makeWeightEl(v)));

    // Update sum readouts
    const { leftSum, rightSum } = evaluatePans();
    document.getElementById('bsLeftSum').textContent  = leftSum;
    document.getElementById('bsRightSum').textContent = rightSum;
  }

  function renderTray(){
    const host = document.getElementById('bsTray');
    host.innerHTML = '';
    state.trayLeft.forEach((v, i) => {
      const w = makeWeightEl(v);
      w.dataset.trayIndex = i;
      // TODO: attach drag handlers
      host.appendChild(w);
    });
    // Empty-tray hint
    if(state.trayLeft.length === 0){
      const empty = el('div', 'bs-tray-empty', 'Tray empty');
      host.appendChild(empty);
    }
  }

  function makeWeightEl(value, fixed=false){
    const w = el('div', 'bs-weight' + (fixed ? ' fixed' : ''));
    w.textContent = value;
    w.dataset.value = value;
    w.style.background = WEIGHT_COLORS[value] || '#78909C';
    return w;
  }

  function mk(tag, attrs){
    const e = document.createElementNS(SVGNS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ─── Level lifecycle ─────────────────────────────────────
  function mountLevel(){
    const lvl = currentLevel();
    setScene(lvl.scene || 'day');

    document.getElementById('bsLevelLabel').textContent = `Level ${lvl.id} / ${LEVELS.length}`;
    document.getElementById('bsLevelName').textContent  = lvl.name;
    document.getElementById('bsHint').textContent       = lvl.hint || '';
    document.getElementById('bsModeChip').textContent   = lvl.mode === 'match' ? 'MATCH' : 'TARGET';
    document.getElementById('bsModeChip').className     = 'bs-mode-chip ' + lvl.mode;

    // Target readout (only for target mode)
    const targetChip = document.getElementById('bsTargetChip');
    if(lvl.mode === 'target'){
      targetChip.classList.remove('hidden');
      targetChip.textContent = `Goal: each side = ${lvl.target}`;
    } else {
      targetChip.classList.add('hidden');
    }

    // Level dots
    const dots = document.getElementById('bsLevelDots');
    dots.innerHTML = '';
    for(let i=0; i<LEVELS.length; i++){
      const d = el('div','level-dot');
      if(state.completed[i]) d.classList.add('done');
      if(i === state.levelIndex) d.classList.add('current');
      dots.appendChild(d);
    }

    // Reset per-level state
    state.leftPan  = [];
    state.rightPan = [];
    state.trayLeft = [...lvl.tray];
    state.solved   = false;

    renderScale();
    renderPans();
    renderTray();

    document.getElementById('bsOutcome').textContent = '';
    document.getElementById('bsOutcome').className = 'bs-outcome';
    document.getElementById('bsNext').classList.add('hidden');
    wizSay(lvl.hint || 'Drag weights to balance!', 'idle');
  }

  function resetLevel(){
    mountLevel();
  }

  function nextLevel(){
    if(state.levelIndex < LEVELS.length - 1){
      state.levelIndex++;
      mountLevel();
    } else {
      showEnd();
    }
  }

  function showEnd(){
    document.getElementById('bsGameScreen').classList.add('hidden');
    document.getElementById('bsEndScreen').classList.remove('hidden');
    const wins = state.completed.filter(Boolean).length;
    document.getElementById('bsEndScore').textContent = `${wins} / ${LEVELS.length}`;
    launchConfetti(60);
    wizSay("You're a Balance master! ⚖️🏆", 'happy');
  }

  function restart(){
    state.levelIndex = 0;
    state.completed = new Array(LEVELS.length).fill(false);
    document.getElementById('bsEndScreen').classList.add('hidden');
    document.getElementById('bsGameScreen').classList.remove('hidden');
    mountLevel();
  }

  // Call after any weight move — updates visuals and checks for win.
  // Tomorrow's drag-drop handlers should call this after mutating state.
  function afterMove(){
    renderScale();
    renderPans();
    renderTray();
    const { solved } = evaluatePans();
    if(solved && !state.solved){
      state.solved = true;
      onWin();
    }
  }

  function onWin(){
    document.getElementById('bsOutcome').textContent = '⚖️  Perfectly balanced!';
    document.getElementById('bsOutcome').className = 'bs-outcome ok';
    document.getElementById('bsNext').classList.remove('hidden');
    state.completed[state.levelIndex] = true;
    audio.playChime();
    launchConfetti(30);
    wizSay('Balanced! You have great math sense! ⚖️✨', 'happy');
    // Update the dot
    const dots = document.querySelectorAll('#bsLevelDots .level-dot');
    if(dots[state.levelIndex]) dots[state.levelIndex].classList.add('done');
  }

  // ─── Boot ────────────────────────────────────────────────
  function boot(){
    document.getElementById('bsReset').onclick     = () => { audio.unlock(); resetLevel(); };
    document.getElementById('bsNext').onclick      = nextLevel;
    document.getElementById('bsPlayAgain').onclick = restart;
    mountLevel();
  }

  // Expose helpers for tomorrow's drag/drop implementation
  window.KL.balanceTheScale.boot         = boot;
  window.KL.balanceTheScale.state        = state;
  window.KL.balanceTheScale.evaluatePans = evaluatePans;
  window.KL.balanceTheScale.afterMove    = afterMove;
})();
