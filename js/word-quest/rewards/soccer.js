// Soccer reward game. Swipe left / right / up to shoot; the goalie dives.
// Score 3 of 5 to win. Harder tiers = smarter goalie.
//
// Registers as KL.wordQuest.rewards.games.soccer.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 380;
  const DIRS = ['left', 'center', 'right'];
  // Where the goalie / ball end up for each direction.
  const GOALIE_X = { left: 95, center: 170, right: 245 };
  const BALL_TGT = { left: 88,  center: 170, right: 252 };
  const BALL_Y   = 118;
  const SAVE_PROB = { easy: 0.15, medium: 0.35, hard: 0.55 };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');

    const need = 3, shots = 5;
    let made = 0, taken = 0;
    let phase = 'aim';            // aim | kick | result | done
    let shotDir = null, goalieDir = null, saved = false;
    let ballX = 170, ballY = 340, goalieX = 170, goalieY = 150;
    let phaseStart = performance.now();
    let msg = 'Swipe to shoot! 👟';

    api.progress(made, need);

    // ── input ──────────────────────────────────────────────
    let down = null;
    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width),
               y: (e.clientY - r.top)  * (H / r.height) };
    }
    cv.addEventListener('pointerdown', e => {
      if(phase !== 'aim') return;
      down = toLocal(e);
    });
    cv.addEventListener('pointerup', e => {
      if(phase !== 'aim' || !down) return;
      const up = toLocal(e);
      const dx = up.x - down.x, dy = up.y - down.y;
      let dir;
      if(Math.abs(dx) < 20 && Math.abs(dy) < 20){
        dir = up.x < W/3 ? 'left' : up.x > 2*W/3 ? 'right' : 'center';
      } else if(Math.abs(dx) > Math.abs(dy)){
        dir = dx < 0 ? 'left' : 'right';
      } else {
        dir = 'center';
      }
      down = null;
      kick(dir);
    });

    function kick(dir){
      shotDir = dir;
      // goalie decision
      if(Math.random() < SAVE_PROB[tier]){
        goalieDir = dir;                      // read the shot → save
      } else {
        const others = DIRS.filter(d => d !== dir);
        goalieDir = others[Math.floor(Math.random() * others.length)];
      }
      saved = (goalieDir === dir);
      phase = 'kick';
      phaseStart = performance.now();
      if(audio) audio.playTone(180, 0.12, 'square', 0.14);
    }

    function resolveShot(){
      taken++;
      if(!saved){ made++; msg = 'GOAL! ⚽'; if(audio) audio.playChime(); }
      else { msg = 'Saved! 🧤'; if(audio) audio.playTone(160, 0.2, 'sine', 0.16); }
      api.progress(made, need);
      phase = 'result';
      phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need){ finish(true); }
      else if(!canWin || taken >= shots){ finish(made >= need); }
      else {
        // reset for next shot
        shotDir = goalieDir = null;
        ballX = 170; ballY = 340; goalieX = 170; goalieY = 150;
        msg = `Swipe to shoot!  (${taken + 1} of ${shots})`;
        phase = 'aim';
      }
    }

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true;
      phase = 'done';
      setTimeout(() => api.finish(won), 500);
    }

    // ── update + draw loop ─────────────────────────────────
    function frame(now){
      if(phase === 'done'){ draw(1); return; }
      const t = (now - phaseStart) / 1000;

      if(phase === 'kick'){
        const p = Math.min(1, t / 0.5);
        ballX = 170 + (BALL_TGT[shotDir] - 170) * p;
        ballY = 340 + (BALL_Y - 340) * p;
        const gp = Math.max(0, Math.min(1, (t - 0.12) / 0.35));
        goalieX = 170 + (GOALIE_X[goalieDir] - 170) * gp;
        goalieY = 150 + 18 * Math.sin(gp * Math.PI);
        if(p >= 1) resolveShot();
      } else if(phase === 'result'){
        if(t > 1.0) afterResult();
      }
      draw(t);
      requestAnimationFrame(frame);
    }

    function draw(){
      // field
      ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#43A047';
      for(let i = 0; i < H; i += 40) ctx.fillRect(0, i, W, 20);
      // goal frame
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.strokeRect(40, 60, 260, 130);
      // net
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      for(let x = 52; x < 300; x += 16){ ctx.beginPath(); ctx.moveTo(x, 62); ctx.lineTo(x, 188); ctx.stroke(); }
      for(let y = 72; y < 190; y += 16){ ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(298, y); ctx.stroke(); }
      // goalie
      ctx.font = '46px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧤', goalieX, goalieY);
      // ball
      ctx.font = '30px serif';
      ctx.fillText('⚽', ballX, ballY);
      // message
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(msg, W/2, 30);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('soccer', { name: 'Soccer', emoji: '⚽', goal: 'Score 3 of 5!', play });
})();
