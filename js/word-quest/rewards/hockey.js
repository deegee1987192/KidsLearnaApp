// Hockey reward game. Top-down rink: the goalie slides back and forth across
// the goal mouth. Tap (or swipe) where you want to shoot; the goalie keeps
// moving while the puck travels, so pick the open side. Score 3 of 5.
// Faster / wider goalie on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.hockey.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 400;
  const GOAL_Y = 70, MOUTH_L = 90, MOUTH_R = 250;   // goal-mouth x range
  const PUCK_R = 9;
  const TIER = {
    easy:   { half: 22, speed: 90  },
    medium: { half: 28, speed: 140 },
    hard:   { half: 33, speed: 200 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = 3, shots = 5;
    let made = 0, taken = 0;
    let phase = 'aim';                 // aim | shoot | result | done
    let goalieX = (MOUTH_L + MOUTH_R) / 2, dir = 1;
    let puckX = W / 2, puckY = 350, targetX = W / 2, scored = false;
    let msg = 'Tap the open side to shoot! 🏒';
    let phaseStart = performance.now();
    let lastNow = performance.now();

    api.progress(made, need);

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    cv.addEventListener('pointerup', e => {
      e.preventDefault();
      if(phase !== 'aim') return;
      const p = toLocal(e);
      targetX = Math.max(MOUTH_L + PUCK_R, Math.min(MOUTH_R - PUCK_R, p.x));
      phase = 'shoot'; phaseStart = performance.now(); scored = false;
      if(audio) audio.playTone(200, 0.1, 'square', 0.14);
    });

    function resolve(){
      taken++;
      scored = Math.abs(puckX - goalieX) > cfg.half + PUCK_R;
      if(scored){ made++; msg = 'GOAL! 🚨'; if(audio) audio.playChime(); }
      else { msg = 'Blocked! 🥅'; if(audio) audio.playTone(150, 0.2, 'sine', 0.15); }
      api.progress(made, need);
      phase = 'result'; phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need) return finish(true);
      if(!canWin || taken >= shots) return finish(made >= need);
      puckX = W / 2; puckY = 350;
      msg = `Shoot the open side!  (${taken + 1} of ${shots})`;
      phase = 'aim';
    }

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; phase = 'done';
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(phase === 'done'){ draw(); return; }
      const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
      // goalie patrols in aim + shoot phases
      if(phase === 'aim' || phase === 'shoot'){
        goalieX += dir * cfg.speed * dt;
        if(goalieX > MOUTH_R - cfg.half){ goalieX = MOUTH_R - cfg.half; dir = -1; }
        if(goalieX < MOUTH_L + cfg.half){ goalieX = MOUTH_L + cfg.half; dir = 1; }
      }
      if(phase === 'shoot'){
        const t = (now - phaseStart) / 1000;
        const p = Math.min(1, t / 0.45);
        puckX = W / 2 + (targetX - W / 2) * p;
        puckY = 350 + (GOAL_Y + 6 - 350) * p;
        if(p >= 1) resolve();
      } else if(phase === 'result'){
        if((now - phaseStart) / 1000 > 1.0) afterResult();
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      // ice
      ctx.fillStyle = '#EAF6FF'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#B3D9F2'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 240); ctx.lineTo(W, 240); ctx.stroke(); // blue line
      ctx.strokeStyle = '#EF9A9A';
      ctx.beginPath(); ctx.moveTo(0, GOAL_Y); ctx.lineTo(W, GOAL_Y); ctx.stroke(); // goal line
      // goal frame
      ctx.strokeStyle = '#C62828'; ctx.lineWidth = 5;
      ctx.strokeRect(MOUTH_L, GOAL_Y - 34, MOUTH_R - MOUTH_L, 34);
      ctx.fillStyle = 'rgba(198,40,40,0.08)'; ctx.fillRect(MOUTH_L, GOAL_Y - 34, MOUTH_R - MOUTH_L, 34);
      // goalie
      ctx.fillStyle = '#1565C0';
      ctx.fillRect(goalieX - cfg.half, GOAL_Y - 8, cfg.half * 2, 20);
      ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧤', goalieX, GOAL_Y + 2);
      // shooter + puck
      ctx.font = '28px serif'; ctx.fillText('🏒', W / 2 + 20, 366);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(puckX, puckY, PUCK_R, 0, Math.PI * 2); ctx.fill();
      // message
      ctx.fillStyle = '#0D47A1'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 22);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('hockey', { name: 'Hockey', emoji: '🏒', goal: 'Score 3 of 5!', play });
})();
