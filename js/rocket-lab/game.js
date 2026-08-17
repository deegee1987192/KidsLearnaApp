(function(){
'use strict';
var NS = window.KL.rocketLab;
var clamp = KL.util.clamp;

/* ─── Constants ───────────────────────────────── */
var LW = 360, LH = 520;
var FRAME = 33;
var G = 0.03;
var BASE_THRUST = 0.095;
var STEER = 0.003;
var MAX_STEER = 0.07;
var MAX_VX = 2.5;
var MAX_VY = 3.5;
var TERM_VY = 2.2;
var FRIC = 0.985;
var BURN = 0.1;
var STAR_R = 22;

/* ─── DOM refs ────────────────────────────────── */
var cvs, ctx, gameScreen, buildPanel, hud, fuelFill, altLabel, windLabel;
var resultPanel, resultTitle, resultStars, resultBtn;
var endScreen, endStarsEl, endBtn;
var dotsEl, lvLabel;

/* ─── State ───────────────────────────────────── */
var phase, lvIdx, level, levelStars;
var parts, pickQueue, pickIdx;
var rx, ry, vx, vy;
var fuel, maxFuel, camY;
var touching, touchX;
var targetAlt, reachedTarget;
var skyStarWX, skyStarWY, skyStarGot;
var padCX, padW;
var particles, timer, frame;
var thrustPow, dragM, burnRate, stab, massM;
var clouds, totalStarsAll;

/* ─── Init ────────────────────────────────────── */
function init() {
  cvs = document.getElementById('rlCanvas');
  ctx = cvs.getContext('2d');
  gameScreen = document.getElementById('gameScreen');
  buildPanel = document.getElementById('buildPanel');
  hud = document.getElementById('hud');
  fuelFill = document.getElementById('fuelFill');
  altLabel = document.getElementById('altLabel');
  windLabel = document.getElementById('windLabel');
  resultPanel = document.getElementById('resultPanel');
  resultTitle = document.getElementById('resultTitle');
  resultStars = document.getElementById('resultStars');
  resultBtn = document.getElementById('resultBtn');
  endScreen = document.getElementById('endScreen');
  endStarsEl = document.getElementById('endStars');
  endBtn = document.getElementById('endBtn');
  dotsEl = document.getElementById('dots');
  lvLabel = document.getElementById('lvLabel');

  cvs.width = LW;
  cvs.height = LH;

  cvs.addEventListener('pointerdown', onDown);
  cvs.addEventListener('pointermove', onMove);
  cvs.addEventListener('pointerup', onUp);
  cvs.addEventListener('pointercancel', onUp);

  clouds = [];
  for (var i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * 500 - 50,
      y: 80 + Math.random() * 600,
      w: 40 + Math.random() * 80,
      speed: 0.1 + Math.random() * 0.3
    });
  }

  endBtn.onclick = function() {
    NS.buildLevels();
    totalStarsAll = 0;
    loadLevel(0);
  };

  totalStarsAll = 0;
  KL.wiz.mount(document.getElementById('wizHost'), "Let's build a rocket! 🚀");
  loadLevel(0);
}

/* ─── Level Management ────────────────────────── */
function loadLevel(idx) {
  clearTimeout(timer);
  lvIdx = idx;
  level = NS.LEVELS[idx];
  levelStars = [false, false, false];
  parts = {};
  var pf = level.prefill || {};
  for (var k in pf) parts[k] = pf[k];
  pickQueue = (level.pickSlots || []).slice();
  pickIdx = 0;
  camY = 0;
  particles = [];

  KL.scene.setScene(level.scene);
  renderDots();
  lvLabel.textContent = 'Level ' + level.num + ': ' + level.name;

  buildPanel.style.display = '';
  hud.style.display = 'none';
  resultPanel.style.display = 'none';
  endScreen.style.display = 'none';
  cvs.style.display = 'block';

  if (pickQueue.length > 0) {
    phase = 'pick';
    renderPickStep();
  } else {
    phase = 'ready';
    showReady();
  }
  drawPreview();
  setTimeout(function(){ KL.wiz.say(level.hint, 'idle'); }, 300);
}

function renderDots() {
  var h = '';
  for (var i = 0; i < 15; i++) {
    var cls = 'level-dot';
    if (i < lvIdx) cls += ' done';
    if (i === lvIdx) cls += ' current';
    h += '<div class="' + cls + '"></div>';
  }
  dotsEl.innerHTML = h;
}

