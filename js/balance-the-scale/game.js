(function(){
  const { WEIGHT_COLORS } = window.KL.balanceTheScale;
  let LEVELS = window.KL.balanceTheScale.buildLevels();   // fresh, random each play
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const { el } = window.KL.util;
  const audio = window.KL.audio || { unlock(){}, playChime(){}, playCrash(){}, startBgMusic(){}, stopBgMusic(){} };

  const SVGNS = 'http://www.w3.org/2000/svg';

  const state = {
    levelIndex: 0,
    completed: new Array(LEVELS.length).fill(false),
    leftPan:  [],
    rightPan: [],
    trayLeft: [],
    solved: false,
  };

  let drag = null;

  function currentLevel(){ return LEVELS[state.levelIndex]; }

  // ─── Pure balance evaluator ──────────────────────────────
  function evaluatePans(){
    const lvl = currentLevel();
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

    svg.appendChild(mk('rect', { x:170, y:H-30, width:80, height:20, rx:6, fill:'#5D4037' }));
    svg.appendChild(mk('rect', { x:205, y:80, width:10, height:H-110, fill:'#795548' }));
    svg.appendChild(mk('circle',{ cx:210, cy:82, r:8, fill:'#5D4037' }));

    const beamAngle = tilt * 22;
    const beam = mk('g', { transform:`translate(210 82) rotate(${beamAngle})` });
    beam.appendChild(mk('rect', { x:-160, y:-6, width:320, height:12, rx:6, fill:'#8D6E63' }));

    beam.appendChild(mk('line', { x1:-140, y1:0, x2:-140, y2:40, stroke:'#5D4037', 'stroke-width':2 }));
    beam.appendChild(mk('path', {
      d:'M -180 40 Q -140 70 -100 40 L -110 60 Q -140 78 -170 60 Z',
      fill:'#BCAAA4', stroke:'#5D4037', 'stroke-width':2,
    }));
    beam.appendChild(mk('line', { x1:140, y1:0, x2:140, y2:40, stroke:'#5D4037', 'stroke-width':2 }));
    beam.appendChild(mk('path', {
      d:'M 100 40 Q 140 70 180 40 L 170 60 Q 140 78 110 60 Z',
      fill:'#BCAAA4', stroke:'#5D4037', 'stroke-width':2,
    }));

    svg.appendChild(beam);
    host.appendChild(svg);
  }

  function renderPans(){
    const lvl = currentLevel();
    const lHost = document.getElementById('bsPanContentLeft');
    const rHost = document.getElementById('bsPanContentRight');
    lHost.innerHTML = ''; rHost.innerHTML = '';

    if(lvl.mode === 'match'){
      const fixedHost = lvl.fixedSide === 'left' ? lHost : rHost;
      lvl.fixed.forEach(v => fixedHost.appendChild(makeWeightEl(v, true)));
    }
    state.leftPan.forEach((v, i) => {
      const w = makeWeightEl(v);
      w.dataset.panSide = 'left';
      w.dataset.panIndex = i;
      lHost.appendChild(w);
    });
    state.rightPan.forEach((v, i) => {
      const w = makeWeightEl(v);
      w.dataset.panSide = 'right';
      w.dataset.panIndex = i;
      rHost.appendChild(w);
    });

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
      host.appendChild(w);
    });
    if(state.trayLeft.length === 0){
      host.appendChild(el('div', 'bs-tray-empty', 'Tray empty'));
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

  // ─── Drag & Drop ──────────────────────────────────────────
  function initDragDrop(){
    document.getElementById('bsGameScreen').addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onPointerDown(e){
    if(state.solved || drag) return;
    const wEl = e.target.closest('.bs-weight');
    if(!wEl || wEl.classList.contains('fixed')) return;
    e.preventDefault();

    const value = parseInt(wEl.dataset.value);
    let source, sourceIndex;
    if(wEl.dataset.trayIndex !== undefined){
      source = 'tray';
      sourceIndex = parseInt(wEl.dataset.trayIndex);
    } else if(wEl.dataset.panSide){
      source = wEl.dataset.panSide;
      sourceIndex = parseInt(wEl.dataset.panIndex);
    } else return;

    const rect = wEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'bs-weight bs-drag-ghost';
    ghost.textContent = value;
    ghost.style.background = WEIGHT_COLORS[value] || '#78909C';
    ghost.style.left = rect.left + 'px';
    ghost.style.top  = rect.top + 'px';
    ghost.style.width  = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    document.body.appendChild(ghost);

    wEl.classList.add('dragging');

    drag = {
      value, source, sourceIndex, ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      originEl: wEl,
    };
  }

  function onPointerMove(e){
    if(!drag) return;
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.offsetX) + 'px';
    drag.ghost.style.top  = (e.clientY - drag.offsetY) + 'px';

    const target = hitTest(e.clientX, e.clientY);
    document.querySelectorAll('.bs-pan, #bsTray').forEach(n => n.classList.remove('drop-hover'));
    if(target === 'left')  document.querySelector('.bs-pans .bs-pan:first-child')?.classList.add('drop-hover');
    if(target === 'right') document.querySelector('.bs-pans .bs-pan:last-child')?.classList.add('drop-hover');
    if(target === 'tray')  document.getElementById('bsTray')?.classList.add('drop-hover');
  }

  function onPointerUp(e){
    if(!drag) return;
    drag.ghost.remove();
    document.querySelectorAll('.bs-pan, #bsTray').forEach(n => n.classList.remove('drop-hover'));

    const target = hitTest(e.clientX, e.clientY);
    if(target && target !== drag.source){
      if(drag.source === 'tray')       state.trayLeft.splice(drag.sourceIndex, 1);
      else if(drag.source === 'left')  state.leftPan.splice(drag.sourceIndex, 1);
      else                              state.rightPan.splice(drag.sourceIndex, 1);

      if(target === 'tray')       state.trayLeft.push(drag.value);
      else if(target === 'left')  state.leftPan.push(drag.value);
      else                        state.rightPan.push(drag.value);

      audio.unlock();
      afterMove();
    } else {
      if(drag.originEl) drag.originEl.classList.remove('dragging');
    }
    drag = null;
  }

  function hitTest(x, y){
    const pans = document.querySelectorAll('.bs-pans .bs-pan');
    const tray = document.getElementById('bsTray');
    if(pans[0] && inRect(x, y, pans[0])) return 'left';
    if(pans[1] && inRect(x, y, pans[1])) return 'right';
    if(tray   && inRect(x, y, tray))     return 'tray';
    return null;
  }

  function inRect(x, y, node){
    const r = node.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
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

    const targetChip = document.getElementById('bsTargetChip');
    if(lvl.mode === 'target'){
      targetChip.classList.remove('hidden');
      targetChip.textContent = `Goal: each side = ${lvl.target}`;
    } else {
      targetChip.classList.add('hidden');
    }

    const dots = document.getElementById('bsLevelDots');
    dots.innerHTML = '';
    for(let i = 0; i < LEVELS.length; i++){
      const d = el('div','level-dot');
      if(state.completed[i]) d.classList.add('done');
      if(i === state.levelIndex) d.classList.add('current');
      dots.appendChild(d);
    }

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

  function resetLevel(){ mountLevel(); }

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
    wizSay("You're a Balance master!", 'happy');
  }

  function restart(){
    LEVELS = window.KL.balanceTheScale.buildLevels();   // new random levels
    state.levelIndex = 0;
    state.completed = new Array(LEVELS.length).fill(false);
    document.getElementById('bsEndScreen').classList.add('hidden');
    document.getElementById('bsGameScreen').classList.remove('hidden');
    mountLevel();
  }

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
    document.getElementById('bsOutcome').textContent = 'Perfectly balanced!';
    document.getElementById('bsOutcome').className = 'bs-outcome ok';
    document.getElementById('bsNext').classList.remove('hidden');
    state.completed[state.levelIndex] = true;
    audio.playChime();
    launchConfetti(30);
    wizSay('Balanced! Great math sense!', 'happy');
    const dots = document.querySelectorAll('#bsLevelDots .level-dot');
    if(dots[state.levelIndex]) dots[state.levelIndex].classList.add('done');
  }

  // ─── Boot ────────────────────────────────────────────────
  function boot(){
    document.getElementById('bsReset').onclick     = () => { audio.unlock(); resetLevel(); };
    document.getElementById('bsNext').onclick      = nextLevel;
    document.getElementById('bsPlayAgain').onclick  = restart;
    initDragDrop();
    mountLevel();
  }

  window.KL.balanceTheScale.boot         = boot;
  window.KL.balanceTheScale.state        = state;
  window.KL.balanceTheScale.evaluatePans = evaluatePans;
  window.KL.balanceTheScale.afterMove    = afterMove;
})();
