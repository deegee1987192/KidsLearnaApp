// Tennis reward game. The opponent stands in one of three far-court zones.
// Swipe (or tap) to hit into an OPEN zone. On harder tiers the opponent may
// lunge to cover your shot. Win 3 of 5 rallies.
//
// Registers as KL.wordQuest.rewards.games.tennis.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 400;
  const ZONE_X = [85, 170, 255];      // centers of far-court zones (left,mid,right)
  const FAR_Y = 96, NEAR_Y = 340;
  const COVER_PROB = { easy: 0.0, medium: 0.28, hard: 0.5 };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cover = COVER_PROB[tier] != null ? COVER_PROB[tier] : 0;

    const need = 3, shots = 5;
    let made = 0, taken = 0;
    let phase = 'aim';                  // aim | rally | result | done
    let opoZone = 1, finalOpo = 1, target = 1, won = false;
    let ballX = ZONE_X[1], ballY = NEAR_Y;
    let msg = 'Swipe to the open court! 🎾';
    let phaseStart = performance.now();

    function newPoint(){ opoZone = Math.floor(Math.random() * 3); }
    newPoint();
    api.progress(made, need);

    let down = null;
    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    cv.addEventListener('pointerdown', e => { if(phase === 'aim') down = toLocal(e); });
    cv.addEventListener('pointerup', e => {
      if(phase !== 'aim' || !down) return;
      const up = toLocal(e); const dx = up.x - down.x;
      if(Math.abs(dx) < 18) target = up.x < W / 3 ? 0 : up.x > 2 * W / 3 ? 2 : 1;
      else target = dx < 0 ? 0 : 2;
      down = null;
      // opponent may lunge to cover the shot
      finalOpo = (Math.random() < cover) ? target : opoZone;
      won = (target !== finalOpo);
      phase = 'rally'; phaseStart = performance.now();
      if(audio) audio.playTone(300, 0.1, 'triangle', 0.14);
    });

    function resolve(){
      taken++;
      if(won){ made++; msg = 'Winner! 🎉'; if(audio) audio.playChime(); }
      else { msg = 'Returned! 🎾'; if(audio) audio.playTone(150, 0.2, 'sine', 0.15); }
      api.progress(made, need);
      phase = 'result'; phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need) return finish(true);
      if(!canWin || taken >= shots) return finish(made >= need);
      newPoint(); ballX = ZONE_X[1]; ballY = NEAR_Y;
      msg = `Find the gap!  (${taken + 1} of ${shots})`;
      phase = 'aim';
    }

    let finished = false;
    function finish(w){
      if(finished) return;
      finished = true; phase = 'done';
      setTimeout(() => api.finish(w), 500);
    }

    function frame(now){
      if(phase === 'done'){ draw(); return; }
      const t = (now - phaseStart) / 1000;
      if(phase === 'rally'){
        const p = Math.min(1, t / 0.5);
        ballX = ZONE_X[1] + (ZONE_X[target] - ZONE_X[1]) * p;
        ballY = NEAR_Y + (FAR_Y - NEAR_Y) * p;
        if(p >= 1) resolve();
      } else if(phase === 'result'){
        if(t > 1.0) afterResult();
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      // court
      ctx.fillStyle = '#2E7D32'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1B5E20'; ctx.fillRect(30, 40, W - 60, H - 80);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.strokeRect(30, 40, W - 60, H - 80);
      // net
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(24, 210); ctx.lineTo(W - 24, 210); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      for(let x = 34; x < W - 30; x += 12){ ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 210); ctx.stroke(); }
      // zone hints (far court)
      const showOpo = (phase === 'aim') ? opoZone : finalOpo;
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧍', ZONE_X[showOpo], FAR_Y);
      // player
      ctx.fillText('🎾', ballX, ballY);
      ctx.font = '28px serif'; ctx.fillText('🧑', W / 2, NEAR_Y + 26);
      // message
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 22);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('tennis', { name: 'Tennis', emoji: '🎾', goal: 'Win 3 of 5!', play });
})();