/* ─── Build Phase ─────────────────────────────── */
function renderPickStep() {
  var slot = pickQueue[pickIdx];
  var opts = NS.PARTS[slot];
  var labels = { nose:'Nose Cone', body:'Body', fins:'Fins', engine:'Engine' };
  var h = '<div class="rl-pick-title">Pick your ' + labels[slot] + '!</div>';
  h += '<div class="rl-parts-row">';
  for (var i = 0; i < opts.length; i++) {
    var o = opts[i];
    h += '<button class="rl-part-btn" data-slot="' + slot + '" data-id="' + o.id + '">';
    h += '<div class="rl-part-icon">' + partEmoji(slot, o.id) + '</div>';
    h += '<div class="rl-part-name">' + o.name + '</div>';
    h += '<div class="rl-part-desc">' + o.desc + '</div>';
    h += '</button>';
  }
  h += '</div>';
  buildPanel.innerHTML = h;

  var btns = buildPanel.querySelectorAll('.rl-part-btn');
  for (var j = 0; j < btns.length; j++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        if (phase !== 'pick') return;
        pickPart(btn.getAttribute('data-slot'), btn.getAttribute('data-id'));
      });
    })(btns[j]);
  }
}

function partEmoji(slot, id) {
  var m = {
    'nose-pointy':'△','nose-round':'◗','nose-flat':'▬',
    'body-small':'▯','body-medium':'▮','body-big':'█',
    'fins-wide':'⟨⟩','fins-normal':'◇','fins-small':'·',
    'engine-gentle':'🔥','engine-standard':'🔥🔥','engine-powerful':'🔥🔥🔥'
  };
  return m[slot+'-'+id] || '?';
}

function pickPart(slot, id) {
  if (phase !== 'pick') return;
  if (slot !== pickQueue[pickIdx]) return;
  parts[slot] = id;
  KL.audio.playTone(440 + pickIdx * 80, 0.15, 'triangle', 0.2);
  pickIdx++;
  drawPreview();
  if (pickIdx >= pickQueue.length) {
    phase = 'ready';
    showReady();
  } else {
    renderPickStep();
  }
}

function showReady() {
  var h = '<div class="rl-pick-title">Ready to fly!</div>';
  h += '<button class="rl-launch-btn" id="launchGo">🚀 LAUNCH!</button>';
  buildPanel.innerHTML = h;
  document.getElementById('launchGo').onclick = function() {
    if (phase !== 'ready') return;
    startFlight();
  };
  drawPreview();
}

/* ─── Preview Drawing ─────────────────────────── */
function drawPreview() {
  ctx.clearRect(0, 0, LW, LH);
  var grad = ctx.createLinearGradient(0, 0, 0, LH);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#E0F7FA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LW, LH);
  ctx.fillStyle = '#7CB342';
  ctx.fillRect(0, LH - 60, LW, 60);
  ctx.fillStyle = '#558B2F';
  for (var i = 0; i < LW; i += 10) {
    ctx.fillRect(i, LH - 60, 2, -(3 + (i * 7 % 5)));
  }
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(LW / 2 - 30, LH - 60, 60, 5);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(LW / 2 - 1, LH - 60, 2, 5);
  var dims = getRocketDims();
  drawRocket(LW / 2, LH - 60 - dims.totalH / 2, false);
}

/* ─── Rocket Dimensions ──────────────────────── */
function getRocketDims() {
  var bw = 26, bh = 26, nh = 14;
  var bid = parts.body || 'medium';
  if (bid === 'small') { bw = 20; bh = 20; nh = 12; }
  else if (bid === 'big') { bw = 32; bh = 32; nh = 16; }
  return { bw:bw, bh:bh, nh:nh, eh:8, totalH:nh + bh + 8 };
}

function findPart(slot, id) {
  var arr = NS.PARTS[slot];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === id) return arr[i];
  }
  return arr[1];
}

function computeStats() {
  var nose = findPart('nose', parts.nose || 'round');
  var body = findPart('body', parts.body || 'medium');
  var fins = findPart('fins', parts.fins || 'normal');
  var eng  = findPart('engine', parts.engine || 'standard');
  thrustPow = BASE_THRUST * eng.thrustMod;
  dragM     = nose.dragMod * (fins.dragMod || 1);
  burnRate  = BURN * eng.burnMod;
  stab      = (level.autoStabilize || 0) * (fins.stabilityMod || 1);
  massM     = body.massMod;
  maxFuel   = 100 * (level.fuel || 1) * body.fuelMod;
  fuel      = maxFuel;
}

