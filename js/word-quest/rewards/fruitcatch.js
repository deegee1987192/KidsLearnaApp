// Fruit Catch reward game. Slide the basket to catch falling fruit. Catch
// enough before too many are dropped. Faster fruit + higher target on hard.
//
// Registers as KL.wordQuest.rewards.games.fruitcatch.

(function(){
  const rewards = window.KL.wordQuest.rewards;
  const audio = window.KL.audio;

  const W = 340, H = 420;
  const FRUIT = ['🍎','🍌','🍓','🍊','🍇','🍑','🍐','🥝'];
  const BASKET_Y = 372, BASKET_W = 66;
  const TIER = {
    easy:   { need: 6,  speed: 120, spawn: 780, misses: 6 },
    medium: { need: 8,  speed: 165, spawn: 640, misses: 5 },
    hard:   { need: 11, speed: 215, spawn: 520, misses: 4 },
  };

  function play(stage, tier, api){
    stage.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H; cv.className = 'wq-canvas';
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const cfg = TIER[tier] || TIER.easy;

    const need = cfg.need;
    let caught = 0, missed = 0, fruits = [], basketX = W / 2;
    let last = performance.now(), spawnT = 0, done = false;
    api.progress(0, need);

    function toLocalX(e){
      const r = cv.getBoundingClientRect();
      return (e.clientX - r.left) * (W / r.width);
    }
    function move(e){ if(!done){ basketX = Math.max(BASKET_W/2, Math.min(W - BASKET_W/2, toLocalX(e))); } }
    cv.addEventListener('pointerdown', move);
    cv.addEventListener('pointermove', e => { if(e.buttons || e.pointerType === 'touch') move(e); });

    let finished = false;
    function finish(won){
      if(finished) return;
      finished = true; done = true;
      setTimeout(() => api.finish(won), 500);
    }

    function frame(now){
      if(done){ draw(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      spawnT += dt * 1000;
      if(spawnT >= cfg.spawn){
        spawnT = 0;
        fruits.push({ x: 26 + Math.random() * (W - 52), y: -20,
          e: FRUIT[Math.floor(Math.random() * FRUIT.length)] });
      }
      fruits.forEach(f => f.y += cfg.speed * dt);
      for(let i = fruits.length - 1; i >= 0; i--){
        const f = fruits[i];
        if(f.y >= BASKET_Y - 12 && f.y <= BASKET_Y + 20 && Math.abs(f.x - basketX) < BASKET_W / 2 + 6){
          fruits.splice(i, 1); caught++; api.progress(caught, need);
          if(audio) audio.playTone(500 + Math.random() * 200, 0.1, 'triangle', 0.2);
          if(caught >= need) finish(true);
        } else if(f.y > H + 20){
          fruits.splice(i, 1); missed++;
          if(missed >= cfg.misses) finish(caught >= need);
        }
      }
      draw();
      requestAnimationFrame(frame);
    }

    function draw(){
      ctx.fillStyle = '#E1F5FE'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#C8E6C9'; ctx.fillRect(0, BASKET_Y + 22, W, H);
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fruits.forEach(f => ctx.fillText(f.e, f.x, f.y));
      // basket
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.moveTo(basketX - BASKET_W/2, BASKET_Y);
      ctx.lineTo(basketX + BASKET_W/2, BASKET_Y);
      ctx.lineTo(basketX + BASKET_W/2 - 8, BASKET_Y + 26);
      ctx.lineTo(basketX - BASKET_W/2 + 8, BASKET_Y + 26);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(basketX - BASKET_W/2, BASKET_Y); ctx.lineTo(basketX + BASKET_W/2, BASKET_Y); ctx.stroke();
      ctx.fillStyle = '#1B5E20'; ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`Catch the fruit!  ❌ ${missed}/${cfg.misses}`, W / 2, 22);
    }

    requestAnimationFrame(frame);
  }

  rewards.register('fruitcatch', { name: 'Fruit Catch', emoji: '🧺', goal: 'Catch the fruit!', play });
})();
