// Switch Track — engine, renderer, animation, state.
// Expects levels.js already loaded.

(function(){
  const { LEVELS, TRACK_CONNS, STATION_COLORS } = window.KL.switchTrack;
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const { el } = window.KL.util;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const OPP  = { N:'S', S:'N', E:'W', W:'E' };
  const STEP = { N:[-1,0], S:[1,0], E:[0,1], W:[0,-1] };
  const SIDE_VEC = { N:[0,-1], S:[0,1], E:[1,0], W:[-1,0] };

  // ─── Parse each grid cell token into a cell object ────────
  function parseCell(token){
    if(token==='.' || token==='G') return { type: token==='G' ? 'start' : 'empty' };
    if(token.startsWith('S:')) return { type:'switch', key: token.slice(2) };
    if(token.startsWith('T:')) return { type:'station', color: token.slice(2) };
    if(token in TRACK_CONNS || token==='+') return { type: token };
    return { type:'empty' };
  }

  function buildTiles(level){
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const tiles = Array.from({length:rows}, ()=>Array(cols).fill(null));
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        tiles[r][c] = parseCell(level.grid[r][c]);
      }
    }
    level._tiles = tiles;
    level._rows = rows;
    level._cols = cols;
    return tiles;
  }

  // ─── Simulate train movement given current switch states ──
  function simulate(level, switchStates){
    const tiles = level._tiles || buildTiles(level);
    let { r, c, dir } = level.start;
    const path = [{ r, c, kind:'start', dir }];
    const MAX = 200;
    for(let step=0; step<MAX; step++){
      const [dr, dc] = STEP[dir];
      r += dr; c += dc;
      if(r<0 || c<0 || r>=level._rows || c>=level._cols)
        return { path, outcome:'derail', reason:'off-grid' };
      const cell = tiles[r][c];
      if(!cell || cell.type==='empty' || cell.type==='start')
        return { path, outcome:'derail', reason:'no-track' };
      const enter = OPP[dir];

      if(cell.type==='station'){
        path.push({ r, c, kind:'station', enter, color: cell.color });
        return { path, outcome:'station', color: cell.color };
      }

      let conns;
      if(cell.type==='switch'){
        const spec = level.switches[cell.key];
        const s = switchStates[cell.key] ?? spec.defaultState ?? 0;
        conns = spec.states[s];
      } else if(cell.type==='+'){
        conns = [enter, OPP[enter]];
      } else {
        conns = TRACK_CONNS[cell.type];
      }
      if(!conns || !conns.includes(enter))
        return { path: [...path, {r,c,kind:'derail',enter}], outcome:'derail', reason:'bad-connect' };
      const exit = conns.find(x => x !== enter);
      if(!exit)
        return { path: [...path, {r,c,kind:'derail',enter}], outcome:'derail', reason:'no-exit' };
      path.push({ r, c, kind:'track', enter, exit });
      dir = exit;
    }
    return { path, outcome:'loop' };
  }

  // ─── Validate all levels are solvable (dev sanity) ────────
  function isSolvable(level){
    const keys = Object.keys(level.switches);
    const spec = keys.map(k => level.switches[k].states.length);
    const total = spec.reduce((a,b)=>a*b, 1);
    for(let i=0; i<total; i++){
      const state = {};
      let x = i;
      for(let k=0; k<keys.length; k++){
        state[keys[k]] = x % spec[k];
        x = Math.floor(x / spec[k]);
      }
      const r = simulate(level, state);
      if(r.outcome==='station' && r.color === level.targetColor) return true;
    }
    return false;
  }

  // ─── Compute animation path "d" attribute in board coords ─
  function pathToD(level, path){
    const CELL = level.cellSize;
    const half = CELL/2;
    let d = '';
    for(let i=0; i<path.length; i++){
      const seg = path[i];
      const cx = seg.c*CELL + half;
      const cy = seg.r*CELL + half;
      if(i===0){
        // start cell: begin at center, exit toward dir
        d = `M ${cx} ${cy}`;
        const [vx, vy] = SIDE_VEC[seg.dir];
        d += ` L ${cx+vx*half} ${cy+vy*half}`;
      } else {
        const [ax, ay] = SIDE_VEC[seg.enter];
        d += ` L ${cx+ax*half} ${cy+ay*half}`;
        if(seg.kind==='track' && seg.exit){
          const [bx, by] = SIDE_VEC[seg.exit];
          if(isStraightPair(seg.enter, seg.exit)){
            d += ` L ${cx+bx*half} ${cy+by*half}`;
          } else {
            d += ` Q ${cx} ${cy} ${cx+bx*half} ${cy+by*half}`;
          }
        } else {
          d += ` L ${cx} ${cy}`;
        }
      }
    }
    return d;
  }

  function isStraightPair(a,b){
    return (a==='N'&&b==='S') || (a==='S'&&b==='N') || (a==='E'&&b==='W') || (a==='W'&&b==='E');
  }

  // ─── Draw the board SVG ───────────────────────────────────
  function renderBoard(level, switchStates, onSwitchTap){
    buildTiles(level);
    const CELL = level.cellSize;
    const W = level._cols * CELL;
    const H = level._rows * CELL;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width',  W);
    svg.setAttribute('height', H);
    svg.classList.add('board');

    // Checker grass
    for(let r=0; r<level._rows; r++){
      for(let c=0; c<level._cols; c++){
        const bg = mk('rect', { x:c*CELL, y:r*CELL, width:CELL, height:CELL,
          fill: (r+c)%2 ? '#9CCC65' : '#AED581' });
        svg.appendChild(bg);
      }
    }

    // Track base — draw tracks for every non-empty cell
    for(let r=0; r<level._rows; r++){
      for(let c=0; c<level._cols; c++){
        const cell = level._tiles[r][c];
        drawCell(svg, r, c, cell, level, switchStates, onSwitchTap);
      }
    }

    // Start marker (drawn on top of track)
    drawStartMarker(svg, level.start.r, level.start.c, CELL, level.start.dir);

    return svg;
  }

  function mk(tag, attrs){
    const e = document.createElementNS(SVGNS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawCell(svg, r, c, cell, level, switchStates, onSwitchTap){
    const CELL = level.cellSize;
    if(cell.type==='empty') return;

    if(cell.type==='station'){
      drawStation(svg, r, c, CELL, cell.color);
      return;
    }
    if(cell.type==='switch'){
      const spec = level.switches[cell.key];
      const s = switchStates[cell.key] ?? spec.defaultState ?? 0;
      // Draw all states faintly, then active brightly
      for(let i=0; i<spec.states.length; i++){
        drawTrackConns(svg, r, c, CELL, spec.states[i], i===s ? '#37474F' : 'rgba(55,71,79,0.18)', i===s ? 14 : 10);
      }
      // Interactive halo — tappable
      const cx = c*CELL + CELL/2;
      const cy = r*CELL + CELL/2;
      const halo = mk('circle', {
        cx, cy, r: CELL*0.32,
        fill:'#FFB300', 'fill-opacity':0.35,
        stroke:'#F57C00', 'stroke-width':3,
        class:'switch-hit',
        'data-switch-key': cell.key,
      });
      halo.style.cursor = 'pointer';
      halo.addEventListener('click', () => onSwitchTap(cell.key, halo));
      svg.appendChild(halo);
      // Small state indicator (dot count)
      const label = mk('text', {
        x:cx, y:cy+4,
        'text-anchor':'middle',
        'font-family':"'Fredoka One',cursive",
        'font-size': Math.round(CELL*0.28),
        fill:'#5D4037',
        'pointer-events':'none',
      });
      label.textContent = '↻';
      svg.appendChild(label);
      return;
    }
    // Plain track cell
    const conns = cell.type==='+' ? TRACK_CONNS['+'] : TRACK_CONNS[cell.type];
    if(conns) drawTrackConns(svg, r, c, CELL, conns, '#37474F', 14);
  }

  function drawTrackConns(svg, r, c, CELL, conns, color, width){
    const cx = c*CELL + CELL/2;
    const cy = r*CELL + CELL/2;
    const half = CELL/2;
    // Group conns into path segments
    if(conns.length === 4){
      // cross — two crossing lines
      appendLine(svg, cx-half, cy, cx+half, cy, color, width);
      appendLine(svg, cx, cy-half, cx, cy+half, color, width);
      return;
    }
    if(conns.length === 2){
      const [a, b] = conns;
      const [ax, ay] = SIDE_VEC[a];
      const [bx, by] = SIDE_VEC[b];
      const sx = cx+ax*half, sy = cy+ay*half;
      const ex = cx+bx*half, ey = cy+by*half;
      if(isStraightPair(a,b)){
        appendLine(svg, sx, sy, ex, ey, color, width);
      } else {
        const p = mk('path', {
          d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
          fill:'none', stroke:color, 'stroke-width':width,
          'stroke-linecap':'round',
        });
        svg.appendChild(p);
      }
      return;
    }
    // 3+ conns: draw each side-to-center as its own segment
    for(const s of conns){
      const [vx, vy] = SIDE_VEC[s];
      appendLine(svg, cx, cy, cx+vx*half, cy+vy*half, color, width);
    }
  }

  function appendLine(svg, x1, y1, x2, y2, color, width){
    const l = mk('line', { x1, y1, x2, y2, stroke:color, 'stroke-width':width, 'stroke-linecap':'round' });
    svg.appendChild(l);
  }

  function drawStation(svg, r, c, CELL, colorKey){
    const cx = c*CELL + CELL/2;
    const cy = r*CELL + CELL/2;
    const color = STATION_COLORS[colorKey] || '#888';
    // Station platform
    svg.appendChild(mk('rect', {
      x: c*CELL + 6, y: r*CELL + 6,
      width: CELL - 12, height: CELL - 12,
      rx: 10, ry: 10,
      fill: color,
      stroke: '#263238', 'stroke-width': 2,
    }));
    // Roof
    svg.appendChild(mk('rect', {
      x: c*CELL + 10, y: r*CELL + 10,
      width: CELL - 20, height: 8,
      fill: '#263238', rx: 3, ry: 3,
    }));
    // House emoji
    const t = mk('text', {
      x: cx, y: cy + Math.round(CELL*0.10),
      'text-anchor':'middle',
      'font-size': Math.round(CELL*0.42),
    });
    t.textContent = '🏠';
    svg.appendChild(t);
  }

  function drawStartMarker(svg, r, c, CELL, dir){
    const cx = c*CELL + CELL/2;
    const cy = r*CELL + CELL/2;
    // Big rounded circle
    svg.appendChild(mk('circle', {
      cx, cy, r: CELL*0.32,
      fill:'#FFF9C4', stroke:'#F57F17', 'stroke-width':3,
    }));
    const arrow = { N:'↑', S:'↓', E:'→', W:'←' }[dir] || '→';
    const t = mk('text', {
      x: cx, y: cy + Math.round(CELL*0.14),
      'text-anchor':'middle',
      'font-family':"'Fredoka One',cursive",
      'font-size': Math.round(CELL*0.45),
      fill:'#E65100',
    });
    t.textContent = arrow;
    svg.appendChild(t);
  }

  // ─── State machine for a level session ────────────────────
  const state = {
    levelIndex: 0,
    switchStates: {},
    animating: false,
    completed: new Array(LEVELS.length).fill(false),
    onCleanup: null,
  };

  function currentLevel(){ return LEVELS[state.levelIndex]; }

  function initSwitchStates(){
    state.switchStates = {};
    for(const k in currentLevel().switches){
      state.switchStates[k] = currentLevel().switches[k].defaultState ?? 0;
    }
  }

  function mountLevel(){
    const level = currentLevel();
    setScene(level.scene || 'day');

    document.getElementById('stLevelLabel').textContent = `Level ${level.id} / ${LEVELS.length}`;
    document.getElementById('stLevelName').textContent  = level.name;
    document.getElementById('stHint').textContent       = level.hint || '';

    // Target station chip
    const swatch = document.getElementById('stTargetSwatch');
    swatch.style.background = STATION_COLORS[level.targetColor] || '#888';
    document.getElementById('stTargetName').textContent = level.targetColor.toUpperCase();

    // Level dots
    const dots = document.getElementById('stLevelDots');
    dots.innerHTML = '';
    for(let i=0; i<LEVELS.length; i++){
      const d = el('div', 'level-dot');
      if(state.completed[i]) d.classList.add('done');
      if(i === state.levelIndex) d.classList.add('current');
      dots.appendChild(d);
    }

    initSwitchStates();
    redrawBoard();
    document.getElementById('stOutcome').textContent = '';
    document.getElementById('stOutcome').className = 'st-outcome';
    document.getElementById('stGo').disabled = false;
    document.getElementById('stNext').classList.add('hidden');
    wizSay(level.hint || 'Set the switches and press GO!', 'idle');
  }

  function redrawBoard(){
    const wrap = document.getElementById('boardWrap');
    if(state.onCleanup) { state.onCleanup(); state.onCleanup = null; }
    wrap.innerHTML = '';
    const svg = renderBoard(currentLevel(), state.switchStates, onSwitchTap);
    wrap.appendChild(svg);
    // Position the (invisible) train at the start cell for now
    const train = el('div', 'train', '🚂');
    train.id = 'train';
    const CELL = currentLevel().cellSize;
    const cx = currentLevel().start.c*CELL + CELL/2;
    const cy = currentLevel().start.r*CELL + CELL/2;
    train.style.left = cx + 'px';
    train.style.top  = cy + 'px';
    train.style.offsetPath = 'none';
    wrap.appendChild(train);
    // Sync board size to wrap
    wrap.style.width  = svg.getAttribute('width') + 'px';
    wrap.style.height = svg.getAttribute('height') + 'px';
  }

  function onSwitchTap(key, haloEl){
    if(state.animating) return;
    const spec = currentLevel().switches[key];
    const cur  = state.switchStates[key] ?? spec.defaultState ?? 0;
    state.switchStates[key] = (cur + 1) % spec.states.length;
    // Redraw board (simpler than mutating in place)
    redrawBoard();
    // Flash the just-tapped switch
    const newHalo = document.querySelector(`.switch-hit[data-switch-key="${key}"]`);
    if(newHalo){
      newHalo.classList.add('switch-flash');
      setTimeout(()=>newHalo.classList.remove('switch-flash'), 400);
    }
  }

  function runTrain(){
    if(state.animating) return;
    const level = currentLevel();
    const result = simulate(level, state.switchStates);
    const d = pathToD(level, result.path);
    state.animating = true;
    document.getElementById('stGo').disabled = true;

    const train = document.getElementById('train');
    // Snap train onto the offset-path
    train.style.left = '0px';
    train.style.top  = '0px';
    train.style.animation = 'none';
    train.style.offsetPath = `path("${d}")`;
    train.style.offsetDistance = '0%';
    void train.offsetHeight;

    const durSec = Math.max(0.9, result.path.length * 0.32);

    if(state._trainAnim) { try { state._trainAnim.cancel(); } catch(_){} }
    if(state._trainTimer) clearTimeout(state._trainTimer);
    const anim = train.animate([
      { offsetDistance: '0%' },
      { offsetDistance: '100%' },
    ], { duration: durSec * 1000, easing: 'linear', fill: 'forwards' });
    state._trainAnim = anim;
    // Drive the outcome off wall-clock so it fires even if the tab is
    // backgrounded (browser throttles compositor animations, but the game
    // state must still progress).
    state._trainTimer = setTimeout(() => {
      state._trainTimer = null;
      train.style.offsetDistance = '100%';
      handleResult(result);
    }, durSec * 1000 + 50);
  }

  function handleResult(result){
    state.animating = false;
    const level = currentLevel();
    const outcomeEl = document.getElementById('stOutcome');
    const train = document.getElementById('train');
    const wrap = document.getElementById('boardWrap');

    if(result.outcome === 'station' && result.color === level.targetColor){
      // WIN
      outcomeEl.textContent = '🎉 You did it!';
      outcomeEl.className = 'st-outcome ok';
      wizSay('Wonderful! You\'re a train master! 🚂✨', 'happy');
      launchConfetti(30);
      state.completed[state.levelIndex] = true;
      document.getElementById('stGo').disabled = true;
      document.getElementById('stNext').classList.remove('hidden');
      // Update level dot immediately
      const dots = document.querySelectorAll('#stLevelDots .level-dot');
      if(dots[state.levelIndex]) dots[state.levelIndex].classList.add('done');
    } else if(result.outcome === 'station'){
      // Wrong station
      outcomeEl.textContent = `Oops — that's the ${result.color.toUpperCase()} station!`;
      outcomeEl.className = 'st-outcome no';
      wizSay(`We wanted ${level.targetColor.toUpperCase()}! Try again! 🌈`, 'sad');
      setTimeout(()=>{
        document.getElementById('stGo').disabled = false;
        train.style.transition = 'none';
        train.style.offsetPath = 'none';
        const CELL = level.cellSize;
        train.style.left = (level.start.c*CELL + CELL/2) + 'px';
        train.style.top  = (level.start.r*CELL + CELL/2) + 'px';
      }, 900);
    } else {
      // Derail or loop
      train.classList.add('derailed');
      // Puff of smoke at the last cell
      const lastSeg = result.path[result.path.length-1];
      if(lastSeg){
        const CELL = level.cellSize;
        const puff = el('div', 'puff', '💨');
        puff.style.left = (lastSeg.c*CELL + CELL/2) + 'px';
        puff.style.top  = (lastSeg.r*CELL + CELL/2) + 'px';
        wrap.appendChild(puff);
        setTimeout(()=>puff.remove(), 900);
      }
      outcomeEl.textContent = '💨 Off the track! Try different switches.';
      outcomeEl.className = 'st-outcome no';
      wizSay('Uh oh — check the switches! 🚦', 'sad');
      setTimeout(()=>{
        train.classList.remove('derailed');
        document.getElementById('stGo').disabled = false;
        train.style.transition = 'none';
        train.style.offsetPath = 'none';
        const CELL = level.cellSize;
        train.style.left = (level.start.c*CELL + CELL/2) + 'px';
        train.style.top  = (level.start.r*CELL + CELL/2) + 'px';
      }, 1100);
    }
  }

  function resetLevel(){
    if(state.animating) return;
    initSwitchStates();
    redrawBoard();
    document.getElementById('stOutcome').textContent = '';
    document.getElementById('stOutcome').className = 'st-outcome';
    document.getElementById('stGo').disabled = false;
    document.getElementById('stNext').classList.add('hidden');
  }

  function nextLevel(){
    if(state.levelIndex < LEVELS.length - 1){
      state.levelIndex++;
      mountLevel();
    } else {
      // All levels done — end screen
      showEnd();
    }
  }

  function showEnd(){
    document.getElementById('stGameScreen').classList.add('hidden');
    const end = document.getElementById('stEndScreen');
    end.classList.remove('hidden');
    const wins = state.completed.filter(Boolean).length;
    document.getElementById('stEndScore').textContent = `${wins} / ${LEVELS.length}`;
    launchConfetti(60);
    wizSay("You're a Switch Track master! 🚂🏆", 'happy');
  }

  function restart(){
    state.levelIndex = 0;
    state.completed = new Array(LEVELS.length).fill(false);
    document.getElementById('stEndScreen').classList.add('hidden');
    document.getElementById('stGameScreen').classList.remove('hidden');
    mountLevel();
  }

  // Dev sanity: log any unsolvable levels to the console
  function selfTest(){
    const bad = [];
    for(const lvl of LEVELS){
      buildTiles(lvl);
      if(!isSolvable(lvl)) bad.push(lvl.id + ' ' + lvl.name);
    }
    if(bad.length){
      console.warn('[Switch Track] UNSOLVABLE levels:', bad);
    } else {
      console.log('[Switch Track] all ' + LEVELS.length + ' levels solvable ✓');
    }
  }

  // ─── Boot ─────────────────────────────────────────────────
  function boot(){
    selfTest();
    document.getElementById('stGo').onclick    = runTrain;
    document.getElementById('stReset').onclick = resetLevel;
    document.getElementById('stNext').onclick  = nextLevel;
    document.getElementById('stPlayAgain').onclick = restart;
    mountLevel();
  }

  window.KL.switchTrack.boot = boot;
})();