/* ─── Flight ──────────────────────────────────── */
function startFlight() {
  computeStats();
  phase = 'fly';
  var dims = getRocketDims();
  rx = LW / 2;
  ry = dims.totalH / 2 + 2;
  vx = 0;
  vy = 1.5;
  camY = 0;
  frame = 0;
  reachedTarget = false;
  skyStarGot = false;
  touching = false;
  particles = [];

  targetAlt = level.altitude;
  padW = level.padWidth;
  padCX = LW * level.padX;

  if (level.collectStar) {
    skyStarWX = LW * level.collectStar.x;
    skyStarWY = targetAlt * level.collectStar.y;
  } else {
    skyStarWX = -999;
    skyStarWY = -999;
  }

  buildPanel.style.display = 'none';
  hud.style.display = '';

  KL.audio.playTone(330, 0.12, 'triangle', 0.2);
  setTimeout(function(){ KL.audio.playTone(440, 0.12, 'triangle', 0.2); }, 80);
  setTimeout(function(){ KL.audio.playTone(550, 0.18, 'triangle', 0.25); }, 160);

  tick();
}

function tick() {
  if (phase !== 'fly') return;
  update();
  draw();
  timer = setTimeout(tick, FRAME);
}

function update() {
  frame++;
  var dims = getRocketDims();

  // Thrust + steer
  if (touching) {
    var dx = touchX - rx;
    var drift = clamp(dx * STEER, -MAX_STEER, MAX_STEER);
    if (fuel > 0) {
      vy += thrustPow / massM;
      fuel = Math.max(0, fuel - burnRate);
      vx += drift / (massM * dragM);
      if (frame % 2 === 0) spawnParticle();
    } else {
      vx += drift * 0.3 / (massM * dragM);
    }
  }

  // Gravity
  vy -= G * massM;

  // Air friction
  vx *= Math.pow(FRIC, dragM);

  // Auto-stabilize
  if (stab > 0) vx *= (1 - stab);

  // Wind
  if (level.wind) {
    vx += level.wind * Math.sin(frame * 0.04);
    if (level.gustChance && Math.random() < level.gustChance) {
      vx += (Math.random() - 0.5) * 0.25;
    }
  }

  // Clamp velocity
  vx = clamp(vx, -MAX_VX, MAX_VX);
  vy = clamp(vy, -TERM_VY, MAX_VY);

  // Move
  rx += vx;
  ry += vy;
  rx = clamp(rx, 20, LW - 20);

  // Target altitude
  if (!reachedTarget && ry >= targetAlt) {
    reachedTarget = true;
    KL.audio.playTone(880, 0.12, 'triangle', 0.18);
  }

  // Sky star
  if (!skyStarGot && level.collectStar) {
    var sdx = rx - skyStarWX, sdy = ry - skyStarWY;
    if (Math.sqrt(sdx * sdx + sdy * sdy) < STAR_R) {
      skyStarGot = true;
      KL.audio.playTone(660, 0.15, 'triangle', 0.22);
      setTimeout(function(){ KL.audio.playTone(880, 0.12, 'triangle', 0.18); }, 80);
    }
  }

  // Ground collision
  if (ry - dims.totalH / 2 <= 0 && vy < 0) {
    ry = dims.totalH / 2;
    var onPad = Math.abs(rx - padCX) <= padW / 2 + 5;
    if (onPad && Math.abs(vy) <= (level.safeLand || 1.6)) {
      landSuccess();
    } else {
      landCrash();
    }
    return;
  }

  updateParticles();

  // Camera
  var tgt = ry - LH * 0.45;
  camY += (tgt - camY) * 0.06;
  if (camY < 0) camY = 0;

  // HUD
  var pct = maxFuel > 0 ? (fuel / maxFuel) * 100 : 0;
  fuelFill.style.width = pct + '%';
  fuelFill.style.background = pct > 50 ? '#4CAF50' : pct > 20 ? '#FF9800' : '#F44336';
  altLabel.textContent = Math.round(ry) + 'm';
  altLabel.style.color = ry >= targetAlt ? '#A5D6A7' : '#FFF';

  if (level.wind) {
    var wd = Math.sin(frame * 0.04);
    windLabel.textContent = Math.abs(wd) > 0.2 ? (wd > 0 ? '→💨' : '💨←') : '';
    windLabel.style.display = '';
  } else {
    windLabel.style.display = 'none';
  }
}

