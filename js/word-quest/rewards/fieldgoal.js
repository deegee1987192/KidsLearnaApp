// Field-goal reward game. Wind pushes the ball sideways; nudge your aim with
// ◀ / ▶ to compensate, then tap KICK. Make 3 of 5 to win.
// Stronger wind + narrower uprights on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.fieldgoal.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 400;
  const CX = W / 2, POST_Y = 92;
  const TIER = {
    easy:   { gap: 58, wind: 34 },
    medium: { gap: 46, wind: 52 },
    hard:   { gap: 38, wind: 74 },
  };
  // on-canvas buttons
  const BTN = {
    left:  { x: 40,  y: 340, w: 70, h: 44, label: '◀ Aim' },
    kick:  { x: 128, y: 340, w: 84, h: 44, label: 'KICK' },
    right: { x: 230, y: 340, w: 70, h: 44, label: 'Aim ▶' },
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
    let phase = 'aim';                    // aim | kick | result | done
    let aim = 0, wind = 0, made_ = false;
    let ballX = CX, ballY = 320, finalX = CX;
    let msg = 'Aim into the wind, then KICK! 🏈';
    let phaseStart = performance.now();

    function newWind(){ wind = (Math.random() * 2 - 1) * cfg.wind; }
    newWind();
    api.progress(made, need);

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    function inBtn(p, b){ return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if(phase !== 'aim') return;
      const p = toLocal(e);
      if(inBtn(p, BTN.left))  aim -= 9;
      else if(inBtn(p, BTN.right)) aim += 9;
      else if(inBtn(p, BTN.kick)) kick();
    });

    function kick(){
      // ball lands at center + aim + wind; make if within the uprights gap
      finalX = CX + aim + wind;
      made_ = Math.abs(finalX - CX) < cfg.gap;
      phase = 'kick'; phaseStart = performance.now();
      if(audio) audio.playTone(240, 0.12, 'square', 0.14);
    }

    function resolve(){
      taken++;
      if(made_){ made++; msg = "It's GOOD! 🎉"; if(audio) audio.playChime(); }
      else { msg = 'No good! 🌬️'; if(audio) audio.playTone(150, 0.2, 'sine', 0.15); }
      api.progress(made, need);
      phase = 'result'; phaseStart = performance.now();
    }

    function afterResult(){
      const canWin = made + (shots - taken) >= need;
      if(made >= need) return finish(true);
      if(!canWin || taken >= shots) return finish(made >= need);
      aim = 0; newWind(); ballX = CX; ballY = 320;
      msg = `Beat the wind!  (${taken + 1} of ${shots})`;
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
      const t = (now - phaseStart) / 1000;
      if(phase === 'kick'){
        const p = Math.min(1, t / 0.6);
        ballX = CX + (finalX - CX) * p;
        ballY = 320 + (POST_Y - 320) * p;
        if(p >= 1) resolve();
      } else if(phase === 'result'){
        if(t > 1.0) afterResult();
      }
      draw();
      requestAnimationFrame(frame);
    }

    function rrect(b, fill){
      ctx.fillStyle = fill; ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }

    function draw(){
      ctx.fillStyle = '#7EC850'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for(let y = 130; y < 320; y += 34){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // uprights
      ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(CX - cfg.gap, POST_Y + 40); ctx.lineTo(CX - cfg.gap, POST_Y - 44);
      ctx.moveTo(CX + cfg.gap, POST_Y + 40); ctx.lineTo(CX + cfg.gap, POST_Y - 44);
      ctx.moveTo(CX - cfg.gap, POST_Y + 40); ctx.lineTo(CX + cfg.gap, POST_Y + 40);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX, POST_Y + 40); ctx.lineTo(CX, 300); ctx.lineWidth = 6; ctx.stroke();
      // wind indicator
      ctx.fillStyle = '#1A237E'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('WIND', CX, 116);
      const wl = wind / cfg.wind * 46;
      ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(CX, 132); ctx.lineTo(CX + wl, 132); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX + wl, 132);
      ctx.lineTo(CX + wl - Math.sign(wl || 1) * 8, 127); ctx.lineTo(CX + wl - Math.sign(wl || 1) * 8, 137);
      ctx.closePath(); ctx.fillStyle = '#D32F2F'; ctx.fill();
      // aim marker
      ctx.strokeStyle = 'rgba(26,35,126,0.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(CX + aim, 300); ctx.lineTo(CX + aim, POST_Y + 20); ctx.stroke();
      ctx.setLineDash([]);
      // ball
      ctx.font = '26px serif'; ctx.textBaseline = 'middle'; ctx.fillText('🏈', ballX, ballY);
      // buttons
      rrect(BTN.left, '#5E35B1'); rrect(BTN.kick, '#FF6B4A'); rrect(BTN.right, '#5E35B1');
      // message
      ctx.fillStyle = '#1B5E20'; ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 24);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('fieldgoal', { name: 'Field Goal', emoji: '🏈', goal: 'Make 3 of 5!', play });
})();
