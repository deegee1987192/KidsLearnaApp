// Switch Track — v3: circulating trains on shared loops.
//   • Trains keep moving around the track network once GO is pressed.
//   • Kid flips junction levers *during play* to divert trains into their homes.
//   • Same-cell / head-on collisions crash; wrong-color house crashes.
//   • Level clears when every train has parked at its matching-color house.
//
// Expects levels.js already loaded (window.KL.switchTrack.LEVELS et al).

(function(){
  const { LEVELS, TRACK_CONNS, HOUSE_COLORS, TRAIN_COLORS } = window.KL.switchTrack;
  const { setScene } = window.KL.scene;
  const { say: wizSay } = window.KL.wiz;
  const { launchConfetti } = window.KL.confetti;
  const { el } = window.KL.util;
  const audio = window.KL.audio || { unlock(){}, playChime(){}, playCrash(){}, startBgMusic(){}, stopBgMusic(){} };

  const SVGNS = 'http://www.w3.org/2000/svg';
  const OPP   = { N:'S', S:'N', E:'W', W:'E' };
  const STEP  = { N:[-1,0], S:[1,0], E:[0,1], W:[0,-1] };
  const SIDE_VEC = { N:[0,-1], S:[0,1], E:[1,0], W:[-1,0] };
  const TICK_MS  = 520;      // wall-clock ms per movement step
  const MAX_TICKS = 400;     // safety cap so a runaway loop doesn't run forever
  const TRAIN_EMOJI = '🚂';
  // Junction pin visuals — all levers use the same white pin + purple arrow so
  // they don't clash with any train color. Only the small letter badge is tinted
  // per-junction so kids can tell A/B/C apart.
  const LEVER_PIN_BG    = '#FFFFFF';
  const LEVER_PIN_EDGE  = '#263238';
  const LEVER_ARROW_FG  = '#5E35B1';   // purple
  const LEVER_BADGE_TINTS = ['#5E35B1','#00838F','#EF6C00','#2E7D32','#AD1457','#455A64'];

  // ─── Grid parsing ─────────────────────────────────────────
  function parseCell(token){
    if(token === '.' || token === '') return { type:'empty' };
    if(token === 'D') return { type:'depot' };
    if(token.startsWith('J:')) return { type:'junction', key: token.slice(2) };
    if(token.startsWith('H:')) return { type:'house', color: token.slice(2) };
    if(token in TRACK_CONNS || token === '+') return { type: token };
    return { type:'empty' };
  }

  function buildTiles(level){
    if(level._tiles) return level._tiles;
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const tiles = Array.from({length:rows}, ()=>Array(cols).fill(null));
    for(let r=0; r<rows; r++){
      for(let c=0; c<cols; c++){
        tiles[r][c] = parseCell(level.grid[r][c]);
      }
    }
    level._tiles = tiles;
    level._rows  = rows;
    level._cols  = cols;
    return tiles;
  }

  function junctionSides(spec){
    const set = new Set();
    for(const s of spec.states){
      for(const k in s.map){ set.add(k); set.add(s.map[k]); }
    }
    return [...set];
  }

  // ─── SVG rendering primitives ─────────────────────────────
  function mk(tag, attrs){
    const e = document.createElementNS(SVGNS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function appendLine(svg, x1, y1, x2, y2, color, width){
    svg.appendChild(mk('line', { x1, y1, x2, y2, stroke:color, 'stroke-width':width, 'stroke-linecap':'round' }));
  }
  function isStraightPair(a,b){
    return (a==='N'&&b==='S') || (a==='S'&&b==='N') || (a==='E'&&b==='W') || (a==='W'&&b==='E');
  }

  function drawTrackConns(svg, r, c, CELL, conns, color, width){
    const cx = c*CELL + CELL/2, cy = r*CELL + CELL/2, half = CELL/2;
    if(conns.length === 4){
      appendLine(svg, cx-half, cy, cx+half, cy, color, width);
      appendLine(svg, cx, cy-half, cx, cy+half, color, width);
      return;
    }
    if(conns.length === 2){
      const [a,b] = conns;
      const [ax,ay] = SIDE_VEC[a]; const [bx,by] = SIDE_VEC[b];
      const sx = cx+ax*half, sy = cy+ay*half;
      const ex = cx+bx*half, ey = cy+by*half;
      if(isStraightPair(a,b)){
        appendLine(svg, sx, sy, ex, ey, color, width);
      } else {
        svg.appendChild(mk('path', {
          d:`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
          fill:'none', stroke:color, 'stroke-width':width, 'stroke-linecap':'round',
        }));
      }
      return;
    }
    for(const s of conns){
      const [vx,vy] = SIDE_VEC[s];
      appendLine(svg, cx, cy, cx+vx*half, cy+vy*half, color, width);
    }
  }

  function drawDepot(svg, r, c, CELL){
    const cx = c*CELL + CELL/2, cy = r*CELL + CELL/2;
    // Base building — brown/wood colored so it reads as "depot", not house
    svg.appendChild(mk('rect', {
      x:c*CELL+4, y:r*CELL+4, width:CELL-8, height:CELL-8,
      rx:8, ry:8, fill:'#8D6E63', stroke:'#3E2723', 'stroke-width':2.5,
    }));
    // Roof stripe
    svg.appendChild(mk('rect', {
      x:c*CELL+8, y:r*CELL+8, width:CELL-16, height:7,
      fill:'#3E2723', rx:2, ry:2,
    }));
    // Train icon
    const t = mk('text', {
      x:cx, y:cy + Math.round(CELL*0.16),
      'text-anchor':'middle', 'font-size': Math.round(CELL*0.48),
    });
    t.textContent = '🚂';
    svg.appendChild(t);
    // Tiny "HOME" tag
    const tag = mk('text', {
      x:cx, y:r*CELL + CELL - 5,
      'text-anchor':'middle',
      'font-family':"'Fredoka One',cursive",
      'font-size': Math.max(8, Math.round(CELL*0.16)),
      fill:'#FFF3E0',
    });
    tag.textContent = 'DEPOT';
    svg.appendChild(tag);
  }

  function drawHouse(svg, r, c, CELL, colorKey){
    const cx = c*CELL + CELL/2, cy = r*CELL + CELL/2;
    const color = HOUSE_COLORS[colorKey] || '#888';
    svg.appendChild(mk('rect', {
      x:c*CELL+6, y:r*CELL+6, width:CELL-12, height:CELL-12,
      rx:10, ry:10, fill:color, stroke:'#263238', 'stroke-width':2,
    }));
    svg.appendChild(mk('rect', {
      x:c*CELL+10, y:r*CELL+10, width:CELL-20, height:8,
      fill:'#263238', rx:3, ry:3,
    }));
    const t = mk('text', {
      x:cx, y:cy + Math.round(CELL*0.10),
      'text-anchor':'middle', 'font-size': Math.round(CELL*0.42),
    });
    t.textContent = '🏠';
    svg.appendChild(t);
  }

  function drawJunctionLever(svg, r, c, CELL, key, badgeTint, stateLabel, stateIdx, stateCount, onTap){
    const cx = c*CELL + CELL/2, cy = r*CELL + CELL/2;
    const R = Math.max(14, Math.round(CELL*0.38));
    const g = mk('g', { class:'junction-lever', 'data-key':key });
    g.style.cursor = 'pointer';

    // Halo/shadow
    g.appendChild(mk('circle', { cx, cy, r:R+2, fill:'rgba(0,0,0,0.25)' }));
    // White pin so it never clashes with any train color
    g.appendChild(mk('circle', {
      cx, cy, r:R, fill:LEVER_PIN_BG, stroke:LEVER_PIN_EDGE, 'stroke-width':2.5,
    }));
    // Purple arrow — the current-state label glyph
    const arrow = mk('text', {
      x:cx, y:cy + Math.round(R*0.36),
      'text-anchor':'middle',
      'font-family':"'Fredoka One',cursive",
      'font-size': Math.round(R*1.15),
      fill:LEVER_ARROW_FG,
      'pointer-events':'none',
    });
    arrow.textContent = stateLabel;
    g.appendChild(arrow);

    // Colored letter badge (top-right) so kid can tell A/B/C apart at a glance
    const bx = cx + R*0.62, by = cy - R*0.62;
    g.appendChild(mk('circle', { cx:bx, cy:by, r:R*0.32, fill:badgeTint, stroke:'#fff', 'stroke-width':1.5 }));
    const badge = mk('text', {
      x:bx, y:by + R*0.12,
      'text-anchor':'middle',
      'font-family':"'Fredoka One',cursive",
      'font-size': Math.round(R*0.42),
      fill:'#fff',
      'pointer-events':'none',
    });
    badge.textContent = key;
    g.appendChild(badge);

    g.addEventListener('click', onTap);
    svg.appendChild(g);
  }

  function renderBoard(level, junctionStates){
    buildTiles(level);
    const CELL = level.cellSize;
    const W = level._cols * CELL, H = level._rows * CELL;
    const svg = mk('svg', { viewBox:`0 0 ${W} ${H}`, width:W, height:H });
    svg.classList.add('board');

    // Static layers — never change during play
    for(let r=0; r<level._rows; r++){
      for(let c=0; c<level._cols; c++){
        svg.appendChild(mk('rect', {
          x:c*CELL, y:r*CELL, width:CELL, height:CELL,
          fill:(r+c)%2 ? '#9CCC65' : '#AED581',
        }));
      }
    }
    // Non-junction tracks (static)
    for(let r=0; r<level._rows; r++){
      for(let c=0; c<level._cols; c++){
        const cell = level._tiles[r][c];
        if(cell.type === 'empty' || cell.type === 'house' || cell.type === 'junction' || cell.type === 'depot') continue;
        const conns = cell.type === '+' ? TRACK_CONNS['+'] : TRACK_CONNS[cell.type];
        if(conns) drawTrackConns(svg, r, c, CELL, conns, '#37474F', 14);
      }
    }
    // Houses & depot (static)
    for(let r=0; r<level._rows; r++){
      for(let c=0; c<level._cols; c++){
        const cell = level._tiles[r][c];
        if(cell.type === 'house') drawHouse(svg, r, c, CELL, cell.color);
        if(cell.type === 'depot') drawDepot(svg, r, c, CELL);
      }
    }
    // Dynamic layer — only this changes when a lever is flipped.
    const jGroup = mk('g', { id:'junctions-group' });
    svg.appendChild(jGroup);
    populateJunctions(jGroup, level, junctionStates);

    return svg;
  }

  function populateJunctions(jGroup, level, junctionStates){
    // Clear existing children
    while(jGroup.firstChild) jGroup.removeChild(jGroup.firstChild);
    const CELL = level.cellSize;
    const keys = Object.keys(level.junctions);
    keys.forEach((key, i) => {
      const spec = level.junctions[key];
      // Find junction cell coords
      let jr = -1, jc = -1;
      for(let r=0; r<level._rows && jr === -1; r++){
        for(let c=0; c<level._cols; c++){
          const cell = level._tiles[r][c];
          if(cell.type === 'junction' && cell.key === key){ jr = r; jc = c; break; }
        }
      }
      if(jr === -1) return;

      // Faint physical sides
      const sides = junctionSides(spec);
      const cx = jc*CELL + CELL/2, cy = jr*CELL + CELL/2;
      for(const s of sides){
        const [vx,vy] = SIDE_VEC[s];
        appendLine(jGroup, cx, cy, cx+vx*CELL/2, cy+vy*CELL/2, 'rgba(55,71,79,0.35)', 12);
      }
      // Active-state bold routes
      const sIdx = junctionStates[key] ?? spec.defaultState ?? 0;
      const map = spec.states[sIdx].map;
      const drawn = new Set();
      for(const from in map){
        const to = map[from];
        const pair = [from,to].sort().join(',');
        if(drawn.has(pair)) continue;
        drawn.add(pair);
        drawTrackConns(jGroup, jr, jc, CELL, [from,to], '#37474F', 14);
      }
      // Tappable pin (skip if single fixed state)
      if(spec.states.length < 2) return;
      const stateLabel = spec.states[sIdx].label;
      drawJunctionLever(jGroup, jr, jc, CELL, key,
        LEVER_BADGE_TINTS[i % LEVER_BADGE_TINTS.length],
        stateLabel, sIdx, spec.states.length,
        () => cycleJunction(key));
    });
  }

  function cycleJunction(key){
    const spec = currentLevel().junctions[key];
    const cur = state.junctionStates[key] ?? spec.defaultState ?? 0;
    state.junctionStates[key] = (cur + 1) % spec.states.length;
    // Only re-render the junctions group; trains and static layers untouched
    const jGroup = document.querySelector('#boardWrap svg #junctions-group');
    if(jGroup){
      populateJunctions(jGroup, currentLevel(), state.junctionStates);
    }
  }

  // ─── State ────────────────────────────────────────────────
  const state = {
    levelIndex: 0,
    completed: new Array(LEVELS.length).fill(false),
    junctionStates: {},
    trains: [],        // live train state during play
    simTick: 0,
    running: false,    // is the tick loop active
    _loopTimer: null,
  };

  function currentLevel(){ return LEVELS[state.levelIndex]; }

  function initJunctionStates(){
    state.junctionStates = {};
    for(const k in currentLevel().junctions){
      state.junctionStates[k] = currentLevel().junctions[k].defaultState ?? 0;
    }
  }

  function initTrains(){
    const lvl = currentLevel();
    const gap = Math.max(1, Math.round(3000 / TICK_MS));  // ~6 ticks per 3s
    state.trains = lvl.trains.map((t, i) => {
      const start = t.start || lvl.depot;
      return {
        index:i, color:t.color,
        r:start.r, c:start.c, dir:start.dir,
        launchTick: (t.launchTick != null) ? t.launchTick : (i * gap),
        status:'waiting',
      };
    });
    state.parkedCount = 0;   // for parkOrder enforcement
  }

  // ─── Rendering the play surface ───────────────────────────
  function redrawBoard(){
    const wrap = document.getElementById('boardWrap');
    wrap.innerHTML = '';
    const level = currentLevel();
    const svg = renderBoard(level, state.junctionStates);
    wrap.appendChild(svg);
    wrap.style.width  = svg.getAttribute('width') + 'px';
    wrap.style.height = svg.getAttribute('height') + 'px';
    // Spawn train elements (hidden until launched)
    for(let i=0; i<state.trains.length; i++){
      const t = state.trains[i];
      spawnTrainEl(i, t.color, t.r, t.c);
    }
  }

  function spawnTrainEl(i, color, r, c){
    const wrap = document.getElementById('boardWrap');
    const CELL = currentLevel().cellSize;
    const tr = el('div','train', TRAIN_EMOJI);
    tr.id = `train-${i}`;
    tr.dataset.color = color;
    tr.style.setProperty('--train-tint', TRAIN_COLORS[color] || '#888');
    tr.style.left = (c*CELL + CELL/2) + 'px';
    tr.style.top  = (r*CELL + CELL/2) + 'px';
    tr.style.transition = 'none';
    tr.style.opacity = '0';   // hidden until first launch tick
    wrap.appendChild(tr);
  }

  function animateTrainTo(i, r, c, fadeOut){
    const CELL = currentLevel().cellSize;
    const tr = document.getElementById(`train-${i}`);
    if(!tr) return;
    tr.style.transition = `left ${TICK_MS}ms linear, top ${TICK_MS}ms linear` +
      (fadeOut ? `, opacity 300ms ease ${TICK_MS-100}ms` : '');
    tr.style.left = (c*CELL + CELL/2) + 'px';
    tr.style.top  = (r*CELL + CELL/2) + 'px';
    if(fadeOut) tr.style.opacity = '0';
  }

  function showTrain(i, r, c){
    const CELL = currentLevel().cellSize;
    const tr = document.getElementById(`train-${i}`);
    if(!tr) return;
    tr.style.transition = 'none';
    tr.style.left = (c*CELL + CELL/2) + 'px';
    tr.style.top  = (r*CELL + CELL/2) + 'px';
    tr.style.opacity = '1';
  }

  function showCrash(i, r, c){
    const CELL = currentLevel().cellSize;
    const wrap = document.getElementById('boardWrap');
    const tr = document.getElementById(`train-${i}`);
    if(tr){
      tr.style.transition = `left ${TICK_MS}ms linear, top ${TICK_MS}ms linear`;
      tr.style.left = (c*CELL + CELL/2) + 'px';
      tr.style.top  = (r*CELL + CELL/2) + 'px';
      tr.classList.add('derailed');
      setTimeout(() => { tr.style.opacity = '0'; }, TICK_MS);
    }
    const puff = el('div','puff','💥');
    puff.style.left = (c*CELL + CELL/2) + 'px';
    puff.style.top  = (r*CELL + CELL/2) + 'px';
    wrap.appendChild(puff);
    setTimeout(() => puff.remove(), 900);
  }

  // ─── Live tick loop ──────────────────────────────────────
  function startLoop(){
    if(state.running) return;
    audio.unlock();
    audio.startBgMusic();
    initTrains();
    state.simTick = 0;
    state.running = true;
    document.getElementById('stGo').textContent = 'STOP ⏹';
    document.getElementById('stGo').classList.add('stop');
    document.getElementById('stNext').classList.add('hidden');
    document.getElementById('stOutcome').textContent = '';
    document.getElementById('stOutcome').className = 'st-outcome';
    // Wall-clock tick — do NOT drive off animation events (browsers throttle
    // compositor animations when the tab is hidden; setTimeout still fires).
    state._loopTimer = setInterval(tickStep, TICK_MS);
    // Kick the first tick immediately so trains launch at tick 0
    tickStep();
  }

  function stopLoop(){
    if(state._loopTimer){ clearInterval(state._loopTimer); state._loopTimer = null; }
    state.running = false;
    audio.stopBgMusic();
    const go = document.getElementById('stGo');
    go.textContent = 'GO ▶';
    go.classList.remove('stop');
  }

  function tickStep(){
    const level = currentLevel();
    const tiles = level._tiles;

    // Launch waiting trains whose time has come
    for(const tr of state.trains){
      if(tr.status === 'waiting' && state.simTick >= tr.launchTick){
        tr.status = 'moving';
        showTrain(tr.index, tr.r, tr.c);
      }
    }

    // Compute per-train proposals (reads LIVE junction state)
    const proposals = state.trains.map(tr => {
      if(tr.status !== 'moving') return null;
      const [dr,dc] = STEP[tr.dir];
      const nr = tr.r + dr, nc = tr.c + dc;
      if(nr<0 || nc<0 || nr>=level._rows || nc>=level._cols){
        return { crash:true, reason:'off-grid', r:tr.r, c:tr.c };
      }
      const cell = tiles[nr][nc];
      if(!cell || cell.type === 'empty') return { crash:true, reason:'no-track', r:nr, c:nc };
      const enter = OPP[tr.dir];
      if(cell.type === 'house'){
        if(cell.color === tr.color) return { park:true, r:nr, c:nc };
        return { crash:true, reason:'wrong-house', r:nr, c:nc };
      }
      if(cell.type === 'depot'){
        // Trains cannot re-enter the depot — one-way spawn only.
        return { crash:true, reason:'depot-entry', r:nr, c:nc };
      }
      let exit;
      if(cell.type === 'junction'){
        const spec = level.junctions[cell.key];
        const sIdx = state.junctionStates[cell.key] ?? spec.defaultState ?? 0;
        const map = spec.states[sIdx].map;
        exit = map[enter];
        if(!exit){
          // Clockwise fallback — if the lever's current state doesn't handle
          // this entering side, rotate through cardinals (N→E→S→W→N) until
          // we find a physical side that isn't the entering one.
          const sides = new Set(junctionSides(spec));
          const CW = { N:'E', E:'S', S:'W', W:'N' };
          let cand = CW[enter];
          for(let k=0; k<3 && !exit; k++){
            if(sides.has(cand) && cand !== enter) exit = cand;
            else cand = CW[cand];
          }
        }
        if(!exit) return { crash:true, reason:'junction-block', r:nr, c:nc };
      } else if(cell.type === '+'){
        exit = OPP[enter];
      } else {
        const conns = TRACK_CONNS[cell.type];
        if(!conns || !conns.includes(enter)) return { crash:true, reason:'bad-track', r:nr, c:nc };
        exit = conns.find(x => x !== enter);
      }
      return { r:nr, c:nc, dir:exit };
    });

    // Same-cell collisions
    const crashed = new Set();
    const nextByCell = new Map();
    proposals.forEach((p, i) => {
      if(!p || p.crash) return;
      const k = `${p.r},${p.c}`;
      if(!nextByCell.has(k)) nextByCell.set(k, []);
      nextByCell.get(k).push(i);
    });
    for(const [, list] of nextByCell){
      if(list.length > 1) list.forEach(i => crashed.add(i));
    }
    // Head-on swaps
    for(let i=0; i<proposals.length; i++){
      const p = proposals[i]; if(!p || p.crash) continue;
      for(let j=i+1; j<proposals.length; j++){
        const q = proposals[j]; if(!q || q.crash) continue;
        if(p.r === state.trains[j].r && p.c === state.trains[j].c &&
           q.r === state.trains[i].r && q.c === state.trains[i].c){
          crashed.add(i); crashed.add(j);
        }
      }
    }

    // Apply
    let anyCrashed = false, anyMovedThisTick = false;
    for(let i=0; i<state.trains.length; i++){
      const tr = state.trains[i], p = proposals[i];
      if(!p) continue;
      if(p.crash){
        tr.status = 'crashed'; anyCrashed = true;
        showCrash(i, p.r, p.c);
        audio.playCrash();
        continue;
      }
      if(crashed.has(i)){
        tr.status = 'crashed'; anyCrashed = true;
        showCrash(i, p.r, p.c);
        audio.playCrash();
        continue;
      }
      if(p.park){
        // If the level requires a specific parking order, verify.
        const order = currentLevel().parkOrder;
        if(order && order[state.parkedCount] !== tr.color){
          tr.status = 'crashed'; tr.crashReason = 'wrong-order';
          anyCrashed = true;
          showCrash(i, p.r, p.c);
          audio.playCrash();
          continue;
        }
        tr.r = p.r; tr.c = p.c; tr.status = 'parked';
        state.parkedCount++;
        animateTrainTo(i, p.r, p.c, true);
        audio.playChime();
        anyMovedThisTick = true;
        continue;
      }
      tr.r = p.r; tr.c = p.c; tr.dir = p.dir;
      animateTrainTo(i, p.r, p.c, false);
      anyMovedThisTick = true;
    }

    state.simTick++;

    const allParked = state.trains.every(t => t.status === 'parked');
    const anyCrashedEver = state.trains.some(t => t.status === 'crashed');

    if(allParked && !anyCrashedEver){
      stopLoop();
      setTimeout(() => finalizeWin(), TICK_MS);
      return;
    }
    if(anyCrashedEver){
      stopLoop();
      setTimeout(() => finalizeCrash(), TICK_MS + 200);
      return;
    }
    if(state.simTick > MAX_TICKS){
      stopLoop();
      setTimeout(() => finalizeTimeout(), 400);
    }
  }

  function finalizeWin(){
    const out = document.getElementById('stOutcome');
    out.textContent = '🎉 All trains home!';
    out.className = 'st-outcome ok';
    wizSay('Wonderful! Every train is home! 🚂✨', 'happy');
    launchConfetti(30);
    state.completed[state.levelIndex] = true;
    document.getElementById('stNext').classList.remove('hidden');
    const dots = document.querySelectorAll('#stLevelDots .level-dot');
    if(dots[state.levelIndex]) dots[state.levelIndex].classList.add('done');
  }

  function finalizeCrash(){
    const crashed = state.trains.filter(t => t.status === 'crashed');
    const wrongOrder = crashed.some(t => t.crashReason === 'wrong-order');
    const out = document.getElementById('stOutcome');
    if(wrongOrder){
      const order = currentLevel().parkOrder;
      const need  = (order || []).map(c => c.toUpperCase()).join(' → ');
      out.textContent = `🚦 Wrong order! Send them ${need}.`;
    } else {
      out.textContent = crashed.length === 1
        ? '💥 One train crashed — try again!'
        : `💥 ${crashed.length} trains crashed — try again!`;
    }
    out.className = 'st-outcome no';
    wizSay(wrongOrder ? 'Wrong order — try again!' : 'Uh oh — try different levers! 🚦', 'sad');
    resetTrainsOnly();
  }

  function finalizeTimeout(){
    const out = document.getElementById('stOutcome');
    out.textContent = 'Trains kept circling — try flipping a lever!';
    out.className = 'st-outcome no';
    wizSay('The trains need a way home — flip a lever!', 'idle');
    resetTrainsOnly();
  }

  function resetTrainsOnly(){
    // Re-spawn train DOM elements at their start positions for a retry
    document.querySelectorAll('.train').forEach(t => t.remove());
    document.querySelectorAll('.puff').forEach(t => t.remove());
    initTrains();
    for(let i=0; i<state.trains.length; i++){
      const t = state.trains[i];
      spawnTrainEl(i, t.color, t.r, t.c);
    }
  }

  // ─── Screen mount ────────────────────────────────────────
  function mountLevel(){
    stopLoop();
    const level = currentLevel();
    buildTiles(level);
    setScene(level.scene || 'day');

    document.getElementById('stLevelLabel').textContent = `Level ${level.id} / ${LEVELS.length}`;
    document.getElementById('stLevelName').textContent  = level.name;
    document.getElementById('stHint').textContent       = level.hint || '';

    const trainsChip = document.getElementById('stTrainsChip');
    trainsChip.innerHTML = '';
    for(const t of level.trains){
      const dot = el('span','st-train-dot');
      dot.style.background = TRAIN_COLORS[t.color] || '#888';
      trainsChip.appendChild(dot);
    }

    const dots = document.getElementById('stLevelDots');
    dots.innerHTML = '';
    for(let i=0; i<LEVELS.length; i++){
      const d = el('div','level-dot');
      if(state.completed[i]) d.classList.add('done');
      if(i === state.levelIndex) d.classList.add('current');
      dots.appendChild(d);
    }

    initJunctionStates();
    initTrains();
    redrawBoard();

    document.getElementById('stOutcome').textContent = '';
    document.getElementById('stOutcome').className = 'st-outcome';
    document.getElementById('stNext').classList.add('hidden');
    wizSay(level.hint || 'Press GO and flip levers to get trains home!', 'idle');
  }

  function onGoClicked(){
    if(state.running) stopLoop();
    else startLoop();
  }

  function resetLevel(){
    stopLoop();
    initJunctionStates();
    initTrains();
    redrawBoard();
    document.getElementById('stOutcome').textContent = '';
    document.getElementById('stOutcome').className = 'st-outcome';
    document.getElementById('stNext').classList.add('hidden');
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
    stopLoop();
    document.getElementById('stGameScreen').classList.add('hidden');
    document.getElementById('stEndScreen').classList.remove('hidden');
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

  function boot(){
    document.getElementById('stGo').onclick        = onGoClicked;
    document.getElementById('stReset').onclick     = resetLevel;
    document.getElementById('stNext').onclick      = nextLevel;
    document.getElementById('stPlayAgain').onclick = restart;
    mountLevel();
  }

  window.KL.switchTrack.boot = boot;
})();
