(function () {
  'use strict';
  const MR = (window.KL.marbleRun = window.KL.marbleRun || {});
  const { $, el, clamp, randInt } = KL.util;
  const audio = KL.audio;

  /* ═══ constants ═══ */
  const COLS = MR.COLS, ROWS = MR.ROWS;
  const CELL = 60;
  const CW = COLS * CELL, CH = ROWS * CELL;
  const R = 8;                 // marble radius
  const G = 0.035;             // gravity per substep
  const TERM_V = 1.4;          // terminal falling velocity per substep
  const AIR_FRIC = 0.995;      // friction per substep (horizontal only)
  const WALL_BOUNCE = 0.3;     // wall bounce energy retention
  const RAMP_FRIC = 0.7;       // ramp slide friction multiplier
  const RAMP_MIN = 1.0;        // minimum ramp slide speed per substep
  const BOUNCER_V = 4.5;       // upward launch speed per substep
  const BUMPER_PUSH = 1.5;     // bumper push multiplier
  const MAX_V = 6.0;           // absolute max velocity per substep
  const SUB = 3;               // physics substeps per frame
  const STUCK_LIMIT = 250;     // frames of low speed → lose
  const TRAIL_LEN = 18;

  const PIECE_CLR = {
    'ramp-right': '#4CAF50', 'ramp-left': '#4CAF50',
    bouncer: '#FF9800', funnel: '#2196F3', bumper: '#F44336'
  };
  const PIECE_LABEL = {
    'ramp-right': 'Slide ↘', 'ramp-left': 'Slide ↙',
    bouncer: 'Bounce ↑', funnel: 'Catch ⌄', bumper: 'Bump ●'
  };
  const SB_TOOLS = [
    'marble-start', 'bucket-goal', 'star',
    'ramp-right', 'ramp-left', 'bouncer', 'funnel', 'bumper', 'eraser'
  ];
  const SB_LABELS = {
    'marble-start': '⬇ Start', 'bucket-goal': '🪣 Goal',
    star: '⭐ Star', eraser: '✖ Erase',
    'ramp-right': 'Slide ↘', 'ramp-left': 'Slide ↙',
    bouncer: 'Bounce ↑', funnel: 'Catch ⌄', bumper: 'Bump ●'
  };

  const WIN_MSGS = ['Amazing!', 'You did it!', 'Great job!', 'Brilliant!', 'Nailed it!'];
  const LOSE_MSGS = ['Almost!', 'Try again!', 'So close!', 'Keep going!'];

  /* ═══ state ═══ */
  let canvas, ctx;
  var verifying = false;
  let state = reset();

  function reset() {
    return {
      lvl: 0,
      done: [],
      phase: 'place',        // place | run | win | lose
      marble: null,
      placed: new Map(),
      tray: [],
      sel: -1,
      collected: [],
      totalStars: 0,
      stuck: 0,
      trail: [],
      sandbox: false,
      sbTool: null,
      sbMarble: null,
      sbBucket: null,
      sbStars: [],
      sbPieces: new Map()
    };
  }

  /* ═══ helpers ═══ */
  function level() { return MR.LEVELS[state.lvl]; }
  function key(c, r) { return c + ',' + r; }
  function parseKey(k) { return k.split(',').map(Number); }

  function isOccupied(c, r) {
    if (state.sandbox) {
      const k = key(c, r);
      if (state.sbMarble && state.sbMarble[0] === c && state.sbMarble[1] === r) return true;
      if (state.sbBucket && state.sbBucket[0] === c && state.sbBucket[1] === r) return true;
      if (state.sbStars.some(s => s[0] === c && s[1] === r)) return true;
      return state.sbPieces.has(k);
    }
    const lv = level();
    if (lv.marble[0] === c && lv.marble[1] === r) return true;
    if (lv.bucket[0] === c && lv.bucket[1] === r) return true;
    if (lv.walls.some(w => w[0] === c && w[1] === r)) return true;
    if (lv.stars.some(s => s[0] === c && s[1] === r)) return true;
    return state.placed.has(key(c, r));
  }

  function getWalls() {
    return state.sandbox ? [] : level().walls;
  }
  function getPiece(c, r) {
    const k = key(c, r);
    return state.sandbox ? (state.sbPieces.get(k) || null) : (state.placed.get(k) || null);
  }
  function getMarbleStart() {
    return state.sandbox ? state.sbMarble : level().marble;
  }
  function getBucket() {
    return state.sandbox ? state.sbBucket : level().bucket;
  }
  function getStars() {
    return state.sandbox ? state.sbStars : level().stars;
  }

  /* ═══ drawing ═══ */

  function drawBoard() {
    ctx.fillStyle = 'rgba(20, 20, 40, 0.55)';
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL + .5, 0); ctx.lineTo(c * CELL + .5, CH); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL + .5); ctx.lineTo(CW, r * CELL + .5); ctx.stroke();
    }
  }

  function rrect(x, y, w, h, rad) {
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }

  function drawWall(c, r) {
    const x = c * CELL + 3, y = r * CELL + 3, w = CELL - 6, h = CELL - 6;
    ctx.fillStyle = '#555';
    ctx.beginPath();
    rrect(x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 4, y + 4, w - 8, 4);
  }

  function drawRamp(c, r, type) {
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.strokeStyle = PIECE_CLR[type];
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    if (type === 'ramp-right') {
      ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + CELL - 6, y + CELL - 6);
    } else {
      ctx.moveTo(x + CELL - 6, y + 6); ctx.lineTo(x + 6, y + CELL - 6);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBouncer(c, r) {
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.strokeStyle = PIECE_CLR.bouncer;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + CELL - 10);
    ctx.quadraticCurveTo(x + CELL / 2, y + CELL - 32, x + CELL - 8, y + CELL - 10);
    ctx.stroke();
    ctx.strokeStyle = '#E65100'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const sx = x + 14 + i * 9;
      ctx.beginPath();
      ctx.moveTo(sx, y + CELL - 6); ctx.lineTo(sx + 4, y + CELL - 12); ctx.lineTo(sx + 8, y + CELL - 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFunnel(c, r) {
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.strokeStyle = PIECE_CLR.funnel;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + CELL / 2, y + CELL - 6);
    ctx.lineTo(x + CELL - 6, y + 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawBumper(c, r) {
    const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18);
    grad.addColorStop(0, '#FF7043'); grad.addColorStop(1, '#D32F2F');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBucketIcon(c, r) {
    const x = c * CELL + 10, y = r * CELL + 14;
    const w = CELL - 20, h = CELL - 20, rad = 8;
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFA000';
    ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 4, y + 8, 6, h - 12);
    ctx.restore();
  }

  function drawStarIcon(c, r, collected) {
    const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
    ctx.save();
    if (collected) { ctx.globalAlpha = 0.2; }
    ctx.fillStyle = '#FFC107';
    ctx.shadowColor = 'rgba(255,193,7,0.5)';
    ctx.shadowBlur = collected ? 0 : 8;
    star5(cx, cy, 14);
    ctx.fill();
    ctx.restore();
  }

  function star5(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      const b = a + Math.PI / 5;
      ctx.lineTo(cx + r * 0.42 * Math.cos(b), cy + r * 0.42 * Math.sin(b));
    }
    ctx.closePath();
  }

  function drawMarbleStart(c, r) {
    const cx = c * CELL + CELL / 2, cy = r * CELL + 14;
    ctx.save();
    ctx.fillStyle = 'rgba(200,200,220,0.8)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 12);
    ctx.lineTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMarbleSprite(x, y) {
    ctx.save();
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, R);
    grad.addColorStop(0, '#e0e0e0'); grad.addColorStop(1, '#757575');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTrail() {
    const t = state.trail;
    for (let i = 0; i < t.length; i++) {
      const a = (i + 1) / t.length * 0.3;
      const s = R * (i + 1) / t.length * 0.5;
      ctx.fillStyle = `rgba(158,158,158,${a})`;
      ctx.beginPath(); ctx.arc(t[i].x, t[i].y, s, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawHighlight(c, r) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
  }

  function drawPiece(c, r, type) {
    if (type === 'ramp-right' || type === 'ramp-left') drawRamp(c, r, type);
    else if (type === 'bouncer') drawBouncer(c, r);
    else if (type === 'funnel') drawFunnel(c, r);
    else if (type === 'bumper') drawBumper(c, r);
  }

  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawBoard();

    var walls = getWalls();
    walls.forEach(function (w) { drawWall(w[0], w[1]); });

    var stars = getStars();
    stars.forEach(function (s, i) { drawStarIcon(s[0], s[1], state.collected[i]); });

    var bk = getBucket();
    if (bk) drawBucketIcon(bk[0], bk[1]);

    var ms = getMarbleStart();
    if (ms) drawMarbleStart(ms[0], ms[1]);

    if (state.sandbox) {
      state.sbPieces.forEach(function (type, k) {
        var p = parseKey(k); drawPiece(p[0], p[1], type);
      });
    } else {
      state.placed.forEach(function (type, k) {
        var p = parseKey(k); drawPiece(p[0], p[1], type);
      });
    }

    if (state.phase === 'place' && state.sel >= 0 && !state.sandbox) {
      for (var rr = 0; rr < ROWS; rr++)
        for (var cc = 0; cc < COLS; cc++)
          if (!isOccupied(cc, rr)) drawHighlight(cc, rr);
    }
    if (state.sandbox && state.phase === 'place' && state.sbTool) {
      for (var rr2 = 0; rr2 < ROWS; rr2++)
        for (var cc2 = 0; cc2 < COLS; cc2++)
          if (!isOccupied(cc2, rr2)) drawHighlight(cc2, rr2);
    }

    if (state.marble) {
      drawTrail();
      drawMarbleSprite(state.marble.x, state.marble.y);
    }
  }

  /* ═══ physics ═══ */

  function physStep() {
    var m = state.marble;
    if (!m) return;

    m.vy += G;
    if (m.vy > TERM_V) m.vy = TERM_V;
    m.vx *= AIR_FRIC;
    if (Math.abs(m.vx) > MAX_V) m.vx = m.vx > 0 ? MAX_V : -MAX_V;
    if (Math.abs(m.vy) > MAX_V) m.vy = m.vy > 0 ? MAX_V : -MAX_V;

    m.x += m.vx; m.y += m.vy;

    if (m.x - R < 0) { m.x = R; m.vx = Math.abs(m.vx) * WALL_BOUNCE; }
    if (m.x + R > CW) { m.x = CW - R; m.vx = -Math.abs(m.vx) * WALL_BOUNCE; }
    if (m.y - R < 0) { m.y = R; m.vy = Math.abs(m.vy) * WALL_BOUNCE; }
    if (m.y - R > CH + 40) { endRun(false); return; }

    var col = clamp(Math.floor(m.x / CELL), 0, COLS - 1);
    var row = clamp(Math.floor(m.y / CELL), 0, ROWS - 1);

    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var c = col + dc, r = row + dr;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
        var walls = getWalls();
        if (walls.some(function (w) { return w[0] === c && w[1] === r; })) {
          wallCollide(m, c * CELL, r * CELL);
        }
        var pc = getPiece(c, r);
        if (pc === 'ramp-right' || pc === 'ramp-left') rampCollide(m, c * CELL, r * CELL, pc);
        else if (pc === 'bouncer') bouncerCollide(m, c * CELL, r * CELL);
        else if (pc === 'funnel') funnelCollide(m, c * CELL, r * CELL);
        else if (pc === 'bumper') bumperCollide(m, c * CELL, r * CELL);
      }
    }

    checkStars(m);
    checkBucket(m);

    var sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
    if (sp < 0.15) { state.stuck++; if (state.stuck > STUCK_LIMIT) endRun(false); }
    else state.stuck = 0;
  }

  function wallCollide(m, cx, cy) {
    var px = clamp(m.x, cx, cx + CELL);
    var py = clamp(m.y, cy, cy + CELL);
    var dx = m.x - px, dy = m.y - py;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < R && d > 0.01) {
      var nx = dx / d, ny = dy / d;
      m.x = px + nx * R; m.y = py + ny * R;
      var vn = m.vx * nx + m.vy * ny;
      if (vn < 0) { m.vx -= (1 + WALL_BOUNCE) * vn * nx; m.vy -= (1 + WALL_BOUNCE) * vn * ny; }
    } else if (d < 0.01 && m.x >= cx && m.x <= cx + CELL && m.y >= cy && m.y <= cy + CELL) {
      var dl = m.x - cx, dr2 = cx + CELL - m.x, dt = m.y - cy, db = cy + CELL - m.y;
      var mn = Math.min(dl, dr2, dt, db);
      if (mn === dl) { m.x = cx - R; m.vx = -Math.abs(m.vx) * WALL_BOUNCE; }
      else if (mn === dr2) { m.x = cx + CELL + R; m.vx = Math.abs(m.vx) * WALL_BOUNCE; }
      else if (mn === dt) { m.y = cy - R; m.vy = -Math.abs(m.vy) * WALL_BOUNCE; }
      else { m.y = cy + CELL + R; m.vy = Math.abs(m.vy) * WALL_BOUNCE; }
    }
  }

  function rampCollide(m, cx, cy, type) {
    var sx, sy, nx, ny, ax;
    if (type === 'ramp-right') {
      ax = cx; sx = 1 / Math.SQRT2; sy = 1 / Math.SQRT2;
      nx = 1 / Math.SQRT2; ny = -1 / Math.SQRT2;
    } else {
      ax = cx + CELL; sx = -1 / Math.SQRT2; sy = 1 / Math.SQRT2;
      nx = -1 / Math.SQRT2; ny = -1 / Math.SQRT2;
    }
    var dx = m.x - ax, dy = m.y - cy;
    var dist = dx * nx + dy * ny;
    var t = (dx * sx + dy * sy) / (CELL * Math.SQRT2);
    if (t < -0.15 || t > 1.15) return;
    if (dist <= 0 || dist > R + 3) return;

    var vNorm = m.vx * nx + m.vy * ny;
    if (vNorm >= 0) return;

    m.x += nx * (R + 0.5 - dist);
    m.y += ny * (R + 0.5 - dist);

    var vSurf = m.vx * sx + m.vy * sy;
    var speed = Math.max(vSurf * RAMP_FRIC, RAMP_MIN);
    m.vx = sx * speed;
    m.vy = sy * speed;
  }

  function bouncerCollide(m, cx, cy) {
    var surfY = cy + CELL - 14;
    if (m.y + R >= surfY && m.y + R < surfY + 12 && m.vy > 0 &&
        m.x > cx + 4 && m.x < cx + CELL - 4) {
      m.y = surfY - R;
      m.vy = -BOUNCER_V;
      if (!verifying) audio.playTone(523.25, 0.12, 'triangle', 0.3);
    }
  }

  function funnelCollide(m, cx, cy) {
    var midX = cx + CELL / 2, topY = cy + 6, botY = cy + CELL - 6;
    if (m.y < topY - R || m.y > botY + R) return;
    if (m.x < cx || m.x > cx + CELL) return;

    var t = clamp((m.y - topY) / (botY - topY), 0, 1);
    var halfW = (CELL / 2 - 6) * (1 - t) + 3;
    var leftEdge = midX - halfW;
    var rightEdge = midX + halfW;

    if (m.x - R < leftEdge) {
      m.x = leftEdge + R;
      if (m.vx < 0) m.vx *= -0.3;
    }
    if (m.x + R > rightEdge) {
      m.x = rightEdge - R;
      if (m.vx > 0) m.vx *= -0.3;
    }

    m.vx *= 0.9;
    m.vx += (midX - m.x) * 0.04;
  }

  function lineCollide(m, ax, ay, bx, by) {
    var sx = bx - ax, sy = by - ay;
    var slen = Math.sqrt(sx * sx + sy * sy);
    var sdx = sx / slen, sdy = sy / slen;
    var nx = -sdy, ny = sdx;
    var dx = m.x - ax, dy = m.y - ay;
    var dist = dx * nx + dy * ny;
    var t = (dx * sdx + dy * sdy) / slen;
    if (t < -0.1 || t > 1.1) return;
    var absDist = Math.abs(dist);
    if (absDist < R + 2) {
      var sign = dist >= 0 ? 1 : -1;
      var vn = m.vx * nx + m.vy * ny;
      if (vn * sign < 0) {
        m.x += nx * (sign * (R + 0.5) - dist);
        m.y += ny * (sign * (R + 0.5) - dist);
        m.vx -= (1 + WALL_BOUNCE) * vn * nx;
        m.vy -= (1 + WALL_BOUNCE) * vn * ny;
        m.vx *= 0.85; m.vy *= 0.85;
      }
    }
  }

  function bumperCollide(m, cx, cy) {
    var bx = cx + CELL / 2, by = cy + CELL / 2, br = 16;
    var dx = m.x - bx, dy = m.y - by;
    var d = Math.sqrt(dx * dx + dy * dy);
    var minD = R + br;
    if (d < minD && d > 0.01) {
      var nx = dx / d, ny = dy / d;
      m.x = bx + nx * minD; m.y = by + ny * minD;
      var vn = m.vx * nx + m.vy * ny;
      if (vn < 0) {
        m.vx -= (1 + BUMPER_PUSH) * vn * nx;
        m.vy -= (1 + BUMPER_PUSH) * vn * ny;
      }
      if (!verifying) audio.playTone(330, 0.08, 'square', 0.15);
    }
  }

  function checkStars(m) {
    var stars = getStars();
    for (var i = 0; i < stars.length; i++) {
      if (state.collected[i]) continue;
      var sx = stars[i][0] * CELL + CELL / 2;
      var sy = stars[i][1] * CELL + CELL / 2;
      var dx = m.x - sx, dy = m.y - sy;
      if (dx * dx + dy * dy < (R + 12) * (R + 12)) {
        state.collected[i] = true;
        if (!verifying) audio.playTone(880, 0.1, 'sine', 0.25);
      }
    }
  }

  function checkBucket(m) {
    var bk = getBucket();
    if (!bk) return;
    var bx = bk[0] * CELL + CELL / 2;
    var by = bk[1] * CELL + CELL / 2;
    var dx = m.x - bx, dy = m.y - by;
    if (dx * dx + dy * dy < (R + 18) * (R + 18)) {
      endRun(true);
    }
  }

  /* ═══ game loop (wall-clock setTimeout — never use rAF for state) ═══ */
  var timerId = null;
  var lastTime = 0;
  var FRAME_MS = 16;   // ~60fps

  function update() {
    if (state.phase !== 'run') return;
    for (var i = 0; i < SUB; i++) physStep();
    if (state.marble) {
      state.trail.push({ x: state.marble.x, y: state.marble.y });
      if (state.trail.length > TRAIL_LEN) state.trail.shift();
    }
    render();
    if (state.phase === 'run') timerId = setTimeout(update, FRAME_MS);
  }

  function startRun() {
    var ms = getMarbleStart();
    if (!ms) return;
    if (!getBucket()) return;
    state.phase = 'run';
    state.marble = { x: ms[0] * CELL + CELL / 2, y: ms[1] * CELL + CELL / 2 + 4, vx: 0, vy: 0 };
    state.stuck = 0;
    state.trail = [];
    state.collected = getStars().map(function () { return false; });
    updateBtns();
    timerId = setTimeout(update, FRAME_MS);
  }

  function endRun(won) {
    state.phase = won ? 'win' : 'lose';
    if (timerId) { clearTimeout(timerId); timerId = null; }
    if (verifying) return;
    if (won) {
      if (!state.sandbox) {
        state.done[state.lvl] = true;
        state.totalStars += state.collected.filter(Boolean).length;
      }
      audio.playChime();
      KL.confetti.launchConfetti();
      KL.wiz.say(WIN_MSGS[randInt(0, WIN_MSGS.length - 1)], 'happy');
    } else {
      audio.playCrash();
      KL.wiz.say(LOSE_MSGS[randInt(0, LOSE_MSGS.length - 1)], 'sad');
    }
    updateBtns();
    updateStarsDisplay();
    render();
  }

  function resetRun() {
    state.phase = 'place';
    state.marble = null;
    state.trail = [];
    state.stuck = 0;
    state.collected = [];
    updateBtns();
    render();
  }

  /* ═══ input ═══ */

  function canvasXY(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CW / rect.width),
      y: (e.clientY - rect.top) * (CH / rect.height)
    };
  }

  function onCanvas(e) {
    if (state.phase !== 'place') return;
    e.preventDefault();
    var p = canvasXY(e);
    var c = clamp(Math.floor(p.x / CELL), 0, COLS - 1);
    var r = clamp(Math.floor(p.y / CELL), 0, ROWS - 1);
    if (state.sandbox) { sbClick(c, r); return; }
    var k = key(c, r);

    if (state.sel >= 0 && !isOccupied(c, r)) {
      var piece = state.tray[state.sel];
      state.placed.set(k, piece.type);
      piece.used = true;
      state.sel = -1;
      audio.playTone(440, 0.08, 'sine', 0.25);
      updateTray(); render(); return;
    }
    if (state.placed.has(k)) {
      var type = state.placed.get(k);
      state.placed.delete(k);
      for (var i = 0; i < state.tray.length; i++) {
        if (state.tray[i].type === type && state.tray[i].used) {
          state.tray[i].used = false; break;
        }
      }
      state.sel = -1;
      audio.playTone(330, 0.08, 'sine', 0.2);
      updateTray(); render();
    }
  }

  /* ═══ tray ═══ */

  function updateTray() {
    var wrap = $('#mrTray');
    wrap.innerHTML = '';
    if (state.sandbox) { updateSbTools(); return; }
    state.tray.forEach(function (item, i) {
      var b = el('button', 'mr-tray-btn');
      b.innerHTML = '<span class="mr-tray-icon" style="background:' + PIECE_CLR[item.type] + '">' +
        trayIcon(item.type) + '</span><span class="mr-tray-lbl">' + PIECE_LABEL[item.type] + '</span>';
      if (item.used) b.classList.add('mr-used');
      if (i === state.sel) b.classList.add('mr-sel');
      b.onclick = function () {
        if (item.used) return;
        state.sel = (state.sel === i) ? -1 : i;
        updateTray(); render();
      };
      wrap.appendChild(b);
    });
  }

  function trayIcon(type) {
    var s = 28;
    if (type === 'ramp-right') return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><line x1="4" y1="4" x2="24" y2="24" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
    if (type === 'ramp-left') return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><line x1="24" y1="4" x2="4" y2="24" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
    if (type === 'bouncer') return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><path d="M4 22 Q14 8 24 22" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
    if (type === 'funnel') return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><path d="M4 4 L14 24 L24 4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (type === 'bumper') return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><circle cx="14" cy="14" r="8" fill="#fff" opacity="0.9"/></svg>';
    return '';
  }

  /* ═══ sandbox ═══ */

  function enterSandbox() {
    state.sandbox = true;
    state.phase = 'place';
    state.marble = null; state.trail = [];
    state.sbTool = null;
    state.sbMarble = null; state.sbBucket = null;
    state.sbStars = []; state.sbPieces = new Map();
    state.collected = [];
    $('#mrDots').classList.add('hidden');
    $('#mrCard').innerHTML = '<span class="mr-lvl">🔧 Sandbox</span>' +
      '<span class="mr-name">Build Your Own!</span>';
    KL.wiz.say('Build anything you like!', 'happy');
    KL.scene.setScene('candy');
    updateTray(); updateBtns(); render();
  }

  function exitSandbox() {
    state.sandbox = false;
    state.sbTool = null;
    state.marble = null; state.trail = [];
    $('#mrDots').classList.remove('hidden');
    mountLevel(state.lvl);
  }

  function updateSbTools() {
    var wrap = $('#mrTray');
    wrap.innerHTML = '';
    SB_TOOLS.forEach(function (t) {
      var b = el('button', 'mr-tray-btn mr-sb-tool');
      var clr = PIECE_CLR[t] || '#888';
      if (t === 'marble-start') clr = '#9E9E9E';
      if (t === 'bucket-goal') clr = '#FFD700';
      if (t === 'star') clr = '#FFC107';
      if (t === 'eraser') clr = '#777';
      b.innerHTML = '<span class="mr-tray-icon" style="background:' + clr + '">' +
        (PIECE_CLR[t] ? trayIcon(t) : '<span style="font-size:15px;color:#fff">' +
        (t === 'marble-start' ? '▼' : t === 'bucket-goal' ? '■' :
         t === 'star' ? '★' : '✖') + '</span>') +
        '</span><span class="mr-tray-lbl">' + SB_LABELS[t] + '</span>';
      if (state.sbTool === t) b.classList.add('mr-sel');
      b.onclick = function () {
        state.sbTool = (state.sbTool === t) ? null : t;
        updateSbTools(); render();
      };
      wrap.appendChild(b);
    });
  }

  function sbClick(c, r) {
    var t = state.sbTool;
    if (!t) return;
    var k = key(c, r);

    if (t === 'eraser') {
      if (state.sbMarble && state.sbMarble[0] === c && state.sbMarble[1] === r) state.sbMarble = null;
      else if (state.sbBucket && state.sbBucket[0] === c && state.sbBucket[1] === r) state.sbBucket = null;
      else { state.sbStars = state.sbStars.filter(function (s) { return !(s[0] === c && s[1] === r); }); state.sbPieces.delete(k); }
      render(); return;
    }
    if (t === 'marble-start') {
      state.sbMarble = [c, r]; render(); return;
    }
    if (t === 'bucket-goal') {
      state.sbBucket = [c, r]; render(); return;
    }
    if (t === 'star') {
      if (!state.sbStars.some(function (s) { return s[0] === c && s[1] === r; })) {
        state.sbStars.push([c, r]);
      }
      render(); return;
    }
    if (!isOccupied(c, r) || state.sbPieces.has(k)) {
      state.sbPieces.set(k, t);
      audio.playTone(440, 0.06, 'sine', 0.2);
      render();
    }
  }

  /* ═══ level management ═══ */

  function mountLevel(idx) {
    state.lvl = idx;
    state.phase = 'place';
    state.marble = null; state.trail = [];
    state.placed = new Map();
    state.sel = -1;
    state.collected = [];
    state.stuck = 0;

    var lv = MR.LEVELS[idx];
    KL.scene.setScene(lv.scene);
    state.tray = lv.tray.map(function (t) { return { type: t, used: false }; });

    updateDots();
    updateCard();
    updateTray();
    updateBtns();
    updateStarsDisplay();
    KL.wiz.say(lv.hint, 'idle');
    render();
  }

  function nextLevel() {
    if (state.lvl + 1 >= MR.LEVELS.length) { showEnd(); return; }
    mountLevel(state.lvl + 1);
  }

  function showEnd() {
    $('#mrGameScreen').classList.add('hidden');
    $('#mrEndScreen').classList.remove('hidden');
    var total = 0;
    MR.LEVELS.forEach(function (lv) { total += lv.stars.length; });
    $('#mrEndMsg').textContent = 'You collected ' + state.totalStars + ' / ' + total + ' stars!';
    KL.wiz.say('What an amazing run! Play again?', 'happy');
  }

  function restart() {
    MR.buildLevels();
    state = reset();
    $('#mrEndScreen').classList.add('hidden');
    $('#mrGameScreen').classList.remove('hidden');
    mountLevel(0);
  }

  /* ═══ HUD ═══ */

  function updateDots() {
    var wrap = $('#mrDots');
    wrap.innerHTML = '';
    MR.LEVELS.forEach(function (_, i) {
      var d = el('div', 'level-dot');
      if (state.done[i]) d.classList.add('done');
      if (i === state.lvl) d.classList.add('current');
      wrap.appendChild(d);
    });
  }

  function updateCard() {
    $('#mrCard').innerHTML =
      '<span class="mr-lvl">Level ' + (state.lvl + 1) + ' / ' + MR.LEVELS.length + '</span>' +
      '<span class="mr-name">' + MR.LEVELS[state.lvl].name + '</span>';
  }

  function updateStarsDisplay() {
    $('#mrStars').textContent = '⭐ ' + state.totalStars;
  }

  function updateBtns() {
    var p = state.phase, sb = state.sandbox;
    show('#mrGo', p === 'place');
    show('#mrRetry', p === 'lose' || (sb && p === 'win'));
    show('#mrNext', p === 'win' && !sb);
    show('#mrClear', sb);
    show('#mrBack', sb);
    show('#mrSandboxBtn', !sb);
  }

  function show(sel, vis) {
    $(sel).classList.toggle('hidden', !vis);
  }

  /* ═══ boot ═══ */

  function boot() {
    canvas = $('#mrCanvas');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', onCanvas);

    $('#mrGo').onclick = startRun;
    $('#mrRetry').onclick = resetRun;
    $('#mrNext').onclick = nextLevel;
    $('#mrClear').onclick = function () {
      state.sbMarble = null; state.sbBucket = null;
      state.sbStars = []; state.sbPieces = new Map();
      state.marble = null; state.trail = [];
      state.phase = 'place';
      updateBtns(); render();
    };
    $('#mrBack').onclick = exitSandbox;
    $('#mrSandboxBtn').onclick = enterSandbox;
    $('#mrRestart').onclick = restart;
    $('#mrEndSandbox').onclick = function () {
      restart(); enterSandbox();
    };

    mountLevel(0);
  }

  function verify() {
    var origState = state;
    var results = [];
    MR.LEVELS.forEach(function (lv, i) {
      if (!lv.solution) {
        results.push({ level: i + 1, name: lv.name, result: 'NO SOL' });
        return;
      }
      var placed = new Map();
      lv.solution.forEach(function (s) { placed.set(key(s[0], s[1]), s[2]); });
      state = {
        lvl: i, sandbox: false, phase: 'run', stuck: 0, trail: [],
        done: [], totalStars: 0, sel: -1, tray: [],
        marble: {
          x: lv.marble[0] * CELL + CELL / 2,
          y: lv.marble[1] * CELL + CELL / 2 + 4,
          vx: 0, vy: 0
        },
        placed: placed,
        collected: lv.stars.map(function () { return false; }),
        sbMarble: null, sbBucket: null, sbStars: [], sbPieces: new Map()
      };
      verifying = true;
      var maxFrames = 900;
      var f;
      for (f = 0; f < maxFrames; f++) {
        for (var s = 0; s < SUB; s++) physStep();
        if (state.phase !== 'run') break;
      }
      var sc = state.collected.filter(Boolean).length;
      var mx = state.marble ? Math.round(state.marble.x) : -1;
      var my = state.marble ? Math.round(state.marble.y) : -1;
      results.push({
        level: i + 1, name: lv.name,
        result: state.phase === 'win' ? 'PASS' : 'FAIL',
        stars: sc + '/' + lv.stars.length,
        frames: f, endX: mx, endY: my
      });
    });
    state = origState;
    verifying = false;
    console.table(results);
    return results;
  }

  MR.boot = boot;
  MR._verify = verify;
})();
