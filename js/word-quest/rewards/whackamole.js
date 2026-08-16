// Whack-a-Mole reward game. Moles pop from holes — tap them before they duck
// back down. Whack enough before the timer runs out. Quicker moles on hard.
//
// Registers as KL.wordQuest.rewards.games.whackamole.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const COLS = 3, ROWS = 3, R = 34;
  const TIER = {
    easy:   { need: 6,  up: 1100, gap: 650, time: 26 },
    medium: { need: 9,  up: 850,  gap: 520, time: 25 },
    hard:   { need: 12, up: 640,  gap: 420, time: 24 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    // hole positions
    const holes = [];
    const mx = W / (COLS + 1), my0 = 90, myGap = (H - 140) / (ROWS - 1);
    for(let r = 0; r < ROWS; r++)
      for(let c = 0; c < COLS; c++)
        holes.push({ x: mx * (c + 1), y: my0 + r * myGap });

    const need = cfg.need;
    let whacked = 0, active = -1, phase = 'gap', phaseEnd = 0;
    let timeLeft = cfg.time, last = performance.now(), done = false;
    let bonk = -1, bonkT = 0;
    api.progress(0, need);

    function schedule(now){
      if(phase === 'gap'){ active = -1; phaseEnd = now + cfg.gap; }
      else { active = Math.floor(Math.random() * holes.length); phaseEnd = now + cfg.up; }
    }
    schedule(performance.now()); phase = 'gap';

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    }
    cv.addEventListener('pointerdown', e => {
      if(done || phase !== 'up' || active < 0) return;
      const p = toLocal(e), h = holes[active];
      if(Math.hypot(p.x - h.x, p.y - h.y) < R + 8){
        whacked++; api.progress(whacked, need);
        bonk = active; bonkT = performance.now();
        if(audio) audio.playTone(300, 0.12, 'square', 0.2);
        phase = 'gap'; schedule(performance.now());
        if(whacked >= need) finish(true);
      }
    });

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; done = true;
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(done){ draw(now); return; }
      timeLeft -= Math.min(0.05, (now - last) / 1000); last = now;
      if(now >= phaseEnd){ phase = phase === 'gap' ? 'up' : 'gap'; schedule(now); }
      if(timeLeft <= 0) finish(whacked >= need);
      draw(now);
      requestAnimationFrame(frame);
    }

    function draw(now){
      ctx.fillStyle = '#8BC34A'; ctx.fillRect(0, 0, W, H);
      holes.forEach((h, i) => {
        ctx.fillStyle = '#5D4037';
        ctx.beginPath(); ctx.ellipse(h.x, h.y + R, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3E2723';
        ctx.beginPath(); ctx.ellipse(h.x, h.y + R, R - 6, R * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        const isUp = (phase === 'up' && active === i);
        const justBonked = (bonk === i && now - bonkT < 250);
        if(isUp || justBonked){
          ctx.font = '40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(justBonked ? '💥' : '🐹', h.x, h.y + 4);
        }
      });
      ctx.fillStyle = '#33691E'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`Whack the moles!  ⏱ ${Math.ceil(Math.max(0, timeLeft))}s`, W / 2, 40);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('whackamole', { name: 'Whack-a-Mole', emoji: '🔨', goal: 'Whack the moles!', play });
})();