/* ─── Particles ───────────────────────────────── */
function spawnParticle() {
  var dims = getRocketDims();
  particles.push({
    x: rx + (Math.random() - 0.5) * 8,
    y: ry - dims.totalH / 2 - 2,
    vx: vx * 0.2 + (Math.random() - 0.5) * 0.4,
    vy: -(0.5 + Math.random() * 1.2),
    life: 25 + Math.random() * 15,
    max: 25,
    r: 2 + Math.random() * 3
  });
}

function updateParticles() {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ─── Landing ─────────────────────────────────── */
function landSuccess() {
  phase = 'land';
  clearTimeout(timer);
  vx = 0; vy = 0;
  levelStars[0] = true;
  if (skyStarGot) levelStars[1] = true;
  if (fuel / maxFuel > 0.3) levelStars[2] = true;
  var earned = levelStars.filter(Boolean).length;
  totalStarsAll += earned;
  KL.audio.playChime();
  KL.confetti.launchConfetti();
  showResult(true, earned);
  var msg = earned === 3 ? 'Perfect landing! ⭐⭐⭐' :
            earned === 2 ? 'Great job! ⭐⭐' : 'You landed! ⭐';
  KL.wiz.say(msg, 'happy');
}

function landCrash() {
  phase = 'crash';
  clearTimeout(timer);
  KL.audio.playCrash();
  var onPad = Math.abs(rx - padCX) <= padW / 2 + 5;
  showResult(false, 0);
  KL.wiz.say(onPad ? 'Too fast! Try a softer landing!' : 'Missed the pad! Try again!', 'sad');
}

function showResult(success) {
  draw();
  hud.style.display = 'none';
  resultPanel.style.display = '';
  resultTitle.textContent = success ? '🎉 Landed!' : '💥 Oops!';

  var sh = '';
  if (success) {
    var labels = ['Safe Landing', 'Sky Star', 'Fuel Saver'];
    for (var i = 0; i < 3; i++) {
      if (i === 1 && !level.collectStar) continue;
      sh += '<div class="rl-star-row">';
      sh += '<span class="rl-star-icon">' + (levelStars[i] ? '⭐' : '☆') + '</span> ';
      sh += '<span class="rl-star-label">' + labels[i] + '</span>';
      sh += '</div>';
    }
  }
  resultStars.innerHTML = sh;

  if (success) {
    if (lvIdx < 14) {
      resultBtn.textContent = 'Next Level →';
      resultBtn.onclick = function(){ loadLevel(lvIdx + 1); };
    } else {
      resultBtn.textContent = 'Finish! 🏆';
      resultBtn.onclick = showEndScreen;
    }
  } else {
    resultBtn.textContent = '🔄 Try Again';
    resultBtn.onclick = function(){ loadLevel(lvIdx); };
  }
}

function showEndScreen() {
  resultPanel.style.display = 'none';
  cvs.style.display = 'none';
  buildPanel.style.display = 'none';
  endScreen.style.display = '';
  var maxS = 0;
  for (var i = 0; i < 15; i++) {
    maxS += NS.LEVELS[i].collectStar ? 3 : 2;
  }
  endStarsEl.textContent = '⭐ ' + totalStarsAll + ' / ' + maxS;
  KL.confetti.launchConfetti();
  KL.wiz.say("Mission complete! You're a rocket scientist! 🚀", 'happy');
}

/* ═══ Drawing ═══════════════════════════════════ */

function w2sy(wy) { return LH - (wy - camY); }

function draw() {
  ctx.clearRect(0, 0, LW, LH);
  drawSky();
  drawStarfield();
  drawClouds();
  drawGround();
  if (phase === 'fly') drawTargetLine();
  if (!skyStarGot && level.collectStar) drawCollectStar();
  drawParticlesGfx();

  var sy = w2sy(ry);
  if (phase === 'crash') {
    ctx.save();
    ctx.translate(rx, sy);
    ctx.rotate(0.4);
    ctx.translate(-rx, -sy);
    drawRocket(rx, sy, false);
    ctx.restore();
    ctx.fillStyle = 'rgba(180,180,180,0.6)';
    ctx.beginPath();
    ctx.arc(rx - 12, sy + 5, 8, 0, Math.PI * 2);
    ctx.arc(rx + 10, sy + 3, 6, 0, Math.PI * 2);
    ctx.arc(rx, sy + 10, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawRocket(rx, sy, phase === 'fly' && touching && fuel > 0);
  }
}

function drawSky() {
  var altFrac = clamp(camY / 500, 0, 1);
  var grad = ctx.createLinearGradient(0, 0, 0, LH);
  if (altFrac < 0.5) {
    var t = altFrac * 2;
    grad.addColorStop(0, lerpC('#87CEEB', '#3F51B5', t));
    grad.addColorStop(1, lerpC('#E0F7FA', '#87CEEB', t));
  } else {
    var t2 = (altFrac - 0.5) * 2;
    grad.addColorStop(0, lerpC('#3F51B5', '#0A0A2E', t2));
    grad.addColorStop(1, lerpC('#87CEEB', '#1A1A4E', t2));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LW, LH);
}

function lerpC(a, b, t) {
  var ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  var br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  var r = Math.round(ar + (br - ar) * t);
  var g = Math.round(ag + (bg - ag) * t);
  var bl = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function drawStarfield() {
  if (camY < 150) return;
  var alpha = clamp((camY - 150) / 350, 0, 0.8);
  ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
  for (var i = 0; i < 40; i++) {
    var sx = (i * 137 + 31) % LW;
    var sy = (i * 211 + 97) % LH;
    ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 2));
  }
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cy = w2sy(c.y);
    if (cy < -80 || cy > LH + 80) continue;
    c.x += c.speed;
    if (c.x > LW + 100) c.x = -c.w - 50;
    cloudShape(c.x, cy, c.w);
  }
}

