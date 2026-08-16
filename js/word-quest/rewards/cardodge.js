// Car Dodge reward game. Tap the left/right side of the road to switch lanes.
// Collect the stars, avoid the cones — one crash ends the run. Collect enough
// to win. Faster road + more cones on harder tiers.
//
// Registers as KL.wordQuest.rewards.games.cardodge.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const LANES = [W * 0.25, W * 0.5, W * 0.75];
  const CAR_Y = H - 66;
  const TIER = {
    easy:   { need: 5, speed: 150, spawn: 720, obsChance: 0.40 },
    medium: { need: 7, speed: 205, spawn: 600, obsChance: 0.48 },
    hard:   { need: 9, speed: 270, spawn: 500, obsChance: 0.55 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = cfg.need;
    let lane = 1, collected = 0, items = [], last = performance.now();
    let spawnT = 0, roadScroll = 0, done = false, msg = 'Tap left/right to dodge!';
    api.progress(0, need);

    function toLocal(e){
      const r = cv.getBoundingClientRect();
      return (e.clientX - r.left) * (W / r.width);
    }
    cv.addEventListener('pointerdown', e => {
      if(done) return;
      const x = toLocal(e);
      if(x < W / 2) lane = Math.max(0, lane - 1);
      else lane = Math.min(2, lane + 1);
    });
    document.addEventListener('keydown', keyMove);
    function keyMove(e){
      if(done) return;
      if(e.key === 'ArrowLeft') lane = Math.max(0, lane - 1);
      if(e.key === 'ArrowRight') lane = Math.min(2, lane + 1);
    }

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; done = true;
      document.removeEventListener('keydown', keyMove);
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(done){ draw(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      roadScroll = (roadScroll + cfg.speed * dt) % 60;
      spawnT += dt * 1000;
      if(spawnT >= cfg.spawn){
        spawnT = 0;
        items.push({ lane: Math.floor(Math.random() * 3), y: -30,
          obstacle: Math.random() < cfg.obsChance });
      }
      items.forEach(it => it.y += cfg.speed * dt);
      for(let i = items.length - 1; i >= 0; i--){
        const it = items[i];
        if(it.y >= CAR_Y - 24 && it.y <= CAR_Y + 24 && it.lane === lane){
          if(it.obstacle){ msg = 'Crash! 💥'; if(audio) audio.playTone(120, 0.3, 'sawtooth', 0.2); return finish(collected >= need); }
          items.splice(i, 1); collected++; api.progress(collected, need);
          if(audio) audio.playTone(560, 0.1, 'triangle', 0.2);
          if(collected >= need) return finish(true);
        } else if(it.y > H + 30){ items.splice(i, 1); }
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      ctx.fillStyle = '#455A64'; ctx.fillRect(0, 0, W, H);
      // grass edges
      ctx.fillStyle = '#66BB6A'; ctx.fillRect(0, 0, 26, H); ctx.fillRect(W - 26, 0, 26, H);
      // lane dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([26, 20]);
      for(let l = 1; l < 3; l++){
        const x = (LANES[l] + LANES[l - 1]) / 2;
        ctx.beginPath(); ctx.moveTo(x, -roadScroll); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      // items
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      items.forEach(it => ctx.fillText(it.obstacle ? '🚧' : '⭐', LANES[it.lane], it.y));
      // car
      ctx.font = '38px serif'; ctx.fillText('🚗', LANES[lane], CAR_Y);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(msg, W / 2, 24);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('cardodge', { name: 'Car Dodge', emoji: '🚗', goal: 'Collect the stars!', play });
})();