function cloudShape(cx, cy, w) {
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.25, cy - w * 0.12, w * 0.35, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.55, cy, w * 0.25, 0, Math.PI * 2);
  ctx.arc(cx - w * 0.15, cy - w * 0.06, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  var gy = w2sy(0);
  if (gy > LH + 100) return;
  ctx.fillStyle = '#7CB342';
  ctx.fillRect(0, gy, LW, LH - gy + 200);
  ctx.fillStyle = '#558B2F';
  for (var i = 0; i < LW; i += 8) {
    ctx.fillRect(i, gy - 3 - (i * 7 % 5), 2, 3 + (i * 3 % 4));
  }
  var pl = padCX - padW / 2;
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(pl, gy - 5, padW, 8);
  ctx.fillStyle = '#EEE';
  ctx.fillRect(padCX - 2, gy - 5, 4, 8);
  ctx.fillRect(pl + 4, gy - 5, 4, 8);
  ctx.fillRect(pl + padW - 8, gy - 5, 4, 8);
  ctx.fillStyle = '#F44336';
  ctx.beginPath();
  ctx.moveTo(padCX, gy - 12);
  ctx.lineTo(padCX - 6, gy - 18);
  ctx.lineTo(padCX + 6, gy - 18);
  ctx.fill();
}

function drawTargetLine() {
  var ty = w2sy(targetAlt);
  if (ty < -10 || ty > LH + 10) return;
  ctx.strokeStyle = reachedTarget ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, ty);
  ctx.lineTo(LW, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '10px Nunito';
  ctx.fillStyle = reachedTarget ? 'rgba(76,175,80,0.6)' : 'rgba(255,255,255,0.4)';
  ctx.fillText(reachedTarget ? '✓ Target' : '↑ Target', 4, ty - 4);
}

function drawCollectStar() {
  var sx = skyStarWX, sy = w2sy(skyStarWY);
  if (sy < -30 || sy > LH + 30) return;
  var pulse = 1 + Math.sin((frame || 0) * 0.1) * 0.15;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(255,215,0,0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  starShape(0, 0, 10, 5, '#FFD700');
  ctx.restore();
}

function starShape(cx, cy, r, pts, fill) {
  ctx.beginPath();
  for (var i = 0; i < pts * 2; i++) {
    var rad = i % 2 === 0 ? r : r * 0.4;
    var ang = (i * Math.PI / pts) - Math.PI / 2;
    var x = cx + Math.cos(ang) * rad;
    var y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawParticlesGfx() {
  if (!particles || !particles.length) return;
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var sy = w2sy(p.y);
    var alpha = p.life / p.max;
    ctx.fillStyle = 'rgba(255,' + Math.round(140 + 100 * alpha) + ',0,' + (alpha * 0.7).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(p.x, sy, p.r * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ─── Rocket Drawing ──────────────────────────── */
function drawRocket(sx, sy, flame) {
  var dims = getRocketDims();
  var bw = dims.bw, bh = dims.bh, nh = dims.nh, eh = dims.eh;
  var totalH = dims.totalH;
  var top = sy - totalH / 2;
  var noseId = parts.nose || 'round';
  var finsId = parts.fins || 'normal';

  // Body
  ctx.fillStyle = '#E8EAF6';
  rRect(sx - bw / 2, top + nh, bw, bh, 3);
  // Stripe
  ctx.fillStyle = '#5C6BC0';
  ctx.fillRect(sx - bw / 2 + 2, top + nh + bh * 0.35, bw - 4, 3);
  // Window
  ctx.fillStyle = '#B3E5FC';
  ctx.beginPath();
  ctx.arc(sx, top + nh + bh * 0.22, Math.min(bw * 0.15, 5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(sx - 1, top + nh + bh * 0.19, Math.min(bw * 0.07, 2), 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = parts.nose ? '#F44336' : '#BDBDBD';
  ctx.beginPath();
  if (noseId === 'pointy') {
    ctx.moveTo(sx, top);
    ctx.lineTo(sx + bw / 2, top + nh);
    ctx.lineTo(sx - bw / 2, top + nh);
  } else if (noseId === 'round') {
    ctx.moveTo(sx - bw / 2, top + nh);
    ctx.quadraticCurveTo(sx - bw / 2, top + 2, sx, top);
    ctx.quadraticCurveTo(sx + bw / 2, top + 2, sx + bw / 2, top + nh);
  } else {
    ctx.moveTo(sx - bw / 2 - 2, top + 4);
    ctx.lineTo(sx + bw / 2 + 2, top + 4);
    ctx.lineTo(sx + bw / 2, top + nh);
    ctx.lineTo(sx - bw / 2, top + nh);
  }
  ctx.closePath();
  ctx.fill();

  // Fins
  var finBot = top + nh + bh;
  ctx.fillStyle = parts.fins ? '#FF9800' : '#BDBDBD';
  var fw = finsId === 'wide' ? 14 : finsId === 'small' ? 6 : 10;
  var fh = finsId === 'wide' ? 16 : finsId === 'small' ? 10 : 13;
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2, finBot - fh);
  ctx.lineTo(sx - bw / 2 - fw, finBot + 2);
  ctx.lineTo(sx - bw / 2, finBot);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + bw / 2, finBot - fh);
  ctx.lineTo(sx + bw / 2 + fw, finBot + 2);
  ctx.lineTo(sx + bw / 2, finBot);
  ctx.closePath();
  ctx.fill();

  // Engine nozzle
  ctx.fillStyle = parts.engine ? '#616161' : '#BDBDBD';
  ctx.fillRect(sx - 5, finBot, 10, eh);

  // Flame
  if (flame) {
    var engId = parts.engine || 'standard';
    var fH = (8 + Math.random() * 14);
    if (engId === 'powerful') fH *= 1.4;
    else if (engId === 'gentle') fH *= 0.7;
    var grd = ctx.createLinearGradient(sx, finBot + eh, sx, finBot + eh + fH);
    grd.addColorStop(0, '#FFF9C4');
    grd.addColorStop(0.3, '#FFD54F');
    grd.addColorStop(0.7, '#FF9800');
    grd.addColorStop(1, 'rgba(255,87,34,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(sx - 6, finBot + eh);
    ctx.quadraticCurveTo(sx - 1, finBot + eh + fH * 0.7, sx, finBot + eh + fH);
    ctx.quadraticCurveTo(sx + 1, finBot + eh + fH * 0.7, sx + 6, finBot + eh);
    ctx.closePath();
    ctx.fill();
  }
}

function rRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

/* ─── Input ───────────────────────────────────── */
function onDown(e) {
  if (phase !== 'fly') return;
  e.preventDefault();
  touching = true;
  touchX = getX(e);
}
function onMove(e) {
  if (!touching) return;
  e.preventDefault();
  touchX = getX(e);
}
function onUp() { touching = false; }

function getX(e) {
  var rect = cvs.getBoundingClientRect();
  return (e.clientX - rect.left) * (LW / rect.width);
}

NS.init = init;
})();
